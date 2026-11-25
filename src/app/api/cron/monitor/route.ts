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
  const result = {
    checkedAt: status.checkedAt,
    overall: status.overall,
    summary: status.summary,
    historyWriteSucceeded: status.historyWriteSucceeded,
    historySampleCount: status.history.sampleCount,
  };

  // Log only aggregate operational metadata; never log tokens, service payloads, or application data.
  const logContext = {
    checkedAt: status.checkedAt,
    overall: status.overall,
    summary: status.summary,
    historyWriteSucceeded: status.historyWriteSucceeded,
    historySampleCount: status.history.sampleCount,
  };
  if (status.historyWriteSucceeded) {
    console.info("COGNIX scheduled monitor completed", logContext);
  } else {
    console.error("COGNIX scheduled monitor history write failed", logContext);
  }

  return NextResponse.json(result, {
    status: status.historyWriteSucceeded ? 200 : 503,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
