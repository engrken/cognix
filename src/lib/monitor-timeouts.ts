export type MonitoringTargetId = "cognix" | "saga" | "clear" | "roamph";

export const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 5_000;
export const CLEAR_HEALTH_CHECK_TIMEOUT_MS = 15_000;

export function getHealthCheckTimeoutMs(targetId: MonitoringTargetId): number {
  return targetId === "clear"
    ? CLEAR_HEALTH_CHECK_TIMEOUT_MS
    : DEFAULT_HEALTH_CHECK_TIMEOUT_MS;
}
