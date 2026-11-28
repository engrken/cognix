import test from "node:test";
import assert from "node:assert/strict";
import { summarizeDatabaseProbeLatency } from "../src/lib/health-probe-history.ts";

test("summarizes latest, average, peak, and count for each service", () => {
  const result = summarizeDatabaseProbeLatency([
    {
      checkedAt: "2026-11-28T01:00:00.000Z",
      services: [
        { id: "clear", name: "CLEAR Sys", databaseLatencyMs: 40 },
        { id: "saga", name: "SAGA", databaseLatencyMs: 10 },
      ],
    },
    {
      checkedAt: "2026-11-28T01:05:00.000Z",
      services: [
        { id: "clear", name: "CLEAR Sys", databaseLatencyMs: 5_002 },
        { id: "saga", name: "SAGA", databaseLatencyMs: null },
      ],
    },
    {
      checkedAt: "2026-11-28T01:10:00.000Z",
      services: [
        { id: "clear", name: "CLEAR Sys", databaseLatencyMs: 58 },
      ],
    },
  ]);

  assert.deepEqual(result, [
    {
      id: "clear",
      name: "CLEAR Sys",
      sampleCount: 3,
      latestAt: "2026-11-28T01:10:00.000Z",
      latestLatencyMs: 58,
      averageLatencyMs: 1_700,
      peakLatencyMs: 5_002,
    },
    {
      id: "saga",
      name: "SAGA",
      sampleCount: 1,
      latestAt: "2026-11-28T01:00:00.000Z",
      latestLatencyMs: 10,
      averageLatencyMs: 10,
      peakLatencyMs: 10,
    },
  ]);
});

test("ignores missing, malformed, negative, fractional, and out-of-range samples", () => {
  const result = summarizeDatabaseProbeLatency([
    {
      checkedAt: "2026-11-28T01:00:00.000Z",
      services: [
        { id: "clear", name: "CLEAR Sys", databaseLatencyMs: null },
        { id: "saga", name: "SAGA", databaseLatencyMs: -1 },
      ],
    },
    {
      checkedAt: "2026-11-28T01:01:00.000Z",
      services: [
        { id: "clear", name: "CLEAR Sys", databaseLatencyMs: 1.5 },
        { id: "saga", name: "SAGA", databaseLatencyMs: 120_001 },
      ],
    },
    {
      checkedAt: "not-a-date",
      services: [
        { id: "roamph", name: "ROAMPH", databaseLatencyMs: 50 },
      ],
    },
  ]);

  assert.deepEqual(result, []);
});

test("finds latest sample correctly even when snapshots arrive out of order", () => {
  const result = summarizeDatabaseProbeLatency([
    {
      checkedAt: "2026-11-28T01:10:00.000Z",
      services: [{ id: "clear", name: "CLEAR Sys", databaseLatencyMs: 100 }],
    },
    {
      checkedAt: "2026-11-28T01:00:00.000Z",
      services: [{ id: "clear", name: "CLEAR Sys", databaseLatencyMs: 20 }],
    },
  ]);

  assert.equal(result[0].latestAt, "2026-11-28T01:10:00.000Z");
  assert.equal(result[0].latestLatencyMs, 100);
  assert.equal(result[0].averageLatencyMs, 60);
  assert.equal(result[0].peakLatencyMs, 100);
});
