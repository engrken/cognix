import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidServiceToken, type CognixApplication } from "@/lib/auth";
import { getCapabilityPolicy } from "@/lib/agent-registry";

export const runtime = "nodejs";

const TaskSchema = z.string().trim().min(1).max(80).regex(/^[a-z][a-z0-9-]*$/);
const RequestIdSchema = z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9._:-]+$/);

const VersionedRequestSchema = z.object({
  apiVersion: z.literal("1"),
  app: z.enum(["saga", "clear", "roamph"]),
  task: TaskSchema,
  input: z.record(z.string(), z.unknown()),
  requestId: RequestIdSchema.optional(),
}).strict();

// Retain parsing compatibility for the first SAGA integration experiment, but
// never execute it. The SAGA caller is disabled locally and this route fails closed.
const LegacySagaRequestSchema = z.object({
  app: z.literal("saga"),
  task: z.string().trim().min(1).max(512),
  context: z.record(z.string(), z.unknown()),
  requestId: RequestIdSchema.optional(),
}).strict();

type NormalizedRequest = {
  app: CognixApplication;
  task: string;
  requestId: string;
};

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function apiError(
  status: number,
  error: string,
  message: string,
  request?: Pick<NormalizedRequest, "app" | "task" | "requestId">,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({
    apiVersion: "1",
    status: "error",
    app: request?.app ?? null,
    task: request?.task ?? null,
    requestId: request?.requestId ?? null,
    error,
    message,
    ...extra,
  }, { status, headers: RESPONSE_HEADERS });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return apiError(413, "payload_too_large", "Request body exceeds the allowed size.");
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 16_384) {
      return apiError(413, "payload_too_large", "Request body exceeds the allowed size.");
    }
    body = JSON.parse(raw);
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  let normalized: NormalizedRequest;
  const versioned = VersionedRequestSchema.safeParse(body);
  if (versioned.success) {
    normalized = {
      app: versioned.data.app,
      task: versioned.data.task,
      requestId: versioned.data.requestId ?? `cognix-${randomUUID()}`,
    };
  } else {
    const legacy = LegacySagaRequestSchema.safeParse(body);
    if (!legacy.success) {
      return apiError(
        400,
        "invalid_request",
        "Use the versioned COGNIX v1 request schema.",
      );
    }
    normalized = {
      app: "saga",
      task: "teacher-summary",
      requestId: legacy.data.requestId ?? `cognix-${randomUUID()}`,
    };
  }

  if (!hasValidServiceToken(request, normalized.app)) {
    return apiError(
      401,
      "unauthorized",
      "A valid application-specific service token is required.",
      normalized,
    );
  }

  const policy = getCapabilityPolicy(normalized.app, normalized.task);
  if (!policy || policy.state !== "enabled" || policy.modelAccess !== "enabled") {
    return apiError(
      policy?.state === "disabled" ? 403 : 501,
      policy?.state === "disabled" ? "capability_disabled" : "capability_not_enabled",
      policy?.reason ?? "This application capability is not registered or enabled. No model request or application action was performed.",
      normalized,
      { policyState: policy?.state ?? "not-registered" },
    );
  }

  // No application capability is currently enabled through this endpoint.
  // Keep the dispatcher default-deny until an individually reviewed adapter
  // and execution implementation are introduced.
  return apiError(
    501,
    "capability_not_implemented",
    "This capability is registered but has no execution implementation. No model request or application action was performed.",
    normalized,
  );
}
