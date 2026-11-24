import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Authenticates a server-to-server request.
 * This does not replace downstream end-user authorization.
 */
export function hasValidServiceToken(request: Request): boolean {
  const configured = process.env.COGNIX_API_KEY;
  if (!configured) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return safeEqual(match[1], configured);
}
