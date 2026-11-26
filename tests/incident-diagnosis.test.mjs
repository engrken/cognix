import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseErrorEvents } from "../src/lib/incident-diagnosis.ts";
import { buildIncidentIntelligence } from "../src/lib/incident-intelligence.ts";

const event = (overrides = {}) => ({
  fingerprint: "a".repeat(64), app: "saga", category: "database_unavailable",
  severity: "critical", component: "database", dependencyCode: "primary_database",
  httpStatusClass: "5xx", occurredAt: "2026-11-26T12:00:00.000Z", ...overrides,
});

test("groups repeated events and assigns conservative confidence", () => {
  const results = diagnoseErrorEvents([event(), event({ occurredAt: "2026-11-26T12:01:00.000Z" }), event({ occurredAt: "2026-11-26T12:02:00.000Z" })]);
  assert.equal(results.length, 1);
  assert.equal(results[0].occurrences, 3);
  assert.equal(results[0].confidence, "moderate");
  assert.equal(results[0].execution, "manual_review_only");
});

test("keeps sparse and generic evidence at low confidence", () => {
  const results = diagnoseErrorEvents([event({ category: "application_exception", component: "unknown" })]);
  assert.equal(results[0].confidence, "low");
  assert.equal(results[0].execution, "manual_review_only");
});

test("composes diagnosis into a non-executable, read-only-first plan", () => {
  const results = buildIncidentIntelligence([event()]);
  assert.equal(results.length, 1);
  assert.equal(results[0].plan.execution, "not_executable");
  assert.equal(results[0].plan.status, "advisory_plan_only");
  assert.equal(results[0].plan.steps[0].risk, "tier1_read_only");
  assert.ok(results[0].plan.steps.every((step) => step.execution === "not_executable"));
});
