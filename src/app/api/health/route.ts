import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "cognix",
    version: "0.1.0",
    status: "foundation",
    timestamp: new Date().toISOString(),
  });
}
