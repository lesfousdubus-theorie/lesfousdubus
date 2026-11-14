import type { PassengerProfile } from "@/types/passenger";
import { isValidVisitorId } from "@/lib/visitor-id";
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

    // The public counter is polled while the site is open, so expired buckets
    // are also removed when traffic is read-only after the final mutation.
    await purgeExpiredRateLimits(database, Math.floor(Date.now() / 1_000));
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
    if (
      (hasDisplayName && typeof body.displayName !== "string")
      || (hasComment && typeof body.comment !== "string")
    ) {
      return Response.json({ error: "Profil invalide." }, { status: 400, headers: WRITE_HEADERS });
    }
    const displayName = cleanText(body.displayName, 24);
    const comment = cleanText(body.comment, 180);
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
        `INSERT INTO bus_entries (visitor_id, display_name, comment, seat_index)
         VALUES (?, ?, ?, COALESCE(
           (SELECT start_index FROM bus_vacant_seat_ranges ORDER BY start_index ASC LIMIT 1),
           (SELECT COALESCE(MAX(seat_index) + 1, 0) FROM bus_entries)
         ))
         ON CONFLICT(visitor_id) DO NOTHING`,
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
  if (!acceptsJsonBody(request)) return unsupportedMediaTypeResponse();
  try {
    const body = await readJsonBody(request);
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
