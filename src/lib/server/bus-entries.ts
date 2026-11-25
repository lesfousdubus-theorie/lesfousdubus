import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareD1Database } from "@/types/cloudflare";
import type { PassengerProfile } from "@/types/passenger";
import { normalizeRateAddress } from "./rate-address";
import { isPassengerAvatarId } from "@/lib/passenger-avatar";

export const READ_HEADERS = { "Cache-Control": "public, max-age=15, s-maxage=20, stale-while-revalidate=40" };
export const STATS_READ_HEADERS = { "Cache-Control": "public, max-age=15, s-maxage=20, stale-while-revalidate=40" };
export const MANIFEST_READ_HEADERS = { "Cache-Control": "public, max-age=30, s-maxage=45, stale-while-revalidate=60" };
export const MESSAGES_READ_HEADERS = { "Cache-Control": "public, max-age=60, s-maxage=90, stale-while-revalidate=120" };
export const PROFILES_READ_HEADERS = { "Cache-Control": "public, max-age=15, s-maxage=20, stale-while-revalidate=40" };
export const WRITE_HEADERS = { "Cache-Control": "no-store, max-age=0" };
const MAX_BODY_SIZE = 2_048;
const RATE_LIMIT_PURGE_INTERVAL_SECONDS = 30 * 60;
const RATE_LIMIT_PURGE_BATCH_SIZE = 500;
const MAX_BLOCKED_RATE_CACHE = 4_096;
let nextReadTriggeredPurgeAt = 0;
const blockedRateUntil = new Map<string, number>();

function rememberBlockedRate(key: string, untilUnixSeconds: number) {
  blockedRateUntil.delete(key);
  blockedRateUntil.set(key, untilUnixSeconds);
  while (blockedRateUntil.size > MAX_BLOCKED_RATE_CACHE) {
    const oldest = blockedRateUntil.keys().next().value;
    if (oldest === undefined) break;
    blockedRateUntil.delete(oldest);
  }
}

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

/** Utilise la réplication de lecture D1 quand elle est activée sur l'environnement Cloudflare. */
export function getReadDatabase(database: CloudflareD1Database): CloudflareD1Database {
  if (typeof database.withSession === "function") {
    try {
      return database.withSession("first-unconstrained");
    } catch {
      return database;
    }
  }
  return database;
}

export interface BusStatsRow {
  count: number;
  seat_capacity: number;
  profile_revision: number;
}

export async function readVacantSeatRanges(
  database: CloudflareD1Database,
): Promise<Array<[number, number, number]>> {
  const vacantSeatRanges: Array<[number, number, number]> = [];
  try {
    const ranges = await database.prepare(
      `SELECT start_index, end_index
       FROM bus_vacant_seat_ranges
       ORDER BY start_index ASC
       LIMIT 256`,
    ).all<{ start_index: number; end_index: number }>();
    let vacantBefore = 0;
    for (const range of ranges.results) {
      const start = Number(range.start_index);
      const end = Number(range.end_index);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) continue;
      vacantSeatRanges.push([start, end, vacantBefore]);
      vacantBefore += end - start + 1;
    }
  } catch {
    /* Si la table des places vacantes n'existe pas encore avant migration, renvoyer []. */
  }
  return vacantSeatRanges;
}

export async function readBusStats(database: CloudflareD1Database) {
  const row = await database.prepare(
    `SELECT passenger_count AS count,
            seat_capacity,
            profile_revision
     FROM bus_stats
     WHERE id = 1`,
  ).first<BusStatsRow>();
  const count = Number(row?.count ?? 0);
  const seatCapacity = Number(row?.seat_capacity ?? 0);
  const vacantSeatRanges = seatCapacity > count ? await readVacantSeatRanges(database) : [];
  return {
    count,
    seatCapacity,
    profileRevision: Number(row?.profile_revision ?? 0),
    vacantSeatRanges,
  };
}

export interface PassengerRow {
  seat_index: number;
  entry_number?: number | null;
  display_name: string | null;
  comment: string | null;
  avatar_id?: string | null;
  created_at?: string | null;
}
export interface PassengerManifestRow {
  seat_index: number;
  entry_number?: number | null;
  display_name: string | null;
  has_comment: number;
  created_at?: string | null;
}

