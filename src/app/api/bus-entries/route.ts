import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { PassengerProfile } from "@/types/passenger";
import type { CloudflareD1Database } from "@/types/cloudflare";
import { isValidVisitorId } from "@/lib/visitor-id";
import { isPassengerAvatarId } from "@/lib/passenger-avatar";
import { findModerationIssue, MODERATION_MESSAGES } from "@/lib/server/moderation";
import { isModerationAuthorized } from "@/lib/server/moderation-auth";
import {
  cachedPublicJson,
  invalidatePublicReadCache,
  scheduleBackgroundTask,
} from "@/lib/server/edge-cache";
import {
  WRITE_HEADERS, acceptsJsonBody, unsupportedMediaTypeResponse,
  getPassengerDatabase, getReadDatabase, readBusStats, readVacantSeatRanges,
  toNamedPassengerProfile, cleanText, readJsonBody, purgeExpiredRateLimits,
  checkMemoryRateLimit, consumeRateLimits, rateLimitedResponse, parseNonNegativeInteger,
  type PassengerRow, type PassengerManifestRow,
} from "@/lib/server/bus-entries";

export const dynamic = "force-dynamic";

class SeatNotFoundError extends Error {}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function isSeatConflictError(error: unknown): boolean {
  if (!error) return false;
  const pattern = /UNIQUE constraint failed.*(?:seat_index|entry_number)/i;
  if (typeof error === "string") return pattern.test(error);
  if (error instanceof Error) {
    if (pattern.test(error.message)) return true;
    if (error.cause && isSeatConflictError(error.cause)) return true;
  }
  if (typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && pattern.test(message)) return true;
    const cause = (error as { cause?: unknown }).cause;
    if (cause && isSeatConflictError(cause)) return true;
  }
  return pattern.test(String(error));
}

function isDisplayNameConflictError(error: unknown): boolean {
  if (!error) return false;
  const pattern = /UNIQUE constraint failed.*(?:display_name|bus_entries_unique_display_name)/i;
  if (typeof error === "string") return pattern.test(error);
  if (error instanceof Error) {
    if (pattern.test(error.message)) return true;
    if (error.cause && isDisplayNameConflictError(error.cause)) return true;
  }
  if (typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && pattern.test(message)) return true;
    const cause = (error as { cause?: unknown }).cause;
    if (cause && isDisplayNameConflictError(cause)) return true;
  }
  return pattern.test(String(error));
}

function isReservedAnonymousName(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return lower === "anonyme" || lower === "anonymous";
}

const DUPLICATE_NAME_ERROR = "Ce nom est déjà pris par un autre passager. Choisis-en un autre.";

function serviceUnavailableRetryAfter(): string {
  return String(5 + Math.floor(Math.random() * 11));
}

async function readPostWriteState(
  database: CloudflareD1Database,
  visitorId: string,
  includePassenger: boolean,
) {
  if (!includePassenger) {
    return {
      passengerRow: null as PassengerRow | null,
      stats: await readBusStats(database),
    };
  }
  if (typeof database.batch === "function") {
    const passengerStmt = database.prepare(
      `SELECT seat_index, entry_number, display_name, comment, avatar_id FROM bus_entries WHERE visitor_id = ?`,
    ).bind(visitorId);
    const statsStmt = database.prepare(
      `SELECT passenger_count AS count, seat_capacity, profile_revision FROM bus_stats WHERE id = 1`,
    );
    const [passengerRes, statsRes] = await database.batch<Record<string, unknown>>([passengerStmt, statsStmt]);
    const passengerRow = (passengerRes?.results?.[0] as unknown as PassengerRow | undefined) ?? null;
    const rawStats = statsRes?.results?.[0] as { count?: number; seat_capacity?: number; profile_revision?: number } | undefined;
    const count = Number(rawStats?.count ?? 0);
    const seatCapacity = Number(rawStats?.seat_capacity ?? 0);
    const vacantSeatRanges = seatCapacity > count ? await readVacantSeatRanges(database) : [];
    return {
      passengerRow,
      stats: {
        count,
        seatCapacity,
        profileRevision: Number(rawStats?.profile_revision ?? 0),
        vacantSeatRanges,
      },
    };
  }
  const [passengerRow, stats] = await Promise.all([
    database.prepare(
      `SELECT seat_index, entry_number, display_name, comment, avatar_id FROM bus_entries WHERE visitor_id = ?`,
    ).bind(visitorId).first<PassengerRow>(),
    readBusStats(database),
  ]);
  return { passengerRow, stats };
}

