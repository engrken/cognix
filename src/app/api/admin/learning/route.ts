import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";
import { saveVerifiedLearning } from "@/lib/incident-learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
const MAX_BODY_BYTES = 4_096;

class PayloadTooLargeError extends Error {}

async function readBoundedForm(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded") {
    throw new Error("Unsupported content type.");
  }

  if (!request.body) return new URLSearchParams();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new PayloadTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
    }
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  }

  if (!verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413, headers });
  }

  let form: URLSearchParams;
  try {
    form = await readBoundedForm(request);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413, headers });
    }
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }

  if (form.get("verificationConfirmed") !== "yes") {
    return NextResponse.json({ error: "verification_required", message: "Confirm that the resolution was tested before saving it as verified." }, { status: 400, headers });
  }

  try {
    await saveVerifiedLearning({
      fingerprint: form.get("fingerprint") ?? "",
      applicationId: form.get("applicationId") ?? "",
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