const SQLITE_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export function normalizeJoinedAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoCandidate = SQLITE_TIMESTAMP_RE.test(trimmed)
    ? `${trimmed.replace(" ", "T")}Z`
    : trimmed;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function toNamedPassengerProfile(row: PassengerRow, includeComment = false): PassengerProfile | null {
  const avatarId = isPassengerAvatarId(row.avatar_id) ? row.avatar_id : null;
  if (!row.display_name && row.comment === null && !avatarId) return null;
  return {
    seatIndex: Number(row.seat_index),
    entryNumber: Number(row.entry_number ?? Number(row.seat_index) + 1),
    displayName: row.display_name || (row.comment !== null ? "Anonyme" : ""),
    comment: includeComment ? row.comment || null : null,
    avatarId,
    joinedAt: normalizeJoinedAt(row.created_at),
  };
}

export { cleanText } from "./text";

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
    await database.prepare(
      `DELETE FROM bus_rate_limits
       WHERE rowid IN (
         SELECT rowid FROM bus_rate_limits
         WHERE expires_at <= ?
         LIMIT ?
       )`,
    ).bind(now, RATE_LIMIT_PURGE_BATCH_SIZE).run();
  } catch (error) {
    if (!force) nextReadTriggeredPurgeAt = 0;
    throw error;
  }
}

let cachedHmacSecret = "";
let cachedHmacKey: CryptoKey | null = null;

async function getHmacKey(secret: string): Promise<CryptoKey> {
  if (cachedHmacKey && cachedHmacSecret === secret) return cachedHmacKey;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  cachedHmacSecret = secret;
  cachedHmacKey = key;
  return key;
}

