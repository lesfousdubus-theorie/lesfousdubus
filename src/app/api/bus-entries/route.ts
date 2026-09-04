import { NextResponse } from "next/server";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { busEntries } from "@/db/schema";

export const dynamic = "force-dynamic";

// Le bus démarre vide (0 passagers) si la DB n'a pas encore d'entrées
let inMemoryCount = 0;

async function getCount() {
  if (!db) return inMemoryCount;
  try {
    const [row] = await db.select({ value: count() }).from(busEntries);
    return Number(row?.value ?? inMemoryCount);
  } catch (error) {
    console.error("DB getCount error:", error);
    return inMemoryCount;
  }
}

export async function GET() {
  try {
    const total = await getCount();
    return NextResponse.json({ count: total });
  } catch (error) {
    console.error("GET /api/bus-entries error:", error);
    return NextResponse.json({ count: inMemoryCount });
  }
}

export async function POST(request: Request) {
  try {
    let visitorId: string | null = null;

    try {
      const body = (await request.json()) as {
        visitorId?: string;
      };
      visitorId = body?.visitorId ?? null;
    } catch {
      // pas de body valide, visiteur anonyme
    }

    // Chaque montée réelle ajoute strictement 1 personne
    if (db) {
      await db.insert(busEntries).values({ visitorId });
    } else {
      inMemoryCount += 1;
    }

    const total = await getCount();
    return NextResponse.json({ count: total });
  } catch (error) {
    console.error("POST /api/bus-entries error:", error);
    inMemoryCount += 1;
    return NextResponse.json({ count: inMemoryCount });
  }
}
