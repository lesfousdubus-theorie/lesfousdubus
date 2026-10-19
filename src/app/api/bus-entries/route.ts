import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { PassengerProfile } from "@/types/passenger";
import { isValidVisitorId } from "@/lib/visitor-id";
import { isPassengerAvatarId } from "@/lib/passenger-avatar";
import { findModerationIssue, MODERATION_MESSAGES } from "@/lib/server/moderation";
import { isModerationAuthorized } from "@/lib/server/moderation-auth";
import {
  READ_HEADERS, WRITE_HEADERS, acceptsJsonBody, unsupportedMediaTypeResponse,
  getPassengerDatabase, readBusStats, toNamedPassengerProfile, cleanText, readJsonBody,
  purgeExpiredRateLimits, consumeRateLimit, rateLimitedResponse, parseNonNegativeInteger,
  type PassengerRow, type PassengerManifestRow,
} from "@/lib/server/bus-entries";

export const dynamic = "force-dynamic";

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
        `SELECT seat_index, display_name, comment, avatar_id FROM bus_entries WHERE seat_index = ?`,
      ).bind(seatIndex).first<PassengerRow>();
      if (!row) {
        return Response.json({ error: "Passager introuvable." }, { status: 404, headers: WRITE_HEADERS });
      }
      return Response.json({ passenger: {
        seatIndex: Number(row.seat_index),
        displayName: row.display_name || "Anonyme",
        comment: row.comment || null,
        avatarId: isPassengerAvatarId(row.avatar_id) ? row.avatar_id : null,
      } }, { headers: READ_HEADERS });
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
      }, { headers: READ_HEADERS });
    }

    if (wantsProfiles) {
      const from = parseNonNegativeInteger(url.searchParams.get("from"), 0);
      const limit = Math.min(48, Math.max(1, parseNonNegativeInteger(url.searchParams.get("limit"), 32, 48)));
      const rows = await database.prepare(
        `SELECT seat_index, display_name, avatar_id,
                CASE WHEN comment IS NOT NULL THEN '' ELSE NULL END AS comment
         FROM bus_entries
         WHERE seat_index >= ? AND seat_index < ?
           AND (display_name IS NOT NULL OR comment IS NOT NULL OR avatar_id IS NOT NULL)
         ORDER BY seat_index ASC`,
      ).bind(from, from + limit).all<PassengerRow>();
      const passengers = rows.results.map((row) => toNamedPassengerProfile(row))
        .filter((profile): profile is PassengerProfile => profile !== null);
      const stats = await readBusStats(database);
      return Response.json({ ...stats, passengers }, { headers: READ_HEADERS });
    }

    // The public counter is polled while the site is open, so expired buckets
    // are also removed when traffic is read-only after the final mutation.
    await purgeExpiredRateLimits(database, Math.floor(Date.now() / 1_000)).catch(console.error);
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
  if (!acceptsJsonBody(request)) return unsupportedMediaTypeResponse();
  try {
    const body = await readJsonBody(request);
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
    const hasDisplayName = Object.prototype.hasOwnProperty.call(body, "displayName");
    const hasComment = Object.prototype.hasOwnProperty.call(body, "comment");
    const hasAvatar = Object.prototype.hasOwnProperty.call(body, "avatarId");
    if (
      (hasDisplayName && typeof body.displayName !== "string")
      || (hasComment && typeof body.comment !== "string")
      || (hasAvatar && !isPassengerAvatarId(body.avatarId))
    ) {
      return Response.json({ error: "Profil invalide." }, { status: 400, headers: WRITE_HEADERS });
    }
    const displayName = cleanText(body.displayName, 24);
    const comment = cleanText(body.comment, 180);
    if (displayName) {
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

    const database = await getPassengerDatabase();
    const existing = await database.prepare(
      "SELECT seat_index FROM bus_entries WHERE visitor_id = ?",
    ).bind(visitorId).first<{ seat_index: number }>();
    const action = existing ? "profile" : "join";
    // Deux étages : un quota généreux pour l'IP partagée (école, salon,
    // entreprise), puis un quota plus strict par navigateur/visiteur.
    const sharedRateLimit = await consumeRateLimit(
      database, request, action, action === "join" ? 120 : 300, action === "join" ? 3_600 : 600,
    );
    if (!sharedRateLimit.allowed) return rateLimitedResponse(sharedRateLimit.retryAfter);
    const rateLimit = await consumeRateLimit(
      database, request, action, action === "join" ? 6 : 30, action === "join" ? 3_600 : 600, visitorId,
    );
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfter);

    let added = false;
    if (!existing) {
      const insertion = await database.prepare(
        `INSERT INTO bus_entries (visitor_id, display_name, comment, avatar_id, seat_index)
         VALUES (?, ?, ?, ?, COALESCE(
           (SELECT start_index FROM bus_vacant_seat_ranges ORDER BY start_index ASC LIMIT 1),
           (SELECT COALESCE(MAX(seat_index) + 1, 0) FROM bus_entries)
         ))
         ON CONFLICT(visitor_id) DO NOTHING`,
      ).bind(
        visitorId,
        hasDisplayName ? displayName || null : null,
        hasComment ? comment || null : null,
        hasAvatar ? body.avatarId : null,
      ).run();
      added = (insertion.meta.changes ?? 0) > 0;
    } else if (hasDisplayName || hasComment || hasAvatar) {
      // Seuls les champs fournis changent : choisir un personnage conserve le
      // prénom, le commentaire et la place du visiteur.
      await database.prepare(
        `UPDATE bus_entries SET
          display_name = CASE WHEN ? THEN ? ELSE display_name END,
          comment = CASE WHEN ? THEN ? ELSE comment END,
          avatar_id = CASE WHEN ? THEN ? ELSE avatar_id END
         WHERE visitor_id = ?`,
      ).bind(hasDisplayName ? 1 : 0, displayName || null,
        hasComment ? 1 : 0, comment || null,
        hasAvatar ? 1 : 0, hasAvatar ? body.avatarId : null, visitorId).run();
    }

    const passengerRow = await database.prepare(
      `SELECT seat_index, display_name, comment, avatar_id FROM bus_entries WHERE visitor_id = ?`,
    ).bind(visitorId).first<PassengerRow>();
    const stats = await readBusStats(database);
    return Response.json({
      ...stats,
      added,
      passenger: passengerRow ? toNamedPassengerProfile(passengerRow, true) : null,
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
  if (!acceptsJsonBody(request)) return unsupportedMediaTypeResponse();
  try {
    const body = await readJsonBody(request);
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
    const database = await getPassengerDatabase();
    const sharedRateLimit = await consumeRateLimit(database, request, "leave", 120, 3_600);
    if (!sharedRateLimit.allowed) return rateLimitedResponse(sharedRateLimit.retryAfter);
    const rateLimit = await consumeRateLimit(database, request, "leave", 12, 3_600, visitorId);
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
