export type DatabaseProbeSnapshot = {
  checkedAt: string;
  services: Array<{
    id: string;
    name: string;
    databaseLatencyMs?: number | null;
  }>;
};

export type DatabaseProbeLatencySummary = {
  id: string;
  name: string;
  sampleCount: number;
  latestAt: string;
  latestLatencyMs: number;
  averageLatencyMs: number;
  peakLatencyMs: number;
};

const MAX_DATABASE_LATENCY_MS = 120_000;

function isValidLatency(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= MAX_DATABASE_LATENCY_MS;
}

export function summarizeDatabaseProbeLatency(
  snapshots: DatabaseProbeSnapshot[],
): DatabaseProbeLatencySummary[] {
  const samples = new Map<string, {
    name: string;
    sampleCount: number;
    totalLatencyMs: number;
    latestAt: string;
    latestTimestamp: number;
    latestLatencyMs: number;
    peakLatencyMs: number;
  }>();

  for (const snapshot of snapshots) {
    const timestamp = Date.parse(snapshot.checkedAt);
    if (!Number.isFinite(timestamp)) continue;

    for (const service of snapshot.services) {
      if (!isValidLatency(service.databaseLatencyMs)) continue;

      const current = samples.get(service.id);
      if (!current) {
        samples.set(service.id, {
          name: service.name,
          sampleCount: 1,
          totalLatencyMs: service.databaseLatencyMs,
          latestAt: snapshot.checkedAt,
          latestTimestamp: timestamp,
          latestLatencyMs: service.databaseLatencyMs,
          peakLatencyMs: service.databaseLatencyMs,
        });
        continue;
      }

      current.sampleCount += 1;
      current.totalLatencyMs += service.databaseLatencyMs;
      current.peakLatencyMs = Math.max(current.peakLatencyMs, service.databaseLatencyMs);
      if (timestamp >= current.latestTimestamp) {
        current.latestAt = snapshot.checkedAt;
        current.latestTimestamp = timestamp;
        current.latestLatencyMs = service.databaseLatencyMs;
        current.name = service.name;
      }
    }
  }

  return [...samples.entries()]
    .map(([id, sample]) => ({
      id,
      name: sample.name,
      sampleCount: sample.sampleCount,
      latestAt: sample.latestAt,
      latestLatencyMs: sample.latestLatencyMs,
      averageLatencyMs: Math.round(sample.totalLatencyMs / sample.sampleCount),
      peakLatencyMs: sample.peakLatencyMs,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
