import { timingSafeEqual } from "node:crypto";

export type CognixApplication = "saga" | "clear" | "roamph";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Authenticates a server-to-server request against an application-scoped key.
 * The legacy COGNIX_API_KEY remains a SAGA-only fallback for the existing
 * production integration. It is never accepted for CLEAR or ROAMPH.
 *
 * This service authentication does not replace downstream end-user authorization.
 */
export function hasValidServiceToken(
  request: Request,
  app: CognixApplication,
): boolean {
  const envName = `COGNIX_${app.toUpperCase()}_API_KEY`;
  const appToken = process.env[envName]?.trim();
  const configured =
    appToken || (app === "saga" ? process.env.COGNIX_API_KEY?.trim() : undefined);

  if (!configured) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\\s+(.+)$/i);
  if (!match) return false;

  return safeEqual(match[1], configured);
}
