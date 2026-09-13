import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareD1Database } from "@/types/cloudflare";
import type { PassengerProfile } from "@/components/bus/constants";

export const dynamic = "force-dynamic";

const READ_HEADERS = { "Cache-Control": "public, max-age=5, s-maxage=5, stale-while-revalidate=10" };
const WRITE_HEADERS = { "Cache-Control": "no-store, max-age=0" };
const MAX_BODY_SIZE = 2_048;

async function getPassengerDatabase(): Promise<CloudflareD1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB_BUS) throw new Error("The DB_BUS Cloudflare D1 binding is missing.");
  return env.DB_BUS;
}

interface BusStatsRow {
  count: number;
  seat_capacity: number;
  profile_revision: number;
  vacant_start_index: number | null;
  vacant_end_index: number | null;
  vacant_before: number | null;
}

async function readBusStats(database: CloudflareD1Database) {
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

interface PassengerRow { seat_index: number; display_name: string | null; comment: string | null }
interface PassengerManifestRow { seat_index: number; display_name: string | null; has_comment: number }

function toNamedPassengerProfile(row: PassengerRow, includeComment = false): PassengerProfile | null {
  if (!row.display_name && row.comment === null) return null;
  return {
    seatIndex: Number(row.seat_index),
    displayName: row.display_name || "Anonyme",
    comment: includeComment ? row.comment || null : null,
  };
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_SIZE) throw new Error("BODY_TOO_LARGE");
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_SIZE) throw new Error("BODY_TOO_LARGE");
  const parsed: unknown = JSON.parse(rawBody);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_BODY");
  return parsed as Record<string, unknown>;
}

