import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareD1Database } from "@/types/cloudflare";
import type { PassengerProfile } from "@/components/bus/constants";

export const dynamic = "force-dynamic";

const READ_HEADERS = {
  "Cache-Control": "public, max-age=5, s-maxage=5, stale-while-revalidate=10",
};

const WRITE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

async function getPassengerDatabase(): Promise<CloudflareD1Database> {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.DB_BUS) {
    throw new Error("The DB_BUS Cloudflare D1 binding is missing.");
  }

  return env.DB_BUS;
}

async function readPassengerCount(database: CloudflareD1Database): Promise<number> {
  const row = await database
    .prepare("SELECT passenger_count AS count FROM bus_stats WHERE id = 1")
    .first<{ count: number }>();

  return Number(row?.count ?? 0);
}

interface PassengerRow {
  seat_index: number;
  display_name: string | null;
  comment: string | null;
}

interface PassengerManifestRow {
  seat_index: number;
  display_name: string | null;
}

function toPassengerProfile(row: PassengerRow, includeComment = false): PassengerProfile | null {
  if (!row.display_name) return null;
  return {
    seatIndex: Number(row.seat_index),
    displayName: row.display_name,
    comment: includeComment ? row.comment || null : null,
  };
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function GET(request: Request) {
  try {
    const database = await getPassengerDatabase();
    const url = new URL(request.url);
    const seatParam = url.searchParams.get("seat");

    if (seatParam !== null) {
      const seatIndex = Number.parseInt(seatParam, 10);
      if (!Number.isSafeInteger(seatIndex) || seatIndex < 0) {
        return Response.json(
          { error: "Passager invalide." },
          { status: 400, headers: WRITE_HEADERS },
        );
      }

      const row = await database
        .prepare(
          `WITH ordered AS (
             SELECT ROW_NUMBER() OVER (ORDER BY rowid) - 1 AS seat_index, display_name, comment
             FROM bus_entries
           )
           SELECT seat_index, display_name, comment
           FROM ordered
           WHERE seat_index = ? AND display_name IS NOT NULL`,
        )
        .bind(seatIndex)
        .first<PassengerRow>();
      const passenger = row ? toPassengerProfile(row, true) : null;

      return passenger
        ? Response.json({ passenger }, { headers: WRITE_HEADERS })
        : Response.json({ error: "Passager introuvable." }, { status: 404, headers: WRITE_HEADERS });
    }

    const wantsProfiles = url.searchParams.get("profiles") === "1";
    const wantsManifest = url.searchParams.get("manifest") === "1";

    if (wantsManifest) {
      const from = Math.max(0, Number.parseInt(url.searchParams.get("from") ?? "0", 10) || 0);
      const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "60", 10) || 60));
      const rows = await database
        .prepare(
          `WITH ordered AS (
             SELECT ROW_NUMBER() OVER (ORDER BY rowid) - 1 AS seat_index, display_name
             FROM bus_entries
           )
           SELECT seat_index, display_name
           FROM ordered
           ORDER BY seat_index ASC
           LIMIT ? OFFSET ?`,
        )
        .bind(limit, from)
        .all<PassengerManifestRow>();
      const passengers = rows.results.map((row) => ({
        seatIndex: Number(row.seat_index),
        displayName: row.display_name || null,
      }));
      const count = await readPassengerCount(database);

      return Response.json(
        {
          count,
          passengers,
          nextFrom: from + passengers.length,
          hasMore: from + passengers.length < count,
        },
        { headers: WRITE_HEADERS },
      );
    }

    if (wantsProfiles) {
      const from = Math.max(0, Number.parseInt(url.searchParams.get("from") ?? "0", 10) || 0);
      const limit = Math.min(48, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "32", 10) || 32));
      const rows = await database
        .prepare(
          `WITH ordered AS (
             SELECT ROW_NUMBER() OVER (ORDER BY rowid) - 1 AS seat_index, display_name
             FROM bus_entries
           )
           SELECT seat_index, display_name, NULL AS comment
           FROM ordered
           WHERE seat_index >= ? AND seat_index < ? AND display_name IS NOT NULL
           ORDER BY seat_index ASC`,
        )
        .bind(from, from + limit)
        .all<PassengerRow>();
      const passengers = rows.results
        .map((row) => toPassengerProfile(row))
        .filter((profile): profile is PassengerProfile => profile !== null);

      return Response.json({ passengers }, { headers: WRITE_HEADERS });
    }

    const count = await readPassengerCount(database);
    return Response.json({ count }, { headers: READ_HEADERS });
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
    const body = (await request.json()) as {
      visitorId?: unknown;
      displayName?: unknown;
      comment?: unknown;
    };
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
    const hasDisplayName = Object.prototype.hasOwnProperty.call(body, "displayName");
    const hasComment = Object.prototype.hasOwnProperty.call(body, "comment");
    const displayName = cleanText(body.displayName, 24);
    const comment = cleanText(body.comment, 180);

    if (!/^[a-zA-Z0-9-]{8,128}$/.test(visitorId)) {
      return Response.json(
        { error: "Identifiant visiteur invalide." },
        { status: 400, headers: WRITE_HEADERS },
      );
    }

    const database = await getPassengerDatabase();
    const insertion = await database
      .prepare("INSERT OR IGNORE INTO bus_entries (visitor_id, display_name, comment) VALUES (?, ?, ?)")
      .bind(
        visitorId,
        hasDisplayName ? displayName : null,
        hasComment ? comment || null : null,
      )
      .run();
    const added = (insertion.meta.changes ?? 0) > 0;

    if (!added) {
      if (hasDisplayName && hasComment) {
        await database
          .prepare("UPDATE bus_entries SET display_name = ?, comment = ? WHERE visitor_id = ?")
          .bind(displayName || null, comment || null, visitorId)
          .run();
      } else if (hasDisplayName) {
        await database
          .prepare("UPDATE bus_entries SET display_name = ? WHERE visitor_id = ?")
          .bind(displayName || null, visitorId)
          .run();
      } else if (hasComment) {
        await database
          .prepare("UPDATE bus_entries SET comment = ? WHERE visitor_id = ?")
          .bind(comment || null, visitorId)
          .run();
      }
    }

    const passengerRow = await database
      .prepare(
        `WITH ordered AS (
           SELECT ROW_NUMBER() OVER (ORDER BY rowid) - 1 AS seat_index, visitor_id, display_name
           FROM bus_entries
         )
         SELECT seat_index, display_name, NULL AS comment FROM ordered WHERE visitor_id = ?`,
      )
      .bind(visitorId)
      .first<PassengerRow>();
    const count = await readPassengerCount(database);
    const passenger = passengerRow ? toPassengerProfile(passengerRow) : null;
    const seatIndex = passengerRow ? Number(passengerRow.seat_index) : null;

    return Response.json(
      { count, added, passenger, seatIndex },
      { headers: WRITE_HEADERS },
    );
  } catch (error) {
    console.error("POST /api/bus-entries error:", error);
    return Response.json(
      { error: "Impossible d'enregistrer ce passager pour le moment." },
      { status: 503, headers: WRITE_HEADERS },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { visitorId?: unknown };
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";

    if (!/^[a-zA-Z0-9-]{8,128}$/.test(visitorId)) {
      return Response.json(
        { error: "Identifiant visiteur invalide." },
        { status: 400, headers: WRITE_HEADERS },
      );
    }

    const database = await getPassengerDatabase();
    const existing = await database
      .prepare(
        `WITH ordered AS (
           SELECT ROW_NUMBER() OVER (ORDER BY rowid) - 1 AS seat_index, visitor_id
           FROM bus_entries
         )
         SELECT seat_index FROM ordered WHERE visitor_id = ?`,
      )
      .bind(visitorId)
      .first<{ seat_index: number }>();
    const deletion = await database
      .prepare("DELETE FROM bus_entries WHERE visitor_id = ?")
      .bind(visitorId)
      .run();
    const count = await readPassengerCount(database);

    return Response.json(
      {
        count,
        removed: (deletion.meta.changes ?? 0) > 0,
        seatIndex: existing ? Number(existing.seat_index) : null,
      },
      { headers: WRITE_HEADERS },
    );
  } catch (error) {
    console.error("DELETE /api/bus-entries error:", error);
    return Response.json(
      { error: "Impossible de quitter définitivement le bus pour le moment." },
      { status: 503, headers: WRITE_HEADERS },
    );
  }
}
