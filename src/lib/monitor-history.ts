import { BlobNotFoundError, get, head, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

export type HistoryServiceStatus = "healthy" | "degraded" | "unhealthy";

export type MonitorSnapshot = {
  id: string;
  checkedAt: string;
  source: "dashboard" | "scheduled";
  services: Array<{
    id: string;
    name: string;
    status: HistoryServiceStatus;
    httpStatus: number | null;
    latencyMs: number | null;
  }>;
};

type HistoryDocument = {
  version: 1;
  snapshots: MonitorSnapshot[];
};

export type MonitorIncident = {
  id: string;
  service: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  severity: "degraded" | "unhealthy";
  resolved: boolean;
};

export type MonitorHistory = {
  available: boolean;
  sampleCount: number;
  periodStart: string | null;
  periodEnd: string | null;
  availability: Array<{
    id: string;
    name: string;
    healthyChecks: number;
    totalChecks: number;
    healthyPercent: number | null;
  }>;
  incidents: MonitorIncident[];
};

const HISTORY_PATH = "system-monitor/history.json";
const MAX_SNAPSHOTS = 500;
const RETENTION_DAYS = 90;

function emptyHistory(available = true): MonitorHistory {
  return {
    available,
    sampleCount: 0,
    periodStart: null,
    periodEnd: null,
    availability: [],
    incidents: [],
  };
}

async function readDocument(options: { includeWriteEtag?: boolean } = {}): Promise<{ document: HistoryDocument; etag: string | null }> {
  // For read-modify-write operations, capture the current ETag before reading
  // the content. A concurrent update after this point makes the conditional
  // put fail safely, and the caller retries from a fresh read.
  let etag: string | null = null;
  if (options.includeWriteEtag) {
    try {
      etag = (await head(HISTORY_PATH)).etag;
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) throw error;
    }
  }

  const result = await get(HISTORY_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return { document: { version: 1, snapshots: [] }, etag };
  }

  const raw = await new Response(result.stream).text();
  const parsed = JSON.parse(raw) as Partial<HistoryDocument>;
  const snapshots = Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
  return {
    document: { version: 1, snapshots: snapshots.filter(isSnapshot).slice(-MAX_SNAPSHOTS) },
    etag,
  };
}

export async function getMonitorSnapshots(): Promise<MonitorSnapshot[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  try {
    const { document } = await readDocument();
    return [...document.snapshots].sort(
      (a, b) => Date.parse(a.checkedAt) - Date.parse(b.checkedAt),
    );
  } catch (error) {
    // An empty history is a valid first-run state for the learning layer.
    // Preserve all other storage and parsing errors for operational visibility.
    if (error instanceof BlobNotFoundError) return [];
    throw error;
  }
}

function isSnapshot(value: unknown): value is MonitorSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<MonitorSnapshot>;
  return typeof snapshot.id === "string"
    && typeof snapshot.checkedAt === "string"
    && (snapshot.source === "dashboard" || snapshot.source === "scheduled")
    && Array.isArray(snapshot.services);
}

export async function recordMonitorSnapshot(
  status: {
    checkedAt: string;
    services: Array<{
      id: string;
      name: string;
      status: HistoryServiceStatus;
      httpStatus: number | null;
      latencyMs: number | null;
    }>;
  },
  source: "dashboard" | "scheduled",
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Monitor history storage is not configured.");
  }

  const snapshot: MonitorSnapshot = {
    id: randomUUID(),
    checkedAt: status.checkedAt,
    source,
    services: status.services.map(({ id, name, status: serviceStatus, httpStatus, latencyMs }) => ({
      id,
      name,
      status: serviceStatus,
      httpStatus,
      latencyMs,
    })),
  };

  // Conditional writes prevent simultaneous checks from silently overwriting
  // one another. The stable snapshot ID also makes retries idempotent.
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const current = await readDocument({ includeWriteEtag: true });
      const alreadyRecorded = current.document.snapshots.some((item) => item.id === snapshot.id);
      const next: HistoryDocument = {
        version: 1,
        snapshots: (alreadyRecorded
          ? current.document.snapshots
          : [...current.document.snapshots, snapshot]).slice(-MAX_SNAPSHOTS),
      };

      if (!alreadyRecorded) {
        await put(HISTORY_PATH, JSON.stringify(next), {
          access: "private",
          contentType: "application/json",
          cacheControlMaxAge: 60,
          ttlDays: RETENTION_DAYS,
          allowOverwrite: Boolean(current.etag),
          ...(current.etag ? { ifMatch: current.etag } : {}),
        });
      }
      return;
    } catch (error) {
      lastError = error;
      // Let concurrent writers finish, then re-read the newest ETag before retrying.
      if (attempt < 5) {
        const backoffMs = 50 * (2 ** attempt) + Math.floor(Math.random() * 50);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to persist monitor history.");
}

export async function getMonitorHistory(): Promise<MonitorHistory> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return emptyHistory(false);

  const { document } = await readDocument();
  const snapshots = [...document.snapshots].sort(
    (a, b) => Date.parse(a.checkedAt) - Date.parse(b.checkedAt),
  );
  if (snapshots.length === 0) return emptyHistory();

  const serviceMap = new Map<string, { name: string; healthy: number; total: number }>();
  const activeIncidents = new Map<string, MonitorIncident>();
  const incidents: MonitorIncident[] = [];

  for (const snapshot of snapshots) {
    for (const service of snapshot.services) {
      const stats = serviceMap.get(service.id) ?? { name: service.name, healthy: 0, total: 0 };
      stats.total += 1;
      if (service.status === "healthy") stats.healthy += 1;
      serviceMap.set(service.id, stats);

      const active = activeIncidents.get(service.id);
      if (service.status !== "healthy") {
        if (!active) {
          activeIncidents.set(service.id, {
            id: `${service.id}:${snapshot.id}`,
            service: service.name,
            startedAt: snapshot.checkedAt,
            endedAt: null,
            durationMs: null,
            severity: service.status,
            resolved: false,
          });
        } else if (service.status === "unhealthy") {
          active.severity = "unhealthy";
        }
      } else if (active) {
        const endedAt = snapshot.checkedAt;
        incidents.push({
          ...active,
          endedAt,
          durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(active.startedAt)),
          resolved: true,
        });
        activeIncidents.delete(service.id);
      }
    }
  }

  incidents.push(...activeIncidents.values());
  incidents.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  return {
    available: true,
    sampleCount: snapshots.length,
    periodStart: snapshots[0].checkedAt,
    periodEnd: snapshots[snapshots.length - 1].checkedAt,
    availability: [...serviceMap.entries()].map(([id, stats]) => ({
      id,
      name: stats.name,
      healthyChecks: stats.healthy,
      totalChecks: stats.total,
      healthyPercent: stats.total ? Math.round((stats.healthy / stats.total) * 1000) / 10 : null,
    })),
    incidents: incidents.slice(0, 20),
  };
}
