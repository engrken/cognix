import { NextRequest, NextResponse } from "next/server";
import { getSystemStatus } from "@/lib/system-monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, {
      status: 401,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const status = await getSystemStatus("scheduled");
  return NextResponse.json({
    checkedAt: status.checkedAt,
    overall: status.overall,
    summary: status.summary,
    historyRecorded: status.history.available,
  }, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
