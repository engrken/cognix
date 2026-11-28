export type ReadinessPayload = Record<string, unknown>;

const MAX_DATABASE_LATENCY_MS = 120_000;

export function asReadinessPayload(value: unknown): ReadinessPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as ReadinessPayload;
}

/**
 * Accepts only a finite, non-negative integer within the monitor's diagnostic
 * bound. Health responses are untrusted input even when they come from our apps.
 */
export function readDatabaseLatencyMs(value: unknown): number | null {
  const payload = asReadinessPayload(value);
  const latency = payload?.databaseLatencyMs;

  return typeof latency === "number"
    && Number.isSafeInteger(latency)
    && latency >= 0
    && latency <= MAX_DATABASE_LATENCY_MS
    ? latency
    : null;
}