export async function GET(request: Request) {
  try {
    const database = await getPassengerDatabase();
    const readDb = getReadDatabase(database);
    const url = new URL(request.url);
    const seatParam = url.searchParams.get("seat");

    if (seatParam !== null) {
      const seatIndex = parseNonNegativeInteger(seatParam, -1);
      if (seatIndex < 0) {
        return Response.json({ error: "Passager invalide." }, { status: 400, headers: WRITE_HEADERS });
      }
      try {
        return await cachedPublicJson(
          request,
          {
            ttlSeconds: 20,
            maxAgeSeconds: 15,
            swrSeconds: 40,
            cacheKey: `${url.origin}/api/bus-entries?seat=${seatIndex}`,
            shouldFallbackToStale: (error) => !(error instanceof SeatNotFoundError),
          },
          async () => {
            const row = await readDb.prepare(
              `SELECT seat_index, entry_number, display_name, comment, avatar_id FROM bus_entries WHERE seat_index = ?`,
            ).bind(seatIndex).first<PassengerRow>();
            if (!row) throw new SeatNotFoundError();
            return {
              passenger: {
                seatIndex: Number(row.seat_index),
                entryNumber: Number(row.entry_number ?? Number(row.seat_index) + 1),
                displayName: row.display_name || "Anonyme",
                comment: row.comment || null,
                avatarId: isPassengerAvatarId(row.avatar_id) ? row.avatar_id : null,
              },
            };
          },
        );
      } catch (error) {
        if (error instanceof SeatNotFoundError) {
          return Response.json({ error: "Passager introuvable." }, { status: 404, headers: WRITE_HEADERS });
        }
        throw error;
      }
    }

    const visitorIdParam = url.searchParams.get("visitorId");
    if (visitorIdParam !== null) {
      const visitorId = visitorIdParam.trim();
      if (!isValidVisitorId(visitorId)) {
        return Response.json({ error: "Identifiant visiteur invalide." }, { status: 400, headers: WRITE_HEADERS });
      }
      const [row, stats] = await Promise.all([
        database.prepare(
          `SELECT seat_index, entry_number, display_name, comment, avatar_id FROM bus_entries WHERE visitor_id = ?`,
        ).bind(visitorId).first<PassengerRow>(),
        readBusStats(database),
      ]);
      const avatarId = row && isPassengerAvatarId(row.avatar_id) ? row.avatar_id : null;
      const hasDisplayName = Boolean(row?.display_name && row.display_name.trim().length > 0);
      const entryNumber = row ? Number(row.entry_number ?? Number(row.seat_index) + 1) : null;
      return Response.json({
        ...stats,
        registered: Boolean(row),
        hasDisplayName,
        seatIndex: row ? Number(row.seat_index) : null,
        entryNumber,
        passenger: row
          ? {
              seatIndex: Number(row.seat_index),
              entryNumber: entryNumber!,
              displayName: row.display_name || "",
              comment: row.comment || null,
              avatarId,
            }
          : null,
      }, { headers: WRITE_HEADERS });
    }

    if (url.searchParams.get("messages") === "1") {
      const from = parseNonNegativeInteger(url.searchParams.get("from"), 0);
      const limit = Math.min(100, Math.max(1, parseNonNegativeInteger(url.searchParams.get("limit"), 60, 100)));
      const random = url.searchParams.get("random") === "1";

      if (random) {
        const slot = parseNonNegativeInteger(url.searchParams.get("slot"), 0, 7);
        return await cachedPublicJson(
          request,
          {
            ttlSeconds: 90,
            maxAgeSeconds: 60,
            swrSeconds: 120,
            cacheKey: `${url.origin}/api/bus-entries?messages=1&random=1&limit=${limit}&slot=${slot}`,
          },
          async () => {
            const stats = await readBusStats(readDb);
            if (stats.seatCapacity <= 0) {
              return { messages: [], nextFrom: 0, hasMore: false };
            }

            let sampled: PassengerRow[];
            if (stats.seatCapacity <= limit * 3) {
              const allRows = await readDb.prepare(
                `SELECT seat_index, entry_number, display_name, comment FROM bus_entries
                 WHERE comment IS NOT NULL AND comment != ''
                 ORDER BY seat_index ASC LIMIT 300`,
              ).all<PassengerRow>();
              sampled = shuffleInPlace([...allRows.results]).slice(0, limit);
            } else {
              const bucketCount = 5;
              const starts = Array.from({ length: bucketCount }, (_, i) => {
                const base = Math.floor((i * stats.seatCapacity) / bucketCount);
                const span = Math.max(1, Math.floor(stats.seatCapacity / bucketCount));
                return base + Math.floor(Math.random() * span);
              });
              const querySql = `SELECT seat_index, entry_number, display_name, comment FROM bus_entries
                WHERE seat_index >= ? AND comment IS NOT NULL AND comment != ''
                ORDER BY seat_index ASC LIMIT 24`;
              const statements = starts.map((start) => readDb.prepare(querySql).bind(start));
              const batchResults = typeof readDb.batch === "function"
                ? await readDb.batch<PassengerRow>(statements)
                : await Promise.all(statements.map((stmt) => stmt.all<PassengerRow>()));

              const unique = new Map<number, PassengerRow>();
              for (const result of batchResults) {
                for (const row of result.results) {
                  const seatIdx = Number(row.seat_index);
                  if (!unique.has(seatIdx)) unique.set(seatIdx, row);
                }
              }
              if (unique.size < limit) {
                const topUp = await readDb.prepare(
                  `SELECT seat_index, entry_number, display_name, comment FROM bus_entries
                   WHERE seat_index >= 0 AND comment IS NOT NULL AND comment != ''
                   ORDER BY seat_index ASC LIMIT ?`,
                ).bind(limit * 2).all<PassengerRow>();
                for (const row of topUp.results) {
                  const seatIdx = Number(row.seat_index);
                  if (!unique.has(seatIdx)) unique.set(seatIdx, row);
                }
              }
              sampled = shuffleInPlace([...unique.values()]).slice(0, limit);
            }

            const messages = sampled.map((row) => ({
              seatIndex: Number(row.seat_index),
              displayName: row.display_name || "Anonyme",
              comment: row.comment,
            }));
            return {
              messages,
              nextFrom: messages.length ? messages[messages.length - 1].seatIndex + 1 : 0,
              hasMore: false,
            };
          },
        );
      }

      return await cachedPublicJson(
        request,
        {
          ttlSeconds: 90,
          maxAgeSeconds: 60,
          swrSeconds: 120,
          cacheKey: `${url.origin}/api/bus-entries?messages=1&from=${from}&limit=${limit}`,
        },
        async () => {
          const rows = await readDb.prepare(
            `SELECT seat_index, entry_number, display_name, comment FROM bus_entries
             WHERE seat_index >= ? AND comment IS NOT NULL AND comment != ''
             ORDER BY seat_index ASC LIMIT ?`,
          ).bind(from, limit + 1).all<PassengerRow>();
          const messages = rows.results.slice(0, limit).map((row) => ({
            seatIndex: Number(row.seat_index),
            displayName: row.display_name || "Anonyme",
            comment: row.comment,
          }));
          return {
            messages,
            nextFrom: messages.length ? messages[messages.length - 1].seatIndex + 1 : from,
            hasMore: rows.results.length > limit,
          };
        },
      );
    }

    const wantsProfiles = url.searchParams.get("profiles") === "1";
    const wantsManifest = url.searchParams.get("manifest") === "1";

    if (url.searchParams.get("names") === "1") {
      if (url.searchParams.get("from") !== null) {
        const from = parseNonNegativeInteger(url.searchParams.get("from"), 0);
        const limit = Math.min(80, Math.max(1, parseNonNegativeInteger(url.searchParams.get("limit"), 80, 80)));
        return await cachedPublicJson(
          request,
          {
            ttlSeconds: 20,
            maxAgeSeconds: 15,
            swrSeconds: 40,
            cacheKey: `${url.origin}/api/bus-entries?names=1&from=${from}&limit=${limit}`,
          },
          async () => {
            const rows = await readDb.prepare(
              `SELECT seat_index, display_name, avatar_id
               FROM bus_entries
               WHERE seat_index >= ? AND seat_index < ?
               ORDER BY seat_index ASC`,
            ).bind(from, from + limit).all<Pick<PassengerRow, "seat_index" | "display_name" | "avatar_id">>();
            return {
              names: rows.results.map((row) => ({
                seatIndex: Number(row.seat_index),
                displayName: row.display_name,
                avatarId: isPassengerAvatarId(row.avatar_id) ? row.avatar_id : null,
              })),
            };
          },
        );
      }

      const values = url.searchParams.get("seats")?.split(",") ?? [];
      const seats = values.map((value) => /^\d+$/.test(value) ? Number(value) : NaN);
      if (!seats.length || seats.length > 80 || seats.some((seat) => !Number.isSafeInteger(seat))) {
        return Response.json({ error: "Liste de places invalide." }, { status: 400, headers: WRITE_HEADERS });
      }
      const normalizedSeats = [...new Set(seats)].sort((a, b) => a - b);
      return await cachedPublicJson(
        request,
        {
          ttlSeconds: 20,
          maxAgeSeconds: 15,
          swrSeconds: 40,
          cacheKey: `${url.origin}/api/bus-entries?names=1&seats=${normalizedSeats.join(",")}`,
        },
        async () => {
          const placeholders = normalizedSeats.map(() => "?").join(",");
          const rows = await readDb.prepare(
            `SELECT seat_index, display_name, avatar_id FROM bus_entries WHERE seat_index IN (${placeholders})`,
          ).bind(...normalizedSeats).all<Pick<PassengerRow, "seat_index" | "display_name" | "avatar_id">>();
          return {
            names: rows.results.map((row) => ({
              seatIndex: Number(row.seat_index),
              displayName: row.display_name,
              avatarId: isPassengerAvatarId(row.avatar_id) ? row.avatar_id : null,
            })),
          };
        },
      );
    }

    if (wantsManifest) {
      const from = parseNonNegativeInteger(url.searchParams.get("from"), 0);
      const limit = Math.min(100, Math.max(1, parseNonNegativeInteger(url.searchParams.get("limit"), 60, 100)));
      return await cachedPublicJson(
        request,
        {
          ttlSeconds: 45,
          maxAgeSeconds: 30,
          swrSeconds: 60,
          cacheKey: `${url.origin}/api/bus-entries?manifest=1&from=${from}&limit=${limit}`,
        },
        async () => {
          const rows = await readDb.prepare(
            `SELECT seat_index, entry_number, display_name, comment IS NOT NULL AS has_comment
             FROM bus_entries WHERE seat_index >= ? ORDER BY seat_index ASC LIMIT ?`,
          ).bind(from, limit + 1).all<PassengerManifestRow>();
          const passengers = rows.results.slice(0, limit).map((row) => ({
            seatIndex: Number(row.seat_index),
            entryNumber: Number(row.entry_number ?? Number(row.seat_index) + 1),
            displayName: row.display_name || null,
            hasComment: Boolean(row.has_comment),
          }));
          const stats = await readBusStats(readDb);
          return {
            ...stats,
            passengers,
            nextFrom: passengers.length > 0 ? passengers.at(-1)!.seatIndex + 1 : from,
            hasMore: rows.results.length > limit,
          };
        },
      );
    }

    if (wantsProfiles) {
      const from = parseNonNegativeInteger(url.searchParams.get("from"), 0);
      const limit = Math.min(48, Math.max(1, parseNonNegativeInteger(url.searchParams.get("limit"), 32, 48)));
      return await cachedPublicJson(
        request,
        {
          ttlSeconds: 20,
          maxAgeSeconds: 15,
          swrSeconds: 40,
          cacheKey: `${url.origin}/api/bus-entries?profiles=1&from=${from}&limit=${limit}`,
        },
        async () => {
          const rows = await readDb.prepare(
            `SELECT seat_index, entry_number, display_name, avatar_id,
                    CASE WHEN comment IS NOT NULL THEN '' ELSE NULL END AS comment
             FROM bus_entries
             WHERE seat_index >= ? AND seat_index < ?
               AND (display_name IS NOT NULL OR comment IS NOT NULL OR avatar_id IS NOT NULL)
             ORDER BY seat_index ASC`,
          ).bind(from, from + limit).all<PassengerRow>();
          const passengers = rows.results.map((row) => toNamedPassengerProfile(row))
            .filter((profile): profile is PassengerProfile => profile !== null);
          const stats = await readBusStats(readDb);
          return { ...stats, passengers };
        },
      );
    }

    // Purge non bloquante des quotas expirés en arrière-plan (au plus toutes les 30 min).
    scheduleBackgroundTask(purgeExpiredRateLimits(database, Math.floor(Date.now() / 1_000)));
    return await cachedPublicJson(
      request,
      {
        ttlSeconds: 20,
        maxAgeSeconds: 15,
        swrSeconds: 40,
        cacheKey: `${url.origin}/api/bus-entries`,
      },
      () => readBusStats(readDb),
    );
  } catch (error) {
    console.error("GET /api/bus-entries error:", error);
    return Response.json(
      { error: "Le compteur des passagers est temporairement indisponible." },
      { status: 503, headers: { ...WRITE_HEADERS, "Retry-After": serviceUnavailableRetryAfter() } },
    );
  }
}

