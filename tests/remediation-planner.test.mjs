import test from "node:test";
import assert from "node:assert/strict";
import { createRemediationPlan } from "../src/lib/remediation-planner.ts";

const diagnosis = (overrides = {}) => ({
  fingerprint: "a".repeat(64),
  app: "saga",
  category: "database_unavailable",
  severity: "critical",
  occurrences: 4,
  hypothesis: "The primary database may be unavailable.",
  confidence: "moderate",
  ...overrides,
});

test("creates a bounded read-only-first plan with explicit operator approval", () => {
  const plan = createRemediationPlan(diagnosis());
  assert.equal(plan.status, "advisory_plan_only");
  assert.equal(plan.execution, "not_executable");
  assert.equal(plan.steps[0].risk, "tier1_read_only");
  assert.equal(plan.steps.at(-2).risk, "tier3_operator_approval");
  assert.equal(plan.steps.at(-2).approval, "explicit_operator_approval");
  assert.ok(plan.steps.every((step) => step.execution === "not_executable"));
  assert.ok(plan.steps.every((step) => Array.isArray(step.preconditions) && step.preconditions.length > 0));
  assert.ok(plan.steps.every((step) => Array.isArray(step.verification) && step.verification.length > 0));
});

test("selects category-specific plans without copying untrusted diagnostic checks", () => {
  const plan = createRemediationPlan(diagnosis({
    category: "authorization_failure",
    hypothesis: "A policy may be rejecting the operation.",
    recommendedChecks: ["DROP TABLE users;"],
  }));
  assert.match(plan.steps[0].title, /authorization/i);
  assert.ok(!JSON.stringify(plan).includes("DROP TABLE"));
  assert.ok(JSON.stringify(plan).includes("must not weaken access controls"));
});

test("does not mutate its input", () => {
  const input = diagnosis();
  const before = structuredClone(input);
  createRemediationPlan(input);
  assert.deepEqual(input, before);
});

test("rejects malformed fingerprints and unsupported categories", () => {
  assert.throws(() => createRemediationPlan(diagnosis({ fingerprint: "not-a-hash" })), /fingerprint/);
  assert.throws(() => createRemediationPlan(diagnosis({ category: "unknown" })), /category/);
});

test("does not create autonomous or tier-2 execution steps", () => {
  const plan = createRemediationPlan(diagnosis({ category: "upstream_failure" }));
  assert.ok(plan.steps.every((step) => step.kind !== "execute"));
  assert.ok(plan.steps.every((step) => step.risk !== "tier2_reversible_approval"));
  assert.ok(plan.steps.every((step) => step.execution === "not_executable"));
});
