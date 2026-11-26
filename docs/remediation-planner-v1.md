# Cognix Remediation Planner v1

## Purpose

The remediation planner converts a validated deterministic diagnosis into a bounded, reviewable advisory plan. It is a planning artifact only: it cannot invoke tools, call application APIs, execute commands, mutate state, or authorize a repair.

## Flow

1. Read-only observations gather provider health, aggregate technical metrics, release metadata, and sanitized status classes.
2. The application owner reviews evidence and decides whether a separately governed recovery action is justified.
3. If evidence is ambiguous or recovery is not independently verified, stop and escalate.

## Plan contract

Each plan contains the incident fingerprint, app, severity, diagnosis hypothesis and confidence, a fixed category-specific sequence of steps, risk classification, approval requirement, preconditions, verification criteria, and rollback guidance.

- Tier 1 steps are read-only observations.
- A possible operator-led recovery is represented only as a Tier 3 approval-gated decision. Cognix does not perform it.
- There are no Tier 2 actions in v1.
- Every step and plan is marked `not_executable`.

## Safety boundaries

- Only static, reviewed templates are emitted. Free-form diagnostic checks and model-generated text are not copied into plans.
- No arbitrary shell, SQL, code, HTTP request, restart, deployment, queue replay, credential rotation, or database operation.
- No direct application database access and no business-record mutation.
- SAGA, CLEAR Sys, and ROAMPH remain authoritative for their own data, permissions, and business rules.
- A hypothesis is not a verified root cause. The owning application must independently verify recovery.
- Any future execution capability requires a separate allowlisted adapter, explicit authorization, idempotency, audit, rate limits, kill switch, bounded retries, and a tested rollback path.

## Validation

Synthetic Node tests cover category-specific planning, strict fingerprint/category validation, input immutability, safe handling of untrusted extra fields, approval requirements, and non-executable output. Tests do not call external services or AI providers.
