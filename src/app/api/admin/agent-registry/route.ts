import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";
import { AGENT_REGISTRY, AGENT_REGISTRY_VERSION } from "@/lib/agent-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, {
      status: 401,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  return NextResponse.json({
    version: AGENT_REGISTRY_VERSION,
    applications: AGENT_REGISTRY.applications,
    agents: AGENT_REGISTRY.agents,
    policy: {
      default: "deny",
      note: "This registry is a reviewed policy inventory. Unknown and disabled capabilities cannot execute.",
    },
  }, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
