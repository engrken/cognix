import test from "node:test";
import assert from "node:assert/strict";
import { readDatabaseLatencyMs, readHealthResponse } from "../src/lib/health-payload.ts";

test("accepts only bounded non-negative integer database probe timings", () => {
  assert.equal(readDatabaseLatencyMs({ databaseLatencyMs: 0 }), 0);
  assert.equal(readDatabaseLatencyMs({ databaseLatencyMs: 47 }), 47);
  assert.equal(readDatabaseLatencyMs({ databaseLatencyMs: 120_000 }), 120_000);
  assert.equal(readDatabaseLatencyMs({ databaseLatencyMs: -1 }), null);
  assert.equal(readDatabaseLatencyMs({ databaseLatencyMs: 120_001 }), null);
  assert.equal(readDatabaseLatencyMs({ databaseLatencyMs: 1.5 }), null);
  assert.equal(readDatabaseLatencyMs({ databaseLatencyMs: Number.NaN }), null);
  assert.equal(readDatabaseLatencyMs({ databaseLatencyMs: Number.POSITIVE_INFINITY }), null);
  assert.equal(readDatabaseLatencyMs({ databaseLatencyMs: "47" }), null);
  assert.equal(readDatabaseLatencyMs(null), null);
  assert.equal(readDatabaseLatencyMs([]), null);
});

test("extracts the database probe duration from a JSON 503 response", async () => {
  const response = new Response(JSON.stringify({
    service: "clear-sys",
    status: "degraded",
    database: "unavailable",
    databaseLatencyMs: 5_002,
  }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });

  const result = await readHealthResponse(response);
  assert.equal(result.isJson, true);
  assert.equal(result.payload?.status, "degraded");
  assert.equal(result.databaseLatencyMs, 5_002);
});

test("keeps parsing failures and non-JSON error bodies non-fatal", async (t) => {
  await t.test("malformed JSON", async () => {
    const response = new Response("{not-json", {
      status: 503,
      headers: { "content-type": "application/json" },
    });
    assert.deepEqual(await readHealthResponse(response), {
      isJson: true,
      payload: null,
      databaseLatencyMs: null,
    });
  });

  await t.test("plain text", async () => {
    const response = new Response("service unavailable", {
      status: 503,
      headers: { "content-type": "text/plain" },
    });
    assert.deepEqual(await readHealthResponse(response), {
      isJson: false,
      payload: null,
      databaseLatencyMs: null,
    });
  });
});

test("does not infer database probe duration for apps that omit it", async () => {
  const response = new Response(JSON.stringify({ status: "ok", database: "ok" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  const result = await readHealthResponse(response);
  assert.equal(result.isJson, true);
  assert.equal(result.payload?.status, "ok");
  assert.equal(result.databaseLatencyMs, null);
});