export async function POST(request: Request) {
  if (!acceptsJsonBody(request)) return unsupportedMediaTypeResponse();
  try {
    const body = await readJsonBody(request);
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
    const hasDisplayName = Object.prototype.hasOwnProperty.call(body, "displayName");
    const hasComment = Object.prototype.hasOwnProperty.call(body, "comment");
    const hasAvatar = Object.prototype.hasOwnProperty.call(body, "avatarId");
    const hasUpdateOnly = Object.prototype.hasOwnProperty.call(body, "updateOnly");
    if (
      (hasDisplayName && typeof body.displayName !== "string")
      || (hasComment && typeof body.comment !== "string")
      || (hasAvatar && !isPassengerAvatarId(body.avatarId))
      || (hasUpdateOnly && typeof body.updateOnly !== "boolean")
    ) {
      return Response.json({ error: "Profil invalide." }, { status: 400, headers: WRITE_HEADERS });
    }
    const updateOnly = body.updateOnly === true;
    const displayName = cleanText(body.displayName, 24);
    const comment = cleanText(body.comment, 180, true);
    if (displayName) {
      if (isReservedAnonymousName(displayName)) {
        return Response.json({ error: "Choisis un nom différent d’Anonyme." }, { status: 400, headers: WRITE_HEADERS });
      }
      const issue = findModerationIssue(displayName);
      if (issue) {
        return Response.json({ error: MODERATION_MESSAGES[issue] }, { status: 400, headers: WRITE_HEADERS });
      }
    }
    if (comment) {
      const issue = findModerationIssue(comment);
      if (issue) {
        return Response.json({ error: MODERATION_MESSAGES[issue] }, { status: 400, headers: WRITE_HEADERS });
      }
    }
    if (!isValidVisitorId(visitorId)) {
      return Response.json({ error: "Identifiant visiteur invalide." }, { status: 400, headers: WRITE_HEADERS });
    }

    // Court-circuit 0 requête D1 si ce visiteur ou cette IP est déjà bloqué en mémoire.
    if (updateOnly) {
      const profilePrecheck = checkMemoryRateLimit(request, "profile", 600, visitorId);
      if (profilePrecheck.blocked) return rateLimitedResponse(profilePrecheck.retryAfter);
    } else {
      const joinPrecheck = checkMemoryRateLimit(request, "join", 3_600, visitorId);
      const profilePrecheck = checkMemoryRateLimit(request, "profile", 600, visitorId);
      if (joinPrecheck.blocked && profilePrecheck.blocked) {
        return rateLimitedResponse(Math.min(joinPrecheck.retryAfter, profilePrecheck.retryAfter));
      }
    }

    const origin = new URL(request.url).origin;
    const isEdgeRequest = Boolean(request.headers.get("cf-ray"));
    const database = await getPassengerDatabase();

    // Regroupe la recherche du visiteur et du pseudonyme (via l'index partiel bus_entries_unique_display_name)
    // en un seul aller-retour batch() lorsque le nom est fourni.
    let existing: { seat_index: number } | null = null;
    let nameOwner: { visitor_id: string } | null = null;
    const existingStmt = database.prepare("SELECT seat_index FROM bus_entries WHERE visitor_id = ?").bind(visitorId);
    if (displayName) {
      const nameStmt = database.prepare(
        `SELECT visitor_id FROM bus_entries
         WHERE display_name IS NOT NULL AND TRIM(display_name) != ''
           AND LOWER(TRIM(display_name)) = LOWER(?)
           AND visitor_id != ?
         LIMIT 1`,
      ).bind(displayName, visitorId);
      if (typeof database.batch === "function") {
        const [existingRes, nameRes] = await database.batch<Record<string, unknown>>([existingStmt, nameStmt]);
        existing = (existingRes?.results?.[0] as unknown as { seat_index: number } | undefined) ?? null;
        nameOwner = (nameRes?.results?.[0] as unknown as { visitor_id: string } | undefined) ?? null;
      } else {
        [existing, nameOwner] = await Promise.all([
          existingStmt.first<{ seat_index: number }>(),
          nameStmt.first<{ visitor_id: string }>(),
        ]);
      }
    } else {
      existing = await existingStmt.first<{ seat_index: number }>();
    }

    const action = existing || updateOnly ? "profile" : "join";
    const rateLimit = await consumeRateLimits(
      database,
      request,
      action,
      action === "join" ? 120 : 300,
      action === "join" ? 6 : 30,
      action === "join" ? 3_600 : 600,
      visitorId,
    );
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfter);

    if (!existing && !updateOnly && !displayName) {
      return Response.json({ error: "Choisis un nom avant de monter dans le bus." }, { status: 400, headers: WRITE_HEADERS });
    }
    if (existing && hasDisplayName && !displayName) {
      return Response.json({ error: "Choisis un nom à afficher au-dessus de ton personnage." }, { status: 400, headers: WRITE_HEADERS });
    }
    if (displayName && (hasDisplayName || !existing) && nameOwner) {
      return Response.json({ error: DUPLICATE_NAME_ERROR }, { status: 409, headers: WRITE_HEADERS });
    }

    let added = false;
    let insertedRow: PassengerRow | null = null;
    let postInsertStats: Awaited<ReturnType<typeof readBusStats>> | null = null;
    if (!existing && !updateOnly) {
      const MAX_SEAT_ATTEMPTS = 8;
      for (let attempt = 0; attempt < MAX_SEAT_ATTEMPTS; attempt++) {
        try {
          if (typeof database.batch === "function") {
            const insertStmt = database.prepare(
              `INSERT INTO bus_entries (visitor_id, display_name, comment, avatar_id, seat_index, entry_number)
               VALUES (
                 ?, ?, ?, ?,
                 COALESCE(
                   (SELECT start_index FROM bus_vacant_seat_ranges ORDER BY start_index ASC LIMIT 1),
                   (SELECT COALESCE(MAX(seat_index) + 1, 0) FROM bus_entries)
                 ),
                 (SELECT MAX(last_entry_number, COALESCE((SELECT MAX(entry_number) FROM bus_entries), 0)) + 1 FROM bus_stats WHERE id = 1)
               )
               ON CONFLICT(visitor_id) DO NOTHING
               RETURNING seat_index, entry_number, display_name, comment, avatar_id`,
            ).bind(
              visitorId,
              displayName,
              hasComment ? comment || null : null,
              hasAvatar ? body.avatarId : null,
            );
            const statsStmt = database.prepare(
              `SELECT passenger_count AS count, seat_capacity, profile_revision FROM bus_stats WHERE id = 1`,
            );
            const [insertRes, statsRes] = await database.batch<Record<string, unknown>>([insertStmt, statsStmt]);
            const row = (insertRes?.results?.[0] as unknown as PassengerRow | undefined) ?? null;
            if (row) {
              added = true;
              insertedRow = row;
              const rawStats = statsRes?.results?.[0] as { count?: number; seat_capacity?: number; profile_revision?: number } | undefined;
              const count = Number(rawStats?.count ?? 0);
              const seatCapacity = Number(rawStats?.seat_capacity ?? 0);
              const vacantSeatRanges = seatCapacity > count ? await readVacantSeatRanges(database) : [];
              postInsertStats = {
                count,
                seatCapacity,
                profileRevision: Number(rawStats?.profile_revision ?? 0),
                vacantSeatRanges,
              };
            }
          } else {
            const insertion = await database.prepare(
              `INSERT INTO bus_entries (visitor_id, display_name, comment, avatar_id, seat_index, entry_number)
               VALUES (
                 ?, ?, ?, ?,
                 COALESCE(
                   (SELECT start_index FROM bus_vacant_seat_ranges ORDER BY start_index ASC LIMIT 1),
                   (SELECT COALESCE(MAX(seat_index) + 1, 0) FROM bus_entries)
                 ),
                 (SELECT MAX(last_entry_number, COALESCE((SELECT MAX(entry_number) FROM bus_entries), 0)) + 1 FROM bus_stats WHERE id = 1)
               )
               ON CONFLICT(visitor_id) DO NOTHING`,
            ).bind(
              visitorId,
              displayName,
              hasComment ? comment || null : null,
              hasAvatar ? body.avatarId : null,
            ).run();
            added = (insertion.meta.changes ?? 0) > 0;
          }
          break;
        } catch (insertError) {
          if (isDisplayNameConflictError(insertError)) {
            return Response.json({ error: DUPLICATE_NAME_ERROR }, { status: 409, headers: WRITE_HEADERS });
          }
          if (!isSeatConflictError(insertError) || attempt === MAX_SEAT_ATTEMPTS - 1) {
            throw insertError;
          }
          const current = await database.prepare(
            "SELECT seat_index FROM bus_entries WHERE visitor_id = ?",
          ).bind(visitorId).first<{ seat_index: number }>();
          if (current) {
            existing = current;
            break;
          }
        }
      }
    }

    if (existing && (hasDisplayName || hasComment || hasAvatar)) {
      // Seuls les champs fournis changent : choisir un personnage conserve le
      // prénom, le commentaire et la place du visiteur.
      try {
        await database.prepare(
          `UPDATE bus_entries SET
            display_name = CASE WHEN ? THEN ? ELSE display_name END,
            comment = CASE WHEN ? THEN ? ELSE comment END,
            avatar_id = CASE WHEN ? THEN ? ELSE avatar_id END
           WHERE visitor_id = ?`,
        ).bind(hasDisplayName ? 1 : 0, displayName || null,
          hasComment ? 1 : 0, comment || null,
          hasAvatar ? 1 : 0, hasAvatar ? body.avatarId : null, visitorId).run();
      } catch (updateError) {
        if (isDisplayNameConflictError(updateError)) {
          return Response.json({ error: DUPLICATE_NAME_ERROR }, { status: 409, headers: WRITE_HEADERS });
        }
        throw updateError;
      }
    }

    const { passengerRow, stats } = added && insertedRow && postInsertStats
      ? { passengerRow: insertedRow, stats: postInsertStats }
      : await readPostWriteState(database, visitorId, Boolean(existing || !updateOnly));

    if (added || (existing && (hasDisplayName || hasComment || hasAvatar))) {
      invalidatePublicReadCache({
        origin,
        seatIndex: passengerRow ? Number(passengerRow.seat_index) : (existing?.seat_index ?? null),
        isEdgeRequest,
      });
    }

    const entryNumber = passengerRow ? Number(passengerRow.entry_number ?? Number(passengerRow.seat_index) + 1) : null;
    return Response.json({
      ...stats,
      added,
      passenger: passengerRow ? toNamedPassengerProfile(passengerRow, true) : null,
      seatIndex: passengerRow ? Number(passengerRow.seat_index) : null,
      entryNumber,
    }, { headers: WRITE_HEADERS });
  } catch (error) {
    if (error instanceof Error && (error.message === "BODY_TOO_LARGE" || error.message === "INVALID_BODY")) {
      return Response.json({ error: "Corps de requête invalide." }, { status: 400, headers: WRITE_HEADERS });
    }
    console.error("POST /api/bus-entries error:", error);
    return Response.json(
      { error: "Impossible d'enregistrer ce passager pour le moment." },
      { status: 503, headers: { ...WRITE_HEADERS, "Retry-After": serviceUnavailableRetryAfter() } },
    );
  }
}

