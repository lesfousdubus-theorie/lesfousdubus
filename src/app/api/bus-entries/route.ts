import { NextResponse } from "next/server";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { busEntries } from "@/db/schema";

export const dynamic = "force-dynamic";

const KV_TOTAL_KEY = "bus_passengers_total";
const KV_VISITOR_PREFIX = "bus_visitor:";

// Mémoire locale de secours (au cas où ni KV ni DB ne sont disponibles)
let inMemoryCount = 0;

async function getCloudflareKV() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    return ctx?.env?.KV_BUS ?? null;
  } catch {
    return null;
  }
}

async function getPersistedCount(): Promise<number> {
  // 1. Essayer Cloudflare KV (persistance Cloudflare)
  try {
    const kv = await getCloudflareKV();
    if (kv) {
      const val = await kv.get(KV_TOTAL_KEY);
      if (val !== null) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) {
          inMemoryCount = Math.max(inMemoryCount, parsed);
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error("Cloudflare KV get error:", err);
  }

  // 2. Essayer Postgres DB si configuré
  if (db) {
    try {
      const [row] = await db.select({ value: count() }).from(busEntries);
      const val = Number(row?.value ?? inMemoryCount);
      inMemoryCount = Math.max(inMemoryCount, val);
      return val;
    } catch (error) {
      console.error("DB getCount error:", error);
    }
  }

  // 3. Fallback mémoire
  return inMemoryCount;
}

export async function GET() {
  try {
    const total = await getPersistedCount();
    return NextResponse.json({ count: total });
  } catch (error) {
    console.error("GET /api/bus-entries error:", error);
    return NextResponse.json({ count: inMemoryCount });
  }
}

export async function POST(request: Request) {
  try {
    let visitorId: string | null = null;
    let amount = 1;

    try {
      const body = (await request.json()) as {
        visitorId?: string;
        amount?: number;
      };
      visitorId = body?.visitorId ?? null;
      if (typeof body?.amount === "number" && body.amount > 0 && body.amount <= 10) {
        amount = body.amount;
      }
    } catch {
      // Body absent ou invalide, montant par défaut = 1
    }

    let nextCount = (await getPersistedCount()) + amount;
    inMemoryCount = nextCount;

    // 1. Sauvegarder dans Cloudflare KV
    try {
      const kv = await getCloudflareKV();
      if (kv) {
        await kv.put(KV_TOTAL_KEY, String(nextCount));
        if (visitorId) {
          await kv.put(`${KV_VISITOR_PREFIX}${visitorId}`, new Date().toISOString(), {
            expirationTtl: 60 * 60 * 24 * 365,
          });
        }
      }
    } catch (kvErr) {
      console.error("Cloudflare KV put error:", kvErr);
    }

    // 2. Sauvegarder dans Postgres DB si actif
    if (db) {
      try {
        await db.insert(busEntries).values({ visitorId });
        const [row] = await db.select({ value: count() }).from(busEntries);
        if (row?.value) {
          nextCount = Number(row.value);
          inMemoryCount = nextCount;
        }
      } catch (dbErr) {
        console.error("DB insert error:", dbErr);
      }
    }

    return NextResponse.json({ count: nextCount });
  } catch (error) {
    console.error("POST /api/bus-entries error:", error);
    inMemoryCount += 1;
    return NextResponse.json({ count: inMemoryCount });
  }
}
