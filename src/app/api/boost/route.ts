import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Boost feature disabled. Bus capacity is strictly organic." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Boost feature disabled. Bus capacity is strictly organic." },
    { status: 410 }
  );
}

