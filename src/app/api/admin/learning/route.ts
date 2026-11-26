import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";
import { saveVerifiedLearning } from "@/lib/incident-learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  }

  if (!verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4_096) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413, headers });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }

  if (form.get("verificationConfirmed") !== "yes") {
    return NextResponse.json({ error: "verification_required", message: "Confirm that the resolution was tested before saving it as verified." }, { status: 400, headers });
  }

  try {
    await saveVerifiedLearning({
      fingerprint: String(form.get("fingerprint") ?? ""),
      applicationId: String(form.get("applicationId") ?? ""),
      confirmedCause: form.get("confirmedCause"),
      resolution: form.get("resolution"),
    });
    return NextResponse.redirect(new URL("/admin/learning?saved=1", request.url), {
      status: 303,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("no longer present") ? 409 : 400;
    return NextResponse.json({ error: "learning_not_saved", message: status === 409 ? "The incident pattern changed. Refresh and review the current evidence." : "A confirmed cause and verified resolution are required." }, { status, headers });
  }
}
