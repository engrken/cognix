import { BlobNotFoundError, get, head, put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { getMonitorSnapshots, type MonitorSnapshot } from "@/lib/monitor-history";

export type LearningPattern = {
  fingerprint: string;
  application: string;
  applicationId: string;
  signal: "readiness-failure" | "http-failure";
  severity: "degraded" | "unhealthy";
  httpStatusClass: string;
  observations: number;
  firstSeenAt: string;
  lastSeenAt: string;
  latencySamples: number;
  averageLatencyMs: number | null;
  verifiedLearning: VerifiedLearning | null;
};

export type VerifiedLearning = {
  confirmedCause: string;
  resolution: string;
  verifiedAt: string;
  reviewedBy: "authenticated-admin";
  verification: "verified";
};

type LearningDocument = { version: 1; entries: VerifiedLearningEntry[] };
type VerifiedLearningEntry = { fingerprint: string; applicationId: string; learning: VerifiedLearning };

const LEARNING_PATH = "incident-learning/knowledge-v1.json";
const MAX_ENTRIES = 200;
const MAX_NOTE_LENGTH = 500;
const ALLOWED_APPS = new Set(["cognix", "saga", "clear", "roamph"]);

function normalizeNote(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NOTE_LENGTH);
}

function isLearning(value: unknown): value is VerifiedLearningEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<VerifiedLearningEntry>;
  const learning = item.learning as Partial<VerifiedLearning> | undefined;
  return typeof item.fingerprint === "string"
    && /^[a-f0-9]{64}$/.test(item.fingerprint)
    && typeof item.applicationId === "string"
    && ALLOWED_APPS.has(item.applicationId)
    && Boolean(learning)
    && typeof learning?.confirmedCause === "string"
    && learning.confirmedCause.length > 0
    && learning.confirmedCause.length <= MAX_NOTE_LENGTH
    && typeof learning.resolution === "string"
    && learning.resolution.length > 0
    && learning.resolution.length <= MAX_NOTE_LENGTH
    && typeof learning.verifiedAt === "string"
    && Number.isFinite(Date.parse(learning.verifiedAt))
    && learning.reviewedBy === "authenticated-admin"
    && learning.verification === "verified";
}

async function readKnowledge(includeEtag = false): Promise<{ document: LearningDocument; etag: string | null }> {
  let etag: string | null = null;
  if (includeEtag) {
    try { etag = (await head(LEARNING_PATH)).etag; }
    catch (error) { if (!(error instanceof BlobNotFoundError)) throw error; }
  }
  try {
    const result = await get(LEARNING_PATH, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { document: { version: 1, entries: [] }, etag };
    }
    const parsed = JSON.parse(await new Response(result.stream).text()) as Partial<LearningDocument>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries.filter(isLearning).slice(-MAX_ENTRIES) : [];
    return { document: { version: 1, entries }, etag };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { document: { version: 1, entries: [] }, etag };
    throw error;
  }
}

function fingerprintFor(service: MonitorSnapshot["services"][number]) {
  const signal: LearningPattern["signal"] = service.httpStatus !== null && service.httpStatus >= 500
    ? "http-failure"
    : "readiness-failure";
  const statusClass = service.httpStatus === null ? "no-http" : `${Math.floor(service.httpStatus / 100)}xx`;
  const key = [service.id, service.status, signal, statusClass].join("|");
  return { fingerprint: createHash("sha256").update(key).digest("hex"), signal, statusClass };
}

export async function getLearningPatterns(): Promise<{ available: boolean; patterns: LearningPattern[] }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { available: false, patterns: [] };
  const [snapshots, knowledge] = await Promise.all([getMonitorSnapshots(), readKnowledge()]);
  const groups = new Map<string, {
    applicationId: string; application: string; signal: LearningPattern["signal"];
    severity: LearningPattern["severity"]; httpStatusClass: string; observations: number;
    firstSeenAt: string; lastSeenAt: string; latencyTotal: number; latencySamples: number;
  }>();

  for (const snapshot of snapshots) {
    for (const service of snapshot.services) {
      if (service.status === "healthy") continue;
      const identity = fingerprintFor(service);
      const current = groups.get(identity.fingerprint);
      if (current) {
        current.observations += 1;
        current.lastSeenAt = snapshot.checkedAt;
        if (service.latencyMs !== null) {
          current.latencyTotal += service.latencyMs;
          current.latencySamples += 1;
        }
      } else {
        groups.set(identity.fingerprint, {
          applicationId: service.id,
          application: service.name,
          signal: identity.signal,
          severity: service.status,
          httpStatusClass: identity.statusClass,
          observations: 1,
          firstSeenAt: snapshot.checkedAt,
          lastSeenAt: snapshot.checkedAt,
          latencyTotal: service.latencyMs ?? 0,
          latencySamples: service.latencyMs === null ? 0 : 1,
        });
      }
    }
  }

  const saved = new Map(knowledge.document.entries.map((entry) => [
    `${entry.applicationId}:${entry.fingerprint}`,
    entry.learning,
  ]));
  const patterns = [...groups.entries()].map(([fingerprint, group]) => ({
    fingerprint,
    ...group,
    averageLatencyMs: group.latencySamples ? Math.round(group.latencyTotal / group.latencySamples) : null,
    verifiedLearning: saved.get(`${group.applicationId}:${fingerprint}`) ?? null,
  })).sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));

  return { available: true, patterns };
}

export async function saveVerifiedLearning(input: {
  fingerprint: string;
  applicationId: string;
  confirmedCause: unknown;
  resolution: unknown;
}): Promise<VerifiedLearning> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Incident learning storage is not configured.");
  if (!/^[a-f0-9]{64}$/.test(input.fingerprint) || !ALLOWED_APPS.has(input.applicationId)) {
    throw new Error("The incident pattern is invalid.");
  }

  // The fingerprint must still be present in current monitor evidence. This prevents
  // arbitrary records or caller-supplied app identifiers entering shared memory.
  const overview = await getLearningPatterns();
  if (!overview.patterns.some((pattern) => pattern.fingerprint === input.fingerprint && pattern.applicationId === input.applicationId)) {
    throw new Error("The incident pattern is no longer present in monitor history.");
  }

  const confirmedCause = normalizeNote(input.confirmedCause);
  const resolution = normalizeNote(input.resolution);
  if (!confirmedCause || !resolution) throw new Error("A confirmed cause and verified resolution are required.");

  const learning: VerifiedLearning = {
    confirmedCause,
    resolution,
    verifiedAt: new Date().toISOString(),
    reviewedBy: "authenticated-admin",
    verification: "verified",
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const current = await readKnowledge(true);
      const entry = { fingerprint: input.fingerprint, applicationId: input.applicationId, learning };
      const entries = current.document.entries.filter((item) => item.fingerprint !== input.fingerprint);
      entries.push(entry);
      await put(LEARNING_PATH, JSON.stringify({ version: 1, entries: entries.slice(-MAX_ENTRIES) }), {
        access: "private",
        contentType: "application/json",
        cacheControlMaxAge: 0,
        ttlDays: 365,
        allowOverwrite: Boolean(current.etag),
        ...(current.etag ? { ifMatch: current.etag } : {}),
      });
      return learning;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 75 * (2 ** attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to save verified incident learning.");
}
