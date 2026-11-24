import { getMonitorHistory, recordMonitorSnapshot, type MonitorHistory } from "@/lib/monitor-history";

export type MonitorResult = {
  id: string;
  name: string;
  endpoint: string;
  status: "healthy" | "degraded" | "unhealthy";
  httpStatus: number | null;
  latencyMs: number | null;
  detail: string;
};

const TARGETS = [
  { id: "cognix", name: "COGNIX", url: "https://cognixph.vercel.app/api/health", endpoint: "/api/health" },
  { id: "saga", name: "SAGA", url: "https://mysaga.vercel.app/", endpoint: "/" },
  { id: "clear", name: "CLEAR Sys", url: "https://clearsys.vercel.app/", endpoint: "/" },
  { id: "roamph", name: "ROAMPH", url: "https://roamph.vercel.app/api/health", endpoint: "/api/health" },
] as const;

const CHECK_TIMEOUT_MS = 5_000;

async function checkTarget(target: (typeof TARGETS)[number]): Promise<MonitorResult> {
  const startedAt = Date.now();
  try {
    const response = await fetch(target.url, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      headers: { "User-Agent": "COGNIX-System-Monitor/1.0" },
    });
    const latencyMs = Date.now() - startedAt;
    if (response.status >= 200 && response.status < 300) {
      return { id: target.id, name: target.name, endpoint: target.endpoint, status: "healthy", httpStatus: response.status, latencyMs, detail: "Endpoint responded successfully." };
    }
    if (response.status >= 300 && response.status < 400) {
      return { id: target.id, name: target.name, endpoint: target.endpoint, status: "degraded", httpStatus: response.status, latencyMs, detail: "Endpoint redirected; availability needs review." };
    }
    return { id: target.id, name: target.name, endpoint: target.endpoint, status: "unhealthy", httpStatus: response.status, latencyMs, detail: "Endpoint returned an unsuccessful HTTP status." };
  } catch {
    return { id: target.id, name: target.name, endpoint: target.endpoint, status: "unhealthy", httpStatus: null, latencyMs: Date.now() - startedAt, detail: "Endpoint could not be reached before the timeout." };
  }
}

export async function getSystemStatus(source: "dashboard" | "scheduled" = "dashboard") {
  const checkedAt = new Date().toISOString();
  const services = await Promise.all(TARGETS.map(checkTarget));
  const unhealthy = services.filter((service) => service.status === "unhealthy").length;
  const degraded = services.filter((service) => service.status === "degraded").length;
  const overall = unhealthy > 0 ? "attention" : degraded > 0 ? "degraded" : "operational";

  const recommendations = services
    .filter((service) => service.status !== "healthy")
    .map((service) => ({
      service: service.name,
      priority: service.status === "unhealthy" ? "high" as const : "medium" as const,
      action: service.status === "unhealthy"
        ? "Check the deployment and application logs, then verify the health endpoint."
        : "Review the endpoint redirect and confirm the intended sign-in behavior.",
    }));

  let history: MonitorHistory = {
    available: false,
    sampleCount: 0,
    periodStart: null,
    periodEnd: null,
    availability: [],
    incidents: [],
  };
  try {
    await recordMonitorSnapshot({ checkedAt, services }, source);
    history = await getMonitorHistory();
  } catch {
    // Keep the live health check available even if history storage is temporarily unavailable.
    try {
      history = await getMonitorHistory();
    } catch {
      // The dashboard reports history as unavailable without exposing storage details.
    }
  }

  return {
    checkedAt,
    overall,
    summary: { total: services.length, healthy: services.length - unhealthy - degraded, degraded, unhealthy },
    services,
    recommendations,
    history,
    scope: "HTTP availability only; no database contents, user records, or application secrets are accessed.",
  };
}
