import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareD1Database } from "@/types/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const database = env.DB_BUS as CloudflareD1Database | undefined;
    if (!database) throw new Error("DB_BUS binding missing");
    await database.prepare("SELECT 1").first();
    return Response.json({ ok: true, database: "d1" });
  } catch {
    return Response.json({ ok: false, database: "error" }, { status: 500 });
  }
}
