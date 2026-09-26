import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareD1Database } from "@/types/cloudflare";
import type { PassengerProfile } from "@/types/passenger";

export const READ_HEADERS = { "Cache-Control": "public, max-age=5, s-maxage=5, stale-while-revalidate=10" };
export const WRITE_HEADERS = { "Cache-Control": "no-store, max-age=0" };
const MAX_BODY_SIZE = 2_048;
const RATE_LIMIT_PURGE_INTERVAL_SECONDS = 15 * 60;
let nextReadTriggeredPurgeAt = 0;

export function acceptsJsonBody(request: Request) {
  return request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

export function unsupportedMediaTypeResponse() {
  return Response.json(
    { error: "Le corps de la requête doit être au format JSON." },
    { status: 415, headers: WRITE_HEADERS },
  );
}

export async function getPassengerDatabase(): Promise<CloudflareD1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB_BUS) throw new Error("The DB_BUS Cloudflare D1 binding is missing.");
  return env.DB_BUS;
}

export interface BusStatsRow {
  count: number;
  seat_capacity: number;
  profile_revision: number;
  vacant_start_index: number | null;
  vacant_end_index: number | null;
  vacant_before: number | null;
}

export async function readBusStats(database: CloudflareD1Database) {
  const rows = await database.prepare(
    `SELECT stats.passenger_count AS count,
            stats.seat_capacity,
            stats.profile_revision,
            vacant.start_index AS vacant_start_index,
            vacant.end_index AS vacant_end_index,
            COALESCE(SUM(vacant.end_index - vacant.start_index + 1) OVER (
              ORDER BY vacant.start_index
              ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ), 0) AS vacant_before
     FROM bus_stats AS stats
     LEFT JOIN bus_vacant_seat_ranges AS vacant
       ON vacant.start_index < stats.seat_capacity
     WHERE stats.id = 1
     ORDER BY vacant.start_index ASC`,
  ).all<BusStatsRow>();
  const row = rows.results[0];
  return {
    count: Number(row?.count ?? 0),
    seatCapacity: Number(row?.seat_capacity ?? 0),
    profileRevision: Number(row?.profile_revision ?? 0),
    vacantSeatRanges: rows.results.flatMap(({ vacant_start_index, vacant_end_index, vacant_before }) =>
      vacant_start_index === null || vacant_end_index === null
        ? []
        : [[Number(vacant_start_index), Number(vacant_end_index), Number(vacant_before ?? 0)] as [number, number, number]]),
  };
}

export interface PassengerRow { seat_index: number; display_name: string | null; comment: string | null }
export interface PassengerManifestRow { seat_index: number; display_name: string | null; has_comment: number }

export function toNamedPassengerProfile(row: PassengerRow, includeComment = false): PassengerProfile | null {
  if (!row.display_name && row.comment === null) return null;
  return {
    seatIndex: Number(row.seat_index),
    displayName: row.display_name || "Anonyme",
    comment: includeComment ? row.comment || null : null,
  };
}

export function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const normalizedLength = contentLengthHeader.trim();
    if (!/^\d+$/.test(normalizedLength)) throw new Error("INVALID_BODY");
    const contentLength = Number(normalizedLength);
    if (!Number.isSafeInteger(contentLength)) throw new Error("INVALID_BODY");
    if (contentLength > MAX_BODY_SIZE) throw new Error("BODY_TOO_LARGE");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_SIZE) {
      await reader.cancel().catch(() => undefined);
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const rawBody = new TextDecoder().decode(bytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error("INVALID_BODY");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_BODY");
  return parsed as Record<string, unknown>;
}

function validateRateLimitSecret(secret: string | undefined) {
  const normalized = secret?.trim() ?? "";
  if (normalized.length < 32) {
    throw new Error("The RATE_LIMIT_SECRET Cloudflare secret must contain at least 32 characters.");
  }
  return normalized;
}

export async function purgeExpiredRateLimits(
  database: CloudflareD1Database,
  now: number,
  force = false,
) {
  if (!force && now < nextReadTriggeredPurgeAt) return;
  if (!force) nextReadTriggeredPurgeAt = now + RATE_LIMIT_PURGE_INTERVAL_SECONDS;
  try {
    await database.prepare("DELETE FROM bus_rate_limits WHERE expires_at <= ?").bind(now).run();
  } catch (error) {
    if (!force) nextReadTriggeredPurgeAt = 0;
    throw error;
  }
}

async function hashRateKey(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function consumeRateLimit(
  database: CloudflareD1Database,
  request: Request,
  action: "join" | "profile" | "leave",
  maximum: number,
  windowSeconds: number,
  identity?: string,
) {
  const address = request.headers.get("cf-connecting-ip")?.trim();
  // Ce header est présent derrière Cloudflare. En local, son absence ne doit
  // pas placer tous les développeurs dans un quota global commun.
  if (!address) return { allowed: true, retryAfter: 0 };
  const { env } = await getCloudflareContext({ async: true });
  const secret = validateRateLimitSecret(env.RATE_LIMIT_SECRET);
  const now = Math.floor(Date.now() / 1_000);
  await purgeExpiredRateLimits(database, now);
  const bucket = Math.floor(now / windowSeconds);
  // Le quota est isolé par visiteur pour ne pas bloquer une classe, une convention
  // ou une entreprise entière derrière la même IP. L'IP reste incluse dans la clé.
  const scopedIdentity = identity?.slice(0, 128) || "anonymous";
  const rateKey = await hashRateKey(secret, `${action}:${bucket}:${address}:${scopedIdentity}`);
  const row = await database.prepare(
    `INSERT INTO bus_rate_limits (rate_key, bucket, attempts, expires_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(rate_key, bucket) DO UPDATE SET attempts = attempts + 1
     RETURNING attempts`,
  ).bind(rateKey, bucket, (bucket + 1) * windowSeconds).first<{ attempts: number }>();
  return {
    allowed: Number(row?.attempts ?? maximum + 1) <= maximum,
    retryAfter: Math.max(1, (bucket + 1) * windowSeconds - now),
  };
}

export function rateLimitedResponse(retryAfter: number) {
  return Response.json(
    { error: "Trop de demandes ont été envoyées. Réessaie un peu plus tard." },
    { status: 429, headers: { ...WRITE_HEADERS, "Retry-After": String(retryAfter) } },
  );
}

export function parseNonNegativeInteger(value: string | null, fallback: number, maximum = 10_000_000) {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : fallback;
}