async function hashRateKey(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await getHmacKey(secret);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Pré-filtre mémoire sans aucune requête D1 ni hachage crypto pour rejeter immédiatement
 * les floodbots déjà bloqués dans cet isolat.
 */
export function checkMemoryRateLimit(
  request: Request,
  action: "join" | "profile" | "leave",
  windowSeconds: number,
  identity: string,
): { blocked: boolean; retryAfter: number } {
  const rawAddress = request.headers.get("cf-connecting-ip")?.trim();
  if (!rawAddress) return { blocked: false, retryAfter: 0 };
  const address = normalizeRateAddress(rawAddress);
  const now = Math.floor(Date.now() / 1_000);
  const bucket = Math.floor(now / windowSeconds);
  const expiresAt = (bucket + 1) * windowSeconds;
  const retryAfter = Math.max(1, expiresAt - now);
  const scopedIdentity = identity.slice(0, 128) || "anonymous";

  const sharedMemKey = `${action}:${bucket}:${address}:anonymous`;
  const personalMemKey = `${action}:${bucket}:${address}:${scopedIdentity}`;
  const sharedBlocked = blockedRateUntil.get(sharedMemKey);
  if (sharedBlocked && sharedBlocked > now) return { blocked: true, retryAfter };
  const personalBlocked = blockedRateUntil.get(personalMemKey);
  if (personalBlocked && personalBlocked > now) return { blocked: true, retryAfter };
  return { blocked: false, retryAfter };
}

const RATE_UPSERT_SQL = `INSERT INTO bus_rate_limits (rate_key, bucket, attempts, expires_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(rate_key, bucket) DO UPDATE SET attempts = attempts + 1
     RETURNING attempts`;

/**
 * Regroupe les deux vérifications de quota (IP partagée + visiteur individuel) en un seul
 * appel D1 batch() et court-circuite en mémoire les floodbots déjà bloqués dans l'isolat.
 */
export async function consumeRateLimits(
  database: CloudflareD1Database,
  request: Request,
  action: "join" | "profile" | "leave",
  sharedMaximum: number,
  personalMaximum: number,
  windowSeconds: number,
  identity: string,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const rawAddress = request.headers.get("cf-connecting-ip")?.trim();
  if (!rawAddress) return { allowed: true, retryAfter: 0 };
  const address = normalizeRateAddress(rawAddress);
  const now = Math.floor(Date.now() / 1_000);
  const bucket = Math.floor(now / windowSeconds);
  const expiresAt = (bucket + 1) * windowSeconds;
  const retryAfter = Math.max(1, expiresAt - now);
  const scopedIdentity = identity.slice(0, 128) || "anonymous";

  const sharedMemKey = `${action}:${bucket}:${address}:anonymous`;
  const personalMemKey = `${action}:${bucket}:${address}:${scopedIdentity}`;
  const sharedBlocked = blockedRateUntil.get(sharedMemKey);
  if (sharedBlocked && sharedBlocked > now) return { allowed: false, retryAfter };
  const personalBlocked = blockedRateUntil.get(personalMemKey);
  if (personalBlocked && personalBlocked > now) return { allowed: false, retryAfter };

  const { env } = await getCloudflareContext({ async: true });
  const secret = validateRateLimitSecret(env.RATE_LIMIT_SECRET);
  const [sharedKey, personalKey] = await Promise.all([
    hashRateKey(secret, sharedMemKey),
    hashRateKey(secret, personalMemKey),
  ]);
  const sharedStmt = database.prepare(RATE_UPSERT_SQL).bind(sharedKey, bucket, expiresAt);
  const personalStmt = database.prepare(RATE_UPSERT_SQL).bind(personalKey, bucket, expiresAt);

  let sharedAttempts: number;
  let personalAttempts: number;
  if (typeof database.batch === "function") {
    const [sharedRes, personalRes] = await database.batch<{ attempts: number }>([sharedStmt, personalStmt]);
    sharedAttempts = Number(sharedRes?.results?.[0]?.attempts ?? sharedMaximum + 1);
    personalAttempts = Number(personalRes?.results?.[0]?.attempts ?? personalMaximum + 1);
  } else {
    const [sharedRow, personalRow] = await Promise.all([
      sharedStmt.first<{ attempts: number }>(),
      personalStmt.first<{ attempts: number }>(),
    ]);
    sharedAttempts = Number(sharedRow?.attempts ?? sharedMaximum + 1);
    personalAttempts = Number(personalRow?.attempts ?? personalMaximum + 1);
  }

  if (sharedAttempts > sharedMaximum) {
    rememberBlockedRate(sharedMemKey, expiresAt);
    return { allowed: false, retryAfter };
  }
  if (personalAttempts > personalMaximum) {
    rememberBlockedRate(personalMemKey, expiresAt);
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter };
}

export async function consumeRateLimit(
  database: CloudflareD1Database,
  request: Request,
  action: "join" | "profile" | "leave",
  maximum: number,
  windowSeconds: number,
  identity?: string,
) {
  const rawAddress = request.headers.get("cf-connecting-ip")?.trim();
  // Ce header est présent derrière Cloudflare. En local, son absence ne doit
  // pas placer tous les développeurs dans un quota global commun.
  if (!rawAddress) return { allowed: true, retryAfter: 0 };
  const address = normalizeRateAddress(rawAddress);
  const now = Math.floor(Date.now() / 1_000);
  const bucket = Math.floor(now / windowSeconds);
  const expiresAt = (bucket + 1) * windowSeconds;
  const retryAfter = Math.max(1, expiresAt - now);
  const scopedIdentity = identity?.slice(0, 128) || "anonymous";
  const memKey = `${action}:${bucket}:${address}:${scopedIdentity}`;
  const blockedUntil = blockedRateUntil.get(memKey);
  if (blockedUntil && blockedUntil > now) return { allowed: false, retryAfter };

  const { env } = await getCloudflareContext({ async: true });
  const secret = validateRateLimitSecret(env.RATE_LIMIT_SECRET);
  const rateKey = await hashRateKey(secret, memKey);
  const row = await database.prepare(RATE_UPSERT_SQL).bind(rateKey, bucket, expiresAt).first<{ attempts: number }>();
  const allowed = Number(row?.attempts ?? maximum + 1) <= maximum;
  if (!allowed) rememberBlockedRate(memKey, expiresAt);
  return { allowed, retryAfter };
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
