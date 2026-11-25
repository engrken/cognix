import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidServiceToken, type CognixApplication } from "@/lib/auth";
import { getCapabilityPolicy } from "@/lib/agent-registry";
import {
  generateModelText,
  ModelGatewayError,
  ModelNotConfiguredError,
} from "@/lib/ai/model";

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

const LegacySagaRequestSchema = z.object({
  app: z.literal("saga"),
  task: z.string().trim().min(1).max(512),
  context: z.record(z.string(), z.unknown()),
  requestId: RequestIdSchema.optional(),
}).strict();

const LearningResourceSchema = z.object({
  resourceType: z.enum(["lesson-outline", "study-guide", "practice-questions"]),
  subject: z.enum([
    "Mathematics",
    "Science",
    "English",
    "Filipino",
    "Araling Panlipunan",
    "Computer Studies",
    "Technology and Livelihood Education",
    "General",
  ]),
  level: z.enum([
    "Elementary",
    "Junior High School",
    "Senior High School",
    "Higher Education",
    "Adult Learning",
  ]),
  topic: z.string().trim().min(3).max(120),
}).strict();

type NormalizedRequest = {
  app: CognixApplication;
  task: string;
  requestId: string;
  input?: Record<string, unknown>;
};

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

const ACADEMIC_SYSTEM_PROMPT = [
  "You are the COGNIX Academic Assistant.",
  "Create general educational draft materials using only the supplied subject, learning level, resource type, and generic topic.",
  "Never request, infer, identify, evaluate, rank, or make decisions about an individual learner or teacher.",
  "Do not ask for or process names, student identifiers, class rosters, grades, scores, attendance, contact details, health information, family circumstances, or private school records.",
  "Do not claim that the draft is officially aligned to a Philippine or institutional curriculum unless that exact standard is explicitly supplied; this system does not supply one.",
  "Use age-appropriate language and accurate explanations. Clearly state assumptions where needed.",
  "For a lesson outline, include learning objectives, materials, a time-bounded sequence, guided practice, and a formative check.",
  "For a study guide, include key ideas, clear explanations, generic examples, and a short self-check with answers.",
  "For practice questions, provide six varied questions and an answer key with brief explanations.",
  "Make the output practical, organized, concise, and suitable for teacher review. Do not claim to have accessed SAGA or any student record.",
].join(" ");

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

function containsPersonalOrRecordData(topic: string) {
  return (
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/i.test(topic) ||
    /(?:\+?63[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}|09\d{9})\b/.test(topic) ||
    /\b\d{7,}\b/.test(topic) ||
    /\b(?:student|learner|teacher|parent|guardian)\s+(?:name|id|number|email|phone|address|grade|score|attendance|record|roster)\b/i.test(topic) ||
    /\b(?:lrn|student\s*id|contact\s*(?:number|details)|email\s*address)\s*[:=#]/i.test(topic) ||
    /\b(?:grade|score|attendance|remark|record|roster)\s+(?:of|for)\s+[\p{L}][\p{L}\s'-]{1,40}/iu.test(topic)
  );
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
      input: versioned.data.input,
    };
  } else {
    const legacy = LegacySagaRequestSchema.safeParse(body);
    if (!legacy.success) {
      return apiError(400, "invalid_request", "Use the versioned COGNIX v1 request schema.");
    }
    normalized = {
      app: "saga",
      task: "teacher-summary",
      requestId: legacy.data.requestId ?? `cognix-${randomUUID()}`,
      input: legacy.data.context,
    };
  }

  if (!hasValidServiceToken(request, normalized.app)) {
    return apiError(401, "unauthorized", "A valid application-specific service token is required.", normalized);
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

  if (normalized.app === "saga" && normalized.task === "learning-resource") {
    const parsed = LearningResourceSchema.safeParse(normalized.input);
    if (!parsed.success) {
      return apiError(400, "invalid_input", "Provide a supported resource type, subject, learning level, and generic topic.", normalized);
    }

    if (containsPersonalOrRecordData(parsed.data.topic)) {
      return apiError(
        400,
        "personal_data_not_allowed",
        "Use a generic academic topic only. Personal details, identifiers, grades, scores, attendance, and student or teacher records are not accepted.",
        normalized,
      );
    }

    const start = Date.now();
    try {
      const result = await generateModelText({
        model: "vmc/academic-assistant",
        system: ACADEMIC_SYSTEM_PROMPT,
        prompt: JSON.stringify(parsed.data),
        maxOutputTokens: 800,
      });

      console.info("COGNIX academic agent completed", {
        app: normalized.app,
        task: normalized.task,
        requestId: normalized.requestId,
        durationMs: Date.now() - start,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
      });

      return NextResponse.json({
        apiVersion: "1",
        status: "completed",
        app: normalized.app,
        task: normalized.task,
        requestId: normalized.requestId,
        answer: result.text,
        warnings: [
          "AI-generated draft: a teacher must review accuracy, age-appropriateness, and curriculum fit before classroom use.",
          "Only the generic topic and selected resource settings are sent to the model provider. AI Gateway filters out providers that train on prompts; this does not guarantee zero data retention.",
        ],
        usage: result.usage ?? null,
      }, { headers: RESPONSE_HEADERS });
    } catch (error) {
      if (error instanceof ModelNotConfiguredError) {
        return apiError(503, "not_configured", "The COGNIX academic model is not configured. No application records were accessed.", normalized);
      }
      const gatewayStatus = error instanceof ModelGatewayError ? error.status : null;
      console.error("COGNIX academic agent failed", {
        app: normalized.app,
        task: normalized.task,
        requestId: normalized.requestId,
        gatewayStatus,
        failureType: error instanceof ModelGatewayError ? "gateway" : "internal",
      });
      return apiError(502, "model_unavailable", "The academic draft could not be generated. No SAGA records were accessed or changed.", normalized, { gatewayStatus });
    }
  }

  return apiError(
    501,
    "capability_not_implemented",
    "This capability is registered but has no execution implementation. No model request or application action was performed.",
    normalized,
  );
}
