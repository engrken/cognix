import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidServiceToken, type CognixApplication } from "@/lib/auth";
import {
  generateModelText,
  ModelGatewayError,
  ModelNotConfiguredError,
} from "@/lib/ai/model";

export const runtime = "nodejs";

const SAGA_TASK_DESCRIPTION =
  "Provide a concise teacher-facing overview using only these aggregate counts. Explain that enrollment records may include the same learner in multiple subjects. Do not infer individual student performance, invent causes, or recommend changing grades.";

const SummarySchema = z.object({
  reportingPeriod: z.object({
    start: z.string().date(),
    endExclusive: z.string().date(),
    timezone: z.literal("Asia/Manila"),
  }).strict(),
  totals: z.object({
    assignedSubjects: z.number().int().min(0).max(100_000),
    enrollmentRecords: z.number().int().min(0).max(1_000_000),
    assessmentsDueWithinSevenDays: z.number().int().min(0).max(100_000),
    gradeWorkflow: z.object({
      draftSubjects: z.number().int().min(0).max(100_000),
      submittedSubjects: z.number().int().min(0).max(100_000),
      verifiedSubjects: z.number().int().min(0).max(100_000),
    }).strict(),
  }).strict(),
}).strict();

const ApplicationSchema = z.enum(["saga", "clear", "roamph"]);
const RequestIdSchema = z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9._:-]+$/);

const VersionedRequestSchema = z.object({
  apiVersion: z.literal("1"),
  app: ApplicationSchema,
  task: z.string().trim().min(1).max(80).regex(/^[a-z][a-z0-9-]*$/),
  input: z.record(z.string(), z.unknown()),
  requestId: RequestIdSchema.optional(),
}).strict();

// Backward compatibility for the already-integrated SAGA teacher-summary caller.
const LegacySagaRequestSchema = z.object({
  app: z.literal("saga"),
  task: z.literal(SAGA_TASK_DESCRIPTION),
  context: SummarySchema,
  requestId: RequestIdSchema.optional(),
}).strict();

type NormalizedRequest = {
  app: CognixApplication;
  task: string;
  input: unknown;
  requestId: string;
};

const SYSTEM_PROMPT = [
  "You are COGNIX, an assistant for the SAGA academic portal.",
  "Write a concise, practical teacher-facing overview using only the supplied aggregate counts.",
  "Do not calculate grades, infer student performance, identify students, invent causes, or suggest changing grades or academic records.",
  "State that enrollment records are subject-subject enrollment counts and may count one learner more than once.",
  "Describe the reporting period and summarize workload, upcoming assessments, and grade workflow counts.",
  "If a count is zero, state it neutrally. Do not imply a problem or success without evidence.",
  "Use plain language and short bullets. Do not claim to have taken any action.",
].join(" ");

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function apiError(
  status: number,
  error: string,
  message: string,
  request?: Pick<NormalizedRequest, "app" | "requestId">,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({
    apiVersion: "1",
    status: "error",
    app: request?.app ?? null,
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

  let raw: string;
  let body: unknown;
  try {
    raw = await request.text();
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
      input: versioned.data.input,
      requestId: versioned.data.requestId ?? `cognix-${randomUUID()}`,
    };
  } else {
    const legacy = LegacySagaRequestSchema.safeParse(body);
    if (!legacy.success) {
      return apiError(
        400,
        "invalid_request",
        "Use the versioned COGNIX v1 request schema or the supported legacy SAGA request.",
      );
    }
    normalized = {
      app: "saga",
      task: "teacher-summary",
      input: legacy.data.context,
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

  // The unified dispatcher is an explicit allow-list. Recognized apps and task
  // names do not imply that a capability is enabled or authorized.
  if (normalized.app !== "saga" || normalized.task !== "teacher-summary") {
    return apiError(
      501,
      "capability_not_enabled",
      "This application capability is not enabled in COGNIX yet. No model request or application action was performed.",
      normalized,
    );
  }

  const parsedInput = SummarySchema.safeParse(normalized.input);
  if (!parsedInput.success) {
    return apiError(
      400,
      "invalid_input",
      "The SAGA teacher-summary input does not match the approved aggregate schema.",
      normalized,
    );
  }

  try {
    const result = await generateModelText({
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(parsedInput.data),
      maxOutputTokens: 512,
    });

    return NextResponse.json({
      apiVersion: "1",
      status: "completed",
      app: normalized.app,
      task: normalized.task,
      requestId: normalized.requestId,
      answer: result.text,
      // Kept as a compatibility alias for the existing SAGA production caller.
      summary: result.text,
      sources: [],
      warnings: [],
      usage: result.usage ?? null,
    }, { headers: RESPONSE_HEADERS });
  } catch (error) {
    if (error instanceof ModelNotConfiguredError) {
      return apiError(
        503,
        "not_configured",
        "COGNIX model inference is not enabled. No application action was performed.",
        normalized,
      );
    }

    // Expose only a coarse HTTP diagnostic; never log tokens or provider response bodies.
    const gatewayStatus = error instanceof ModelGatewayError ? error.status : null;
    console.error("COGNIX model request failed", {
      requestId: normalized.requestId,
      app: normalized.app,
      task: normalized.task,
      gatewayStatus,
      failureType: error instanceof ModelGatewayError ? "gateway" : "internal",
    });

    return apiError(
      502,
      "model_unavailable",
      "COGNIX could not complete the request. No application records were changed.",
      normalized,
      { gatewayStatus },
    );
  }
}