async function hashRateKey(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeRateLimit(
  database: CloudflareD1Database,
  request: Request,
  action: "join" | "profile" | "leave",
  maximum: number,
  windowSeconds: number,
) {
  const address = request.headers.get("cf-connecting-ip")?.trim();
  // Ce header est présent derrière Cloudflare. En local, son absence ne doit
  // pas placer tous les développeurs dans un quota global commun.
  if (!address) return { allowed: true, retryAfter: 0 };
  const now = Math.floor(Date.now() / 1_000);
  await database.prepare("DELETE FROM bus_rate_limits WHERE expires_at < ?").bind(now).run();
  const bucket = Math.floor(now / windowSeconds);
  const rateKey = await hashRateKey(`${action}:${address}`);
  const row = await database.prepare(
    `INSERT INTO bus_rate_limits (rate_key, bucket, attempts, expires_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(rate_key, bucket) DO UPDATE SET attempts = attempts + 1
     RETURNING attempts`,
  ).bind(rateKey, bucket, (bucket + 2) * windowSeconds).first<{ attempts: number }>();
  return {
    allowed: Number(row?.attempts ?? maximum + 1) <= maximum,
    retryAfter: Math.max(1, (bucket + 1) * windowSeconds - now),
  };
}

function rateLimitedResponse(retryAfter: number) {
  return Response.json(
    { error: "Trop de demandes ont été envoyées. Réessaie un peu plus tard." },
    { status: 429, headers: { ...WRITE_HEADERS, "Retry-After": String(retryAfter) } },
  );
}

function parseNonNegativeInteger(value: string | null, fallback: number, maximum = 10_000_000) {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const database = await getPassengerDatabase();
    const url = new URL(request.url);
    const seatParam = url.searchParams.get("seat");

    if (seatParam !== null) {
      const seatIndex = parseNonNegativeInteger(seatParam, -1);
      if (seatIndex < 0) {
        return Response.json({ error: "Passager invalide." }, { status: 400, headers: WRITE_HEADERS });
      }
      const row = await database.prepare(
        `SELECT seat_index, display_name, comment FROM bus_entries WHERE seat_index = ?`,
      ).bind(seatIndex).first<PassengerRow>();
      if (!row) {
        return Response.json({ error: "Passager introuvable." }, { status: 404, headers: WRITE_HEADERS });
      }
      return Response.json({ passenger: {
        seatIndex: Number(row.seat_index),
        displayName: row.display_name || "Anonyme",
        comment: row.comment || null,
      } }, { headers: WRITE_HEADERS });
    }

    const wantsProfiles = url.searchParams.get("profiles") === "1";
    const wantsManifest = url.searchParams.get("manifest") === "1";

    if (wantsManifest) {
      const from = parseNonNegativeInteger(url.searchParams.get("from"), 0);
      const limit = Math.min(100, Math.max(1, parseNonNegativeInteger(url.searchParams.get("limit"), 60, 100)));
      const rows = await database.prepare(
        `SELECT seat_index, display_name, comment IS NOT NULL AS has_comment
         FROM bus_entries WHERE seat_index >= ? ORDER BY seat_index ASC LIMIT ?`,
      ).bind(from, limit + 1).all<PassengerManifestRow>();
      const passengers = rows.results.slice(0, limit).map((row) => ({
        seatIndex: Number(row.seat_index),
        displayName: row.display_name || null,
        hasComment: Boolean(row.has_comment),
      }));
      const stats = await readBusStats(database);
      return Response.json({
        ...stats,
        passengers,
        nextFrom: passengers.length > 0 ? passengers.at(-1)!.seatIndex + 1 : from,
        hasMore: rows.results.length > limit,
      }, { headers: WRITE_HEADERS });
    }

    if (wantsProfiles) {
      const from = parseNonNegativeInteger(url.searchParams.get("from"), 0);
      const limit = Math.min(48, Math.max(1, parseNonNegativeInteger(url.searchParams.get("limit"), 32, 48)));
      const rows = await database.prepare(
        `SELECT seat_index, display_name,
                CASE WHEN comment IS NOT NULL THEN '' ELSE NULL END AS comment
         FROM bus_entries
         WHERE seat_index >= ? AND seat_index < ?
           AND (display_name IS NOT NULL OR comment IS NOT NULL)
         ORDER BY seat_index ASC`,
      ).bind(from, from + limit).all<PassengerRow>();
      const passengers = rows.results.map((row) => toNamedPassengerProfile(row))
        .filter((profile): profile is PassengerProfile => profile !== null);
      const stats = await readBusStats(database);
      return Response.json({ ...stats, passengers }, { headers: WRITE_HEADERS });
    }

    return Response.json(await readBusStats(database), { headers: READ_HEADERS });
  } catch (error) {
    console.error("GET /api/bus-entries error:", error);
    return Response.json(
      { error: "Le compteur des passagers est temporairement indisponible." },
      { status: 503, headers: WRITE_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
    const hasDisplayName = Object.prototype.hasOwnProperty.call(body, "displayName");
    const hasComment = Object.prototype.hasOwnProperty.call(body, "comment");
    const displayName = cleanText(body.displayName, 24);
    const comment = cleanText(body.comment, 180);
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(visitorId)) {
      return Response.json({ error: "Identifiant visiteur invalide." }, { status: 400, headers: WRITE_HEADERS });
    }

    const database = await getPassengerDatabase();
    const existing = await database.prepare(
      "SELECT seat_index FROM bus_entries WHERE visitor_id = ?",
    ).bind(visitorId).first<{ seat_index: number }>();
    const action = existing ? "profile" : "join";
    const rateLimit = await consumeRateLimit(
      database, request, action, action === "join" ? 6 : 30, action === "join" ? 3_600 : 600,
    );
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfter);

    let added = false;
    if (!existing) {
      const insertion = await database.prepare(
        `INSERT OR IGNORE INTO bus_entries (visitor_id, display_name, comment, seat_index)
         VALUES (?, ?, ?, COALESCE(
           (SELECT start_index FROM bus_vacant_seat_ranges ORDER BY start_index ASC LIMIT 1),
           (SELECT COALESCE(MAX(seat_index) + 1, 0) FROM bus_entries)
         ))`,
      ).bind(
        visitorId,
        hasDisplayName ? displayName || null : null,
        hasComment ? comment || null : null,
      ).run();
      added = (insertion.meta.changes ?? 0) > 0;
    } else if (hasDisplayName && hasComment) {
      await database.prepare(
        "UPDATE bus_entries SET display_name = ?, comment = ? WHERE visitor_id = ?",
      ).bind(displayName || null, comment || null, visitorId).run();
    } else if (hasDisplayName) {
      await database.prepare("UPDATE bus_entries SET display_name = ? WHERE visitor_id = ?")
        .bind(displayName || null, visitorId).run();
    } else if (hasComment) {
      await database.prepare("UPDATE bus_entries SET comment = ? WHERE visitor_id = ?")
        .bind(comment || null, visitorId).run();
    }

    const passengerRow = await database.prepare(
      `SELECT seat_index, display_name, NULL AS comment FROM bus_entries WHERE visitor_id = ?`,
    ).bind(visitorId).first<PassengerRow>();
    const stats = await readBusStats(database);
    return Response.json({
      ...stats,
      added,
      passenger: passengerRow ? toNamedPassengerProfile(passengerRow) : null,
      seatIndex: passengerRow ? Number(passengerRow.seat_index) : null,
    }, { headers: WRITE_HEADERS });
  } catch (error) {
    if (error instanceof Error && (error.message === "BODY_TOO_LARGE" || error.message === "INVALID_BODY")) {
      return Response.json({ error: "Corps de requête invalide." }, { status: 400, headers: WRITE_HEADERS });
    }
    console.error("POST /api/bus-entries error:", error);
    return Response.json(
      { error: "Impossible d'enregistrer ce passager pour le moment." },
      { status: 503, headers: WRITE_HEADERS },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await readJsonBody(request);
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(visitorId)) {
      return Response.json({ error: "Identifiant visiteur invalide." }, { status: 400, headers: WRITE_HEADERS });
    }
    const database = await getPassengerDatabase();
    const rateLimit = await consumeRateLimit(database, request, "leave", 12, 3_600);
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfter);
    const existing = await database.prepare("SELECT seat_index FROM bus_entries WHERE visitor_id = ?")
      .bind(visitorId).first<{ seat_index: number }>();
    const deletion = await database.prepare("DELETE FROM bus_entries WHERE visitor_id = ?")
      .bind(visitorId).run();
    const stats = await readBusStats(database);
    return Response.json({
      ...stats,
      removed: (deletion.meta.changes ?? 0) > 0,
      seatIndex: existing ? Number(existing.seat_index) : null,
    }, { headers: WRITE_HEADERS });
  } catch (error) {
    if (error instanceof Error && (error.message === "BODY_TOO_LARGE" || error.message === "INVALID_BODY")) {
      return Response.json({ error: "Corps de requête invalide." }, { status: 400, headers: WRITE_HEADERS });
    }
    console.error("DELETE /api/bus-entries error:", error);
    return Response.json(
      { error: "Impossible de quitter définitivement le bus pour le moment." },
      { status: 503, headers: WRITE_HEADERS },
    );
  }
}
