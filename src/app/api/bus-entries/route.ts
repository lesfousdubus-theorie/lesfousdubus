import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareD1Database } from "@/types/cloudflare";

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
    .prepare("SELECT COUNT(*) AS count FROM bus_entries")
    .first<{ count: number }>();

  return Number(row?.count ?? 0);
}

export async function GET() {
  try {
    const database = await getPassengerDatabase();
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
    const body = (await request.json()) as { visitorId?: unknown };
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";

    if (!/^[a-zA-Z0-9-]{8,128}$/.test(visitorId)) {
      return Response.json(
        { error: "Identifiant visiteur invalide." },
        { status: 400, headers: WRITE_HEADERS },
      );
    }

    const database = await getPassengerDatabase();
    const insertion = await database
      .prepare("INSERT OR IGNORE INTO bus_entries (visitor_id) VALUES (?)")
      .bind(visitorId)
      .run();
    const count = await readPassengerCount(database);

    return Response.json(
      { count, added: (insertion.meta.changes ?? 0) > 0 },
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
