import { getMonitorHistory, recordMonitorSnapshot, type MonitorHistory } from "@/lib/monitor-history";
import { readHealthResponse } from "@/lib/health-payload";
import { getHealthCheckTimeoutMs } from "@/lib/monitor-timeouts";

export type MonitorResult = {
  id: string;
  name: string;
  endpoint: string;
  status: "healthy" | "degraded" | "unhealthy";
  httpStatus: number | null;
  latencyMs: number | null;
  databaseLatencyMs: number | null;
  detail: string;
};

const TARGETS = [
  { id: "cognix", name: "COGNIX", url: "https://cognixph.vercel.app/api/health", endpoint: "/api/health" },
  { id: "saga", name: "SAGA", url: "https://mysaga.vercel.app/api/health", endpoint: "/api/health" },
  { id: "clear", name: "CLEAR Sys", url: "https://clearsys.vercel.app/api/health", endpoint: "/api/health" },
  { id: "roamph", name: "ROAMPH", url: "https://roamph.vercel.app/api/health", endpoint: "/api/health" },
] as const;

async function checkTarget(target: (typeof TARGETS)[number]): Promise<MonitorResult> {
  const startedAt = Date.now();
  const timeoutMs = getHealthCheckTimeoutMs(target.id);
  try {
    const response = await fetch(target.url, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "COGNIX-System-Monitor/1.0" },
    });
    const latencyMs = Date.now() - startedAt;
    // Read the response body once regardless of HTTP status. CLEAR's 503
    // health payload can still provide the safe database probe duration.
    const { isJson, payload, databaseLatencyMs } = await readHealthResponse(response);

    if (response.status >= 200 && response.status < 300) {
      if (!isJson) {
        return { id: target.id, name: target.name, endpoint: target.endpoint, status: "degraded", httpStatus: response.status, latencyMs, databaseLatencyMs, detail: "Health endpoint returned an unexpected response format." };
      }

      if (!payload) {
        return { id: target.id, name: target.name, endpoint: target.endpoint, status: "degraded", httpStatus: response.status, latencyMs, databaseLatencyMs, detail: "Health endpoint returned an invalid readiness response." };
      }

      const declaredStatus = typeof payload.status === "string" ? payload.status.toLowerCase() : null;
      const databaseStatus = typeof payload.database === "string" ? payload.database.toLowerCase() : null;
      const acceptedStatuses = target.id === "cognix" ? ["ok", "healthy", "foundation"] : ["ok", "healthy"];

      if (declaredStatus === "unhealthy" || databaseStatus === "unavailable") {
        return { id: target.id, name: target.name, endpoint: target.endpoint, status: "unhealthy", httpStatus: response.status, latencyMs, databaseLatencyMs, detail: "The application reports an unavailable dependency." };
      }
      if (declaredStatus === "degraded") {
        return { id: target.id, name: target.name, endpoint: target.endpoint, status: "degraded", httpStatus: response.status, latencyMs, databaseLatencyMs, detail: "The application reports degraded readiness." };
      }
      if (!declaredStatus || !acceptedStatuses.includes(declaredStatus)) {
        return { id: target.id, name: target.name, endpoint: target.endpoint, status: "degraded", httpStatus: response.status, latencyMs, databaseLatencyMs, detail: "Health endpoint returned an unrecognized readiness status." };
      }
      if (target.id !== "cognix" && !databaseStatus) {
        return { id: target.id, name: target.name, endpoint: target.endpoint, status: "degraded", httpStatus: response.status, latencyMs, databaseLatencyMs, detail: "The application did not report its database readiness." };
      }
      if (databaseStatus && !["ok", "healthy", "reachable"].includes(databaseStatus)) {
        return { id: target.id, name: target.name, endpoint: target.endpoint, status: "unhealthy", httpStatus: response.status, latencyMs, databaseLatencyMs, detail: "The application database readiness check did not pass." };
      }

      const detail = databaseStatus
        ? "Application and database connectivity checks passed."
        : "Application readiness endpoint responded successfully.";
      return { id: target.id, name: target.name, endpoint: target.endpoint, status: "healthy", httpStatus: response.status, latencyMs, databaseLatencyMs, detail };
    }
    if (response.status >= 300 && response.status < 400) {
      return { id: target.id, name: target.name, endpoint: target.endpoint, status: "degraded", httpStatus: response.status, latencyMs, databaseLatencyMs, detail: "Health endpoint redirected; availability needs review." };
    }
    return { id: target.id, name: target.name, endpoint: target.endpoint, status: "unhealthy", httpStatus: response.status, latencyMs, databaseLatencyMs, detail: "Endpoint returned an unsuccessful HTTP status." };
  } catch {
    return { id: target.id, name: target.name, endpoint: target.endpoint, status: "unhealthy", httpStatus: null, latencyMs: Date.now() - startedAt, databaseLatencyMs: null, detail: "Endpoint could not be reached before the timeout." };
  }
}

export async function getSystemStatus(source: "dashboard" | "scheduled" = "dashboard", options: { persist?: boolean } = {}) {
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
        ? "Check the deployment and application logs, then verify the health endpoint and its dependency checks."
        : "Review the application's readiness response and confirm its health endpoint contract.",
    }));

  let history: MonitorHistory = {
    available: false,
    sampleCount: 0,
    periodStart: null,
    periodEnd: null,
    availability: [],
    databaseProbeLatency: [],
    incidents: [],
  };
  let historyWriteSucceeded = false;
  try {
    if (options.persist !== false) {
      await recordMonitorSnapshot({ checkedAt, services }, source);
      historyWriteSucceeded = true;
      console.info("COGNIX monitor snapshot persisted", { source, checkedAt });
    }
    history = await getMonitorHistory();
  } catch (error) {
    // Log only allow-listed error metadata; never emit tokens, URLs, request bodies, or raw messages.
    const candidate = error && typeof error === "object"
      ? error as { name?: unknown; code?: unknown; status?: unknown; statusCode?: unknown }
      : {};
    const errorCode = typeof candidate.code === "string" && /^[A-Z0-9_]{1,40}$/i.test(candidate.code)
      ? candidate.code
      : null;
    const httpStatus = typeof candidate.status === "number"
      ? candidate.status
      : typeof candidate.statusCode === "number"
        ? candidate.statusCode
        : null;
    console.error("COGNIX monitor snapshot persistence failed", {
      source,
      checkedAt,
      errorName: typeof candidate.name === "string" ? candidate.name.slice(0, 60) : "UnknownError",
      errorCode,
      httpStatus,
      // Capture a short, redacted provider message so storage failures can be diagnosed.
      errorMessage: error instanceof Error
        ? error.message
            .replace(/(bearer\s+)[^\s]+/gi, "$1[REDACTED]")
            .replace(/(token|secret|authorization)(\s*[:=]\s*)[^\s,;]+/gi, "$1$2[REDACTED]")
            .replace(/https?:\/\/[^\s]+/gi, "[URL]")
            .slice(0, 160)
        : "Unknown persistence error",
    });

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
    historyWriteSucceeded,
    scope: "HTTP readiness checks and a minimal database connectivity probe where configured; no application tables, user records, or secrets are read.",
  };
}
