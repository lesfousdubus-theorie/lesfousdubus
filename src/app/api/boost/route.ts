import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    boost: true,
    speedMultiplier: 2.5,
    message: "Le bus accélère vers Laugh Tale !",
  });
}

export async function POST() {
  return NextResponse.json({
    status: "ok",
    boost: true,
    speedMultiplier: 2.5,
    message: "Le bus accélère vers Laugh Tale !",
  });
}

