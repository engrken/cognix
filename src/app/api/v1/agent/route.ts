import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidServiceToken } from "@/lib/auth";

export const runtime = "nodejs";

const AgentRequestSchema = z.object({
  app: z.enum(["saga", "clear", "roamph"]),
  task: z.string().trim().min(1).max(4_000),
  context: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().trim().min(1).max(128).optional(),
});

export async function POST(request: Request) {
  if (!hasValidServiceToken(request)) {
    return NextResponse.json(
      { error: "unauthorized", message: "A valid service token is required." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = AgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_request",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // Fail closed until app authorization, read-only tools, and model budgets exist.
  return NextResponse.json(
    {
      error: "not_configured",
      message: "The COGNIX agent runtime is not enabled yet.",
      app: parsed.data.app,
      requestId: parsed.data.requestId ?? null,
    },
    { status: 503 },
  );
}
