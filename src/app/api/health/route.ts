import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareD1Database } from "@/types/cloudflare";

export const dynamic = "force-dynamic";

const HEALTH_HEADERS = { "Cache-Control": "no-store, max-age=0" };

function healthResponse(
  database: "d1" | "error",
  schema: "ready" | "error" | "unknown",
  secret: "configured" | "error",
) {
  const ok = database === "d1" && schema === "ready" && secret === "configured";
  return Response.json({ ok, database, schema, secret }, {
    status: ok ? 200 : 503,
    headers: HEALTH_HEADERS,
  });
}

export async function GET() {
  let database: CloudflareD1Database | undefined;
  let secret: "configured" | "error" = "error";

  try {
    const { env } = await getCloudflareContext({ async: true });
    database = env.DB_BUS as CloudflareD1Database | undefined;
    secret = (env.RATE_LIMIT_SECRET?.trim().length ?? 0) >= 32 ? "configured" : "error";
  } catch {
    return healthResponse("error", "unknown", "error");
  }

  if (!database) return healthResponse("error", "unknown", secret);

  try {
    await database.prepare("SELECT 1").first();
  } catch {
    return healthResponse("error", "unknown", secret);
  }

  try {
    // Exercise every table and column required by the public API. A generic
    // SELECT 1 would stay green when a migration is missing.
    const stats = await database.prepare(
      `SELECT passenger_count, seat_capacity, profile_revision
       FROM bus_stats WHERE id = 1`,
    ).first();
    if (!stats) throw new Error("bus_stats row missing");
    await database.prepare(
      `SELECT visitor_id, display_name, comment, seat_index
       FROM bus_entries LIMIT 1`,
    ).first();
    await database.prepare(
      `SELECT start_index, end_index
       FROM bus_vacant_seat_ranges LIMIT 1`,
    ).first();
    await database.prepare(
      `SELECT rate_key, bucket, attempts, expires_at
       FROM bus_rate_limits LIMIT 1`,
    ).first();
    return healthResponse("d1", "ready", secret);
  } catch {
    return healthResponse("d1", "error", secret);
  }
}
