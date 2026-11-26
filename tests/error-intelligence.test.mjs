import test from "node:test";
import assert from "node:assert/strict";
import { parseErrorEvent } from "../src/lib/error-intelligence.ts";

const validEvent = (overrides = {}) => ({
  schemaVersion: 1,
  eventId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  occurredAt: new Date().toISOString(),
  app: "saga",
  category: "database_unavailable",
  severity: "critical",
  component: "database",
  operationCode: "read",
  httpStatus: 503,
  dependencyCode: "primary_database",
  environment: "production",
  ...overrides,
});

const requestFor = (body, headers = { "content-type": "application/json" }) =>
  new Request("https://cognix.invalid/api/v1/errors", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("accepts a valid allowlisted technical event", async () => {
  const result = await parseErrorEvent(requestFor(validEvent()));
  assert.ok("event" in result);
  assert.equal(result.event.app, "saga");
  assert.equal(result.event.category, "database_unavailable");
});

test("rejects unknown fields and free-form diagnostic content", async () => {
  const result = await parseErrorEvent(requestFor({
    ...validEvent(),
    stack: "private stack trace",
    requestBody: { studentName: "not allowed" },
  }));
  assert.deepEqual(result, { error: "invalid_event" });
});

test("rejects malformed JSON and non-JSON content types", async () => {
  assert.deepEqual(await parseErrorEvent(requestFor("{not-json")), { error: "invalid_json" });
  assert.deepEqual(
    await parseErrorEvent(requestFor("{}", { "content-type": "text/plain" })),
    { error: "invalid_content_type" },
  );
});

test("rejects oversized declared and streamed bodies", async () => {
  assert.deepEqual(
    await parseErrorEvent(requestFor("{}", {
      "content-type": "application/json",
      "content-length": "4097",
    })),
    { error: "payload_too_large" },
  );

  const oversized = JSON.stringify({ ...validEvent(), padding: "x".repeat(5000) });
  assert.deepEqual(await parseErrorEvent(requestFor(oversized)), { error: "payload_too_large" });
});

test("rejects events outside the accepted clock-skew window", async () => {
  const old = new Date(Date.now() - 6 * 60_000).toISOString();
  const future = new Date(Date.now() + 2 * 60_000).toISOString();
  assert.deepEqual(
    await parseErrorEvent(requestFor(validEvent({ occurredAt: old }))),
    { error: "stale_event" },
  );
  assert.deepEqual(
    await parseErrorEvent(requestFor(validEvent({ occurredAt: future }))),
    { error: "stale_event" },
  );
});

test("rejects invalid enum values and malformed event identifiers", async () => {
  assert.deepEqual(
    await parseErrorEvent(requestFor(validEvent({ app: "other-app" }))),
    { error: "invalid_event" },
  );
  assert.deepEqual(
    await parseErrorEvent(requestFor(validEvent({ eventId: "not-a-uuid" }))),
    { error: "invalid_event" },
  );
});
