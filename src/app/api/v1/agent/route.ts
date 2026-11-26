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

// Retain the legacy envelope only so the old teacher-summary call is rejected
// by the capability registry with an explicit disabled-policy response.
const LegacySagaRequestSchema = z.object({
  app: z.literal("saga"),
  task: z.string().trim().min(1).max(512),
  context: z.record(z.string(), z.unknown()),
  requestId: RequestIdSchema.optional(),
}).strict();

const SystemHelpSchema = z.object({
  topic: z.enum([
    "class-navigation",
    "class-roster",
    "grading-setup",
    "assessments",
    "score-entry",
    "attendance",
    "class-activities",
    "final-grades",
    "grade-visibility",
    "profile-security",
    "class-chats",
    "privacy",
  ]),
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

const SYSTEM_HELP_PROMPT = [
  "You are the SAGA Virtual Assistant's product-use guide, operating through COGNIX.",
  "The only input is a fixed help-topic code selected by SAGA. You do not receive the teacher's message, identity, school, class identifier, class metadata, or academic records.",
  "Answer only how to use SAGA. Do not generate lesson outlines, study guides, practice questions, or subject tutoring.",
  "Use these SAGA feature notes as the source of truth:",
  "class-navigation: Teachers use My classes in the top navigation to open a class workspace. The Virtual Assistant is launched from an already-open class and is limited to that class. To change context, return to My classes and open another class.",
  "class-roster: In the class workspace, Class roster contains Add students, roster import/template, editing and removal. Student number is used to match an existing student portal account. The teacher must review the roster before saving.",
  "grading-setup: Grading setup lets a teacher choose Lecture/Laboratory or combined Lecture and Laboratory structure, configure category allocations, save the grading path, and set final-grade equivalents. Weight allocations should be checked against their parent totals before saving.",
  "assessments: Assessment items lets a teacher add an item, choose its grading category, set maximum points, optionally set a due date and weight, and save assessment setup.",
  "score-entry: Record scores is the score-entry workspace. The teacher enters points for selected assessment columns. Blank cells remain unchanged; the interface provides remark controls for excused, absent, and did-not-submit cases. CSV imports must be reviewed and validated before saving.",
  "attendance: Attendance is managed from the class workspace. Teachers can add a session, select date and delivery type, and record Present, Absent, or Excused marks. Attendance is represented separately from ordinary point-based assessments.",
  "class-activities: Activities is where class activities and learning tasks are created and managed. Teachers review activity status and due dates. Student submissions and grading stay inside SAGA.",
  "final-grades: Final grades & submit is where the teacher reviews the grade sheet and validation messages before submission. Submitted grade sheets follow the school's verification workflow; verified sheets are final. Follow on-screen instructions for recall or correction.",
  "grade-visibility: The class summary displays Visible to students or Hidden from students and provides grade-visibility controls. The teacher should confirm the current class before changing the setting.",
  "profile-security: The account menu opens Profile/Account settings. Teachers can review profile information and account-security settings. Never request passwords or one-time verification codes.",
  "class-chats: Class chats is available from the top navigation. Class-specific Google Chat controls appear from the class roster workspace when the integration is configured.",
  "privacy: SAGA is the system of record. Workspace answers are generated inside SAGA. For general help, only the fixed topic code is sent to COGNIX; the teacher's typed message and academic records are not. Do not request personal or confidential information.",
  "Write a clear, practical response in 3 to 6 numbered steps. Use the feature names above exactly. Do not invent buttons, paths, permissions, or statuses that are not in the feature notes.",
  "Never claim that you opened SAGA, queried a class, viewed a student, changed a setting, saved data, or performed an action. You are read-only guidance only.",
  "Never ask for student names, IDs, grades, scores, attendance marks, rosters, personal details, or confidential records. Direct the teacher to the relevant SAGA page for authorized student-level records.",
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

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 8_192) {
    return apiError(413, "payload_too_large", "Request body exceeds the allowed size.");
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 8_192) {
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

  if (normalized.app === "saga" && normalized.task === "system-help") {
    const parsed = SystemHelpSchema.safeParse(normalized.input);
    if (!parsed.success) {
      return apiError(400, "invalid_input", "Provide one supported SAGA help-topic code.", normalized);
    }

    const start = Date.now();
    try {
      const result = await generateModelText({
        model: "vmc/saga-system-help",
        system: SYSTEM_HELP_PROMPT,
        prompt: JSON.stringify({ topic: parsed.data.topic }),
        maxOutputTokens: 650,
      });

      console.info("COGNIX SAGA system help completed", {
        app: normalized.app,
        task: normalized.task,
        requestId: normalized.requestId,
        topic: parsed.data.topic,
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
          "This is general SAGA product guidance only. COGNIX received a fixed help-topic code; no teacher message, class context, or academic records were provided.",
        ],
        usage: result.usage ?? null,
      }, { headers: RESPONSE_HEADERS });
    } catch (error) {
      if (error instanceof ModelNotConfiguredError) {
        return apiError(503, "not_configured", "The SAGA system-help model is not configured. No application records were accessed.", normalized);
      }
      const gatewayStatus = error instanceof ModelGatewayError ? error.status : null;
      console.error("COGNIX SAGA system help failed", {
        app: normalized.app,
        task: normalized.task,
        requestId: normalized.requestId,
        gatewayStatus,
        failureType: error instanceof ModelGatewayError ? "gateway" : "internal",
      });
      return apiError(502, "model_unavailable", "SAGA system guidance could not be generated. No application records were accessed or changed.", normalized, { gatewayStatus });
    }
  }

  return apiError(
    501,
    "capability_not_implemented",
    "This capability is registered but has no execution implementation. No model request or application action was performed.",
    normalized,
  );
}
