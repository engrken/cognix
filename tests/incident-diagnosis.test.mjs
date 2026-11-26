import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseErrorEvents } from "../src/lib/incident-diagnosis.ts";
import { createRemediationPlan } from "../src/lib/remediation-planner.ts";

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

test("diagnosis composes into a non-executable, read-only-first remediation plan", () => {
  const diagnosis = diagnoseErrorEvents([event()])[0];
  const plan = createRemediationPlan({
    fingerprint: diagnosis.fingerprint,
    app: diagnosis.app,
    category: diagnosis.category,
    severity: diagnosis.severity,
    occurrences: diagnosis.occurrences,
    hypothesis: diagnosis.hypothesis,
    confidence: diagnosis.confidence,
  });
  assert.equal(plan.execution, "not_executable");
  assert.equal(plan.status, "advisory_plan_only");
  assert.equal(plan.steps[0].risk, "tier1_read_only");
  assert.ok(plan.steps.every((step) => step.execution === "not_executable"));
});
