import test from "node:test";
import assert from "node:assert/strict";
import {
  CLEAR_HEALTH_CHECK_TIMEOUT_MS,
  DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
  getHealthCheckTimeoutMs,
} from "../src/lib/monitor-timeouts.ts";

test("raises only CLEAR health checks to 15 seconds", () => {
  assert.equal(CLEAR_HEALTH_CHECK_TIMEOUT_MS, 15_000);
  assert.equal(getHealthCheckTimeoutMs("clear"), 15_000);
});

test("keeps COGNIX, SAGA, and ROAMPH health checks at 5 seconds", () => {
  assert.equal(DEFAULT_HEALTH_CHECK_TIMEOUT_MS, 5_000);
  assert.equal(getHealthCheckTimeoutMs("cognix"), 5_000);
  assert.equal(getHealthCheckTimeoutMs("saga"), 5_000);
  assert.equal(getHealthCheckTimeoutMs("roamph"), 5_000);
});
