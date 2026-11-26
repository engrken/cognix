# COGNIX Self-Healing Operations Architecture v1

Status: proposed staged architecture. The current receiver and LML foundation remain advisory. This document does not authorize production remediation, application data access, new credentials, or autonomous execution.

## Product direction

COGNIX should progress from incident memory to a governed operations intelligence system that can detect, diagnose, plan a repair, execute an explicitly authorized technical action, verify recovery, and learn from the outcome.

A verified resolution is an important learning signal, not a prerequisite for Cognix to diagnose a new incident or propose a safe next step. Cognix must distinguish a hypothesis, a recommendation, an approved action, an executed action, and a verified recovery.

## Closed-loop lifecycle

1. **Detect** — accept approved health signals and bounded technical error events.
2. **Normalize** — group equivalent events by Cognix-generated fingerprints and time windows.
3. **Diagnose** — produce ranked hypotheses from deterministic rules and evidence. State what is known, what is inferred, and what remains unknown.
4. **Plan** — prepare a remediation plan with prerequisites, expected impact, risk tier, rollback, and verification criteria.
5. **Authorize** — evaluate a static capability registry and the application's own authorization boundary.
6. **Execute** — call only an allowlisted application-owned technical operation. Never run arbitrary shell commands, SQL, generated code, or unrestricted HTTP requests.
7. **Verify** — inspect independent health signals and operation outcome. A successful API response alone is not proof of recovery.
8. **Learn** — record the hypothesis, approved plan, action result, verification evidence, and negative outcomes.

## LML and operations components

- **Knowledge & Experience Engine:** stores sanitized incidents, verified resolutions, runbooks, and failed attempts.
- **Diagnostic Reasoning Engine:** correlates signals and produces evidence-linked candidate causes.
- **Remediation Planning Engine:** proposes bounded actions and explicit verification/rollback plans.
- **Policy & Authorization Engine:** checks app, environment, capability, risk tier, preconditions, approval, and rate limits.
- **Self-Healing Execution Engine:** invokes only registered technical capabilities exposed by the owning application.
- **Recovery Verification Engine:** checks recovery and recurrence using independent health signals.
- **Evaluation Engine:** measures diagnostic precision, false positives, action success, rollback rate, and recurrence.

## Diagnosis contract

Every diagnosis must include:
- Incident fingerprint and affected application.
- Observed evidence and observation window.
- Candidate cause, explicitly labeled as a hypothesis.
- Confidence label with an explanation; no unsupported numeric probability.
- Recommended checks and known limitations.
- Whether a matching resolution is verified, unverified, ineffective, or absent.
- A clear statement that diagnosis did not execute a repair.

The first implementation is deterministic and rule-based. Model-assisted reasoning may be considered later only after redaction, data-boundary, evaluation, and cost controls are in place. A model must never invent evidence or bypass policy.

## Remediation risk tiers

| Tier | Action class | Initial policy |
|---|---|---|
| 0 | Observe, correlate, diagnose, notify | Automatic |
| 1 | Read-only technical checks and runbook guidance | Automatic within allowlist |
| 2 | Reversible, idempotent technical operation with bounded blast radius | Human approval required |
| 3 | Restart, queue replay, credential rotation, deployment, schema change, or broad service mutation | Explicit operator approval and change controls |
| Prohibited | Business-record mutation, permission escalation, payment/booking/grading/attendance changes, arbitrary code/SQL/shell | Never delegated to Cognix |

Autonomous Tier 2 actions are not enabled by this architecture. They may be considered only after measured reliability, per-action threat modeling, kill switches, concurrency controls, and a separate approval.

## Application ownership boundary

- Each application remains authoritative for users, tenants, records, business rules, permissions, and transaction outcomes.
- Cognix must not connect directly to SAGA, CLEAR Sys, or ROAMPH databases.
- Applications expose a static, versioned capability registry through authenticated server-side adapters.
- Each adapter validates the app's own operational preconditions and authorization. Cognix service authentication is not end-user authorization.
- Calls must be idempotent, time-bounded, audited, rate-limited, and safe under retries.
- Cognix cannot send raw commands or arbitrary payloads to an application.

## Self-healing safety requirements

- Prefer reversible actions with explicit preconditions and bounded retry counts.
- Never retry a user-facing transaction unless the owning application proves idempotency and transaction state.
- Require a dry-run/plan stage before any state-changing operation.
- Require human approval for initial remediation releases.
- Record who approved, what capability ran, its version, inputs limited to allowlisted parameters, result, and verification evidence.
- Use a kill switch per application and per capability.
- Stop on ambiguous state, conflicting evidence, repeated failure, or loss of observability.
- Roll back only through an explicit, pre-tested application-owned rollback capability.
- If recovery cannot be independently verified, report unresolved and escalate.

## Delivery sequence

### A — Error intake
- Complete strict authenticated receiver review and synthetic-event tests.
- Provision separate app credentials only after each app adapter review.
- Start with low-volume, best-effort server-side events.

### B — Diagnostic reasoning
- Group incoming events by deterministic fingerprint.
- Add explainable rule-based hypotheses and safe operator checks.
- Correlate only approved technical metadata with existing monitor history.
- Label all diagnoses as hypotheses; no execution.

### C — Remediation planning
- Add a static capability registry and runbook catalog.
- Produce plans containing prerequisites, risk tier, approval requirement, rollback, and verification.
- Keep plans non-executable until separately authorized.

### D — Human-approved technical remediation
- Pilot one low-risk, reversible, idempotent capability in a non-production environment.
- Require explicit operator approval and independent post-action verification.
- Measure success, failure, rollback, and recurrence before expanding.

### E — Selective autonomy
- Consider only proven low-risk capabilities after an extended evaluation period.
- Enable per capability, per application, and per environment.
- Preserve kill switches and operator override.

## Success measures

- Diagnostic precision and proportion of incidents with sufficient evidence.
- Time from event receipt to useful recommendation.
- Human approval rate and action completion rate.
- Verified recovery rate, rollback rate, and recurrence within a defined window.
- False-positive and unsafe-action rate (target: zero unsafe actions).
- No impact on source application transaction success or latency.