export async function DELETE(request: Request) {
  if (!acceptsJsonBody(request)) return unsupportedMediaTypeResponse();
  try {
    const body = await readJsonBody(request);
    const origin = new URL(request.url).origin;
    const isEdgeRequest = Boolean(request.headers.get("cf-ray"));
    // An explicit seat selects administration. Never downgrade a failed admin
    // request to a personal deletion, even when visitorId is also supplied.
    if (Object.prototype.hasOwnProperty.call(body, "seatIndex")) {
      const { env } = await getCloudflareContext({ async: true });
      if (!await isModerationAuthorized(request, env)) {
        return Response.json({ error: "Action de modération non autorisée." }, { status: 403, headers: WRITE_HEADERS });
      }
      const seatIndex = body.seatIndex;
      if (typeof seatIndex !== "number" || !Number.isSafeInteger(seatIndex) || seatIndex < 0) {
        return Response.json({ error: "Passager invalide." }, { status: 400, headers: WRITE_HEADERS });
      }
      const database = await getPassengerDatabase();
      const deletion = await database.prepare("DELETE FROM bus_entries WHERE seat_index = ?").bind(seatIndex).run();
      if ((deletion.meta.changes ?? 0) > 0) {
        invalidatePublicReadCache({ origin, seatIndex, isEdgeRequest });
      }
      const stats = await readBusStats(database);
      return Response.json({
        ...stats,
        removed: (deletion.meta.changes ?? 0) > 0,
        seatIndex,
      }, { headers: WRITE_HEADERS });
    }

    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
    if (!isValidVisitorId(visitorId)) {
      return Response.json({ error: "Identifiant visiteur invalide." }, { status: 400, headers: WRITE_HEADERS });
    }
    const leavePrecheck = checkMemoryRateLimit(request, "leave", 3_600, visitorId);
    if (leavePrecheck.blocked) return rateLimitedResponse(leavePrecheck.retryAfter);

    const database = await getPassengerDatabase();
    const rateLimit = await consumeRateLimits(database, request, "leave", 120, 12, 3_600, visitorId);
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfter);
    const existing = await database.prepare("SELECT seat_index FROM bus_entries WHERE visitor_id = ?")
      .bind(visitorId).first<{ seat_index: number }>();
    const deletion = await database.prepare("DELETE FROM bus_entries WHERE visitor_id = ?")
      .bind(visitorId).run();
    if ((deletion.meta.changes ?? 0) > 0) {
      invalidatePublicReadCache({
        origin,
        seatIndex: existing ? Number(existing.seat_index) : null,
        isEdgeRequest,
      });
    }
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
      { error: "Impossible de retirer cette place pour le moment." },
      { status: 503, headers: { ...WRITE_HEADERS, "Retry-After": serviceUnavailableRetryAfter() } },
    );
  }
}
