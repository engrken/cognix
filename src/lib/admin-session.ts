import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "cognix_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return process.env.COGNIX_ADMIN_SESSION_SECRET?.trim() ?? "";
}

function signature(timestamp: string, secret: string) {
  return createHmac("sha256", secret).update(timestamp).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isAdminConfigured() {
  return Boolean(
    process.env.COGNIX_ADMIN_PASSWORD?.trim() && sessionSecret().length >= 32,
  );
}

export function createAdminSession() {
  const secret = sessionSecret();
  if (!secret || secret.length < 32) throw new Error("Admin session is not configured.");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return `${timestamp}.${signature(timestamp, secret)}`;
}

export function verifyAdminSession(value: string | undefined) {
  const secret = sessionSecret();
  if (!value || secret.length < 32) return false;
  const [timestamp, suppliedSignature, extra] = value.split(".");
  if (!timestamp || !suppliedSignature || extra !== undefined || !/^\d+$/.test(timestamp)) return false;

  const issuedAt = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 60 || now - issuedAt > SESSION_TTL_SECONDS) {
    return false;
  }

  return safeEqual(suppliedSignature, signature(timestamp, secret));
}

export function verifyAdminPassword(candidate: string) {
  const configured = process.env.COGNIX_ADMIN_PASSWORD ?? "";
  if (!configured || !candidate) return false;
  return safeEqual(candidate, configured);
}

export const ADMIN_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
