import { NextResponse } from "next/server";
import { hasValidServiceToken, type CognixApplication } from "@/lib/auth";
import { acceptErrorEvent, parseErrorEvent } from "@/lib/error-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function POST(request: Request) {
  const parsed = await parseErrorEvent(request);
  if ("error" in parsed) {
    const status = parsed.error === "payload_too_large" ? 413
      : parsed.error === "stale_event" ? 422 : 400;
    return NextResponse.json({
      apiVersion: "1",
      status: "rejected",
      error: parsed.error,
    }, { status, headers });
  }

  const event = parsed.event;
  const app = event.app as CognixApplication;
  if (!hasValidServiceToken(request, app)) {
    return NextResponse.json({
      apiVersion: "1",
      status: "rejected",
      error: "unauthorized",
    }, { status: 401, headers });
  }

  try {
    const result = await acceptErrorEvent(event, app);
    return NextResponse.json({
      apiVersion: "1",
      status: result.duplicate ? "duplicate" : "accepted",
      eventRef: result.eventRef,
      classification: "new_pattern",
    }, { status: result.duplicate ? 200 : 202, headers });
  } catch (error) {
    if (error instanceof Error && error.message === "rate_limited") {
      return NextResponse.json({
        apiVersion: "1",
        status: "rejected",
        error: "rate_limited",
      }, { status: 429, headers });
    }
    return NextResponse.json({
      apiVersion: "1",
      status: "unavailable",
      error: "event_storage_unavailable",
    }, { status: 503, headers });
  }
}
