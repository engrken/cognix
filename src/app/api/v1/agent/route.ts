import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidServiceToken } from "@/lib/auth";
import {
  generateModelText,
  ModelNotConfiguredError,
} from "@/lib/ai/model";

export const runtime = "nodejs";

const SAGA_TASK =
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

const AgentRequestSchema = z.object({
  app: z.literal("saga"),
  task: z.literal(SAGA_TASK),
  context: SummarySchema,
  requestId: z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9._:-]+$/).optional(),
}).strict();

const SYSTEM_PROMPT = [
  "You are COGNIX, an assistant for the SAGA academic portal.",
  "Write a concise, practical teacher-facing overview using only the supplied aggregate counts.",
  "Do not calculate grades, infer student performance, identify students, invent causes, or suggest changing grades or academic records.",
  "State that enrollment records are subject-subject enrollment counts and may count one learner more than once.",
  "Describe the reporting period and summarize workload, upcoming assessments, and grade workflow counts.",
  "If a count is zero, state it neutrally. Do not imply a problem or success without evidence.",
  "Use plain language and short bullets. Do not claim to have taken any action.",
].join(" ");

export async function POST(request: Request) {
  if (!hasValidServiceToken(request)) {
    return NextResponse.json(
      { error: "unauthorized", message: "A valid service token is required." },
      { status: 401 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 16_384) {
    return NextResponse.json(
      { error: "payload_too_large", message: "Request body exceeds the allowed size." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 16_384) {
      return NextResponse.json(
        { error: "payload_too_large", message: "Request body exceeds the allowed size." },
        { status: 413 },
      );
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = AgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", message: "The SAGA summary request is invalid." },
      { status: 400 },
    );
  }

  try {
    const result = await generateModelText({
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(parsed.data.context),
      maxOutputTokens: 512,
    });

    return NextResponse.json({
      app: "saga",
      requestId: parsed.data.requestId ?? null,
      summary: result.text,
      usage: result.usage ?? null,
    });
  } catch (error) {
    if (error instanceof ModelNotConfiguredError) {
      return NextResponse.json(
        {
          error: "not_configured",
          message: "COGNIX model inference is not enabled. No model request was made.",
          app: "saga",
          requestId: parsed.data.requestId ?? null,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: "model_unavailable",
        message: "COGNIX could not complete the summary. No SAGA records were changed.",
        app: "saga",
        requestId: parsed.data.requestId ?? null,
      },
      { status: 502 },
    );
  }
}
