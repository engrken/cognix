import { BlobNotFoundError, get, head, put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { CognixApplication } from "@/lib/auth";

const STORE_PATH = "error-intelligence/events-v1.json";
const MAX_EVENTS = 1_000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const RATE_WINDOW_MS = 60_000;
const MAX_EVENTS_PER_APP_PER_WINDOW = 30;
const MAX_BODY_BYTES = 4_096;

const EventSchema = z.object({
  schemaVersion: z.literal(1),
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }),
  app: z.enum(["saga", "clear", "roamph"]),
  category: z.enum([
    "application_exception",
    "dependency_timeout",
    "database_unavailable",
    "upstream_failure",
    "authentication_failure",
    "authorization_failure",
    "validation_failure",
    "client_render_failure",
  ]),
  severity: z.enum(["warning", "error", "critical"]),
  component: z.enum(["api", "database", "authentication", "authorization", "storage", "payments", "booking", "grading", "attendance", "reporting", "frontend", "integration", "unknown"]),
  operationCode: z.enum(["create", "read", "update", "delete", "submit", "import", "export", "login", "load", "sync", "upload", "download", "unknown"]).optional(),
  httpStatus: z.number().int().min(400).max(599).optional(),
  dependencyCode: z.enum(["primary_database", "auth_provider", "file_storage", "payment_provider", "external_api"]).optional(),
  environment: z.enum(["production", "staging"]),
  correlationId: z.string().uuid().optional(),
}).strict();

type EventInput = z.infer<typeof EventSchema>;
const StoredEventSchema = z.object({
  eventRef: z.string().regex(/^err_[a-f0-9]{24}$/),
  eventId: z.string().uuid(),
  app: z.enum(["saga", "clear", "roamph"]),
  category: EventSchema.shape.category,
  severity: EventSchema.shape.severity,
  component: EventSchema.shape.component,
  operationCode: EventSchema.shape.operationCode.nullable(),
  httpStatusClass: z.enum(["4xx", "5xx", "none"]),
  dependencyCode: EventSchema.shape.dependencyCode.nullable(),
  environment: EventSchema.shape.environment,
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  occurredAt: z.string().datetime({ offset: true }),
  receivedAt: z.string().datetime({ offset: true }),
}).strict();
const EventDocumentSchema = z.object({
  version: z.literal(1),
  events: z.array(StoredEventSchema).max(MAX_EVENTS),
}).strict();
type StoredEvent = z.infer<typeof StoredEventSchema>;
type EventDocument = z.infer<typeof EventDocumentSchema>;
const MAX_STORE_BYTES = 1_048_576;

export function parseStoredEventDocument(raw: string, now = Date.now()): EventDocument {
  if (new TextEncoder().encode(raw).byteLength > MAX_STORE_BYTES) {
    throw new Error("event_store_too_large");
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("event_store_corrupt");
  }
  const parsed = EventDocumentSchema.safeParse(value);
  if (!parsed.success) throw new Error("event_store_corrupt");
  const cutoff = now - RETENTION_MS;
  return {
    version: 1,
    events: parsed.data.events.filter((event) => Date.parse(event.receivedAt) >= cutoff),
  };
}

async function readBoundedText(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_STORE_BYTES) {
        await reader.cancel();
        throw new Error("event_store_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function fingerprintFor(event: EventInput) {
  const statusClass = event.httpStatus ? `${Math.floor(event.httpStatus / 100)}xx` : "none";
  const normalized = [
    event.app, event.category, event.component, event.operationCode ?? "",
    event.dependencyCode ?? "", statusClass,
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex");
}

async function readStore(includeEtag: boolean) {
  let etag: string | null = null;
  if (includeEtag) {
    try { etag = (await head(STORE_PATH)).etag; }
    catch (error) { if (!(error instanceof BlobNotFoundError)) throw error; }
  }
  try {
    const result = await get(STORE_PATH, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { document: { version: 1 as const, events: [] }, etag };
    }
    const document = parseStoredEventDocument(await readBoundedText(result.stream));
    return { document, etag };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { document: { version: 1 as const, events: [] }, etag };
    throw error;
  }
}

export async function acceptErrorEvent(event: EventInput, app: CognixApplication) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("storage_unavailable");
  const now = Date.now();
  const receivedAt = new Date(now).toISOString();
  const eventRef = `err_${createHash("sha256").update(`${app}:${event.eventId}`).digest("hex").slice(0, 24)}`;
  const fingerprint = fingerprintFor(event);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await readStore(true);
    if (current.document.events.some((item) => item.app === app && item.eventId === event.eventId)) {
      return { eventRef, fingerprint, duplicate: true };
    }
    const recentCount = current.document.events.filter((item) =>
      item.app === app && now - Date.parse(item.receivedAt) < RATE_WINDOW_MS
    ).length;
    if (recentCount >= MAX_EVENTS_PER_APP_PER_WINDOW) throw new Error("rate_limited");

    const stored: StoredEvent = {
      eventRef,
      eventId: event.eventId,
      app,
      category: event.category,
      severity: event.severity,
      component: event.component,
      operationCode: event.operationCode ?? null,
      httpStatusClass: event.httpStatus ? `${Math.floor(event.httpStatus / 100)}xx` : "none",
      dependencyCode: event.dependencyCode ?? null,
      environment: event.environment,
      fingerprint,
      occurredAt: event.occurredAt,
      receivedAt,
    };
    const next = [...current.document.events, stored].slice(-MAX_EVENTS);
    try {
      await put(STORE_PATH, JSON.stringify({ version: 1, events: next }), {
        access: "private",
        contentType: "application/json",
        cacheControlMaxAge: 0,
        ttlDays: 30,
        allowOverwrite: Boolean(current.etag),
        ...(current.etag ? { ifMatch: current.etag } : {}),
      });
      return { eventRef, fingerprint, duplicate: false };
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 40 * (2 ** attempt)));
    }
  }
  throw new Error("storage_unavailable");
}

export async function parseErrorEvent(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return { error: "invalid_content_type" as const };
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_BODY_BYTES)) {
    return { error: "payload_too_large" as const };
  }
  if (!request.body) return { error: "invalid_json" as const };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return { error: "payload_too_large" as const };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = EventSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { error: "invalid_event" as const };
    const age = Date.now() - Date.parse(parsed.data.occurredAt);
    if (age > 5 * 60_000 || age < -60_000) return { error: "stale_event" as const };
    return { event: parsed.data };
  } catch {
    return { error: "invalid_json" as const };
  }
}


export async function getRecentErrorEvents() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { available: false, events: [] as StoredEvent[] };
  const { document } = await readStore(false);
  return { available: true, events: [...document.events].reverse().slice(0, 100) };
}
