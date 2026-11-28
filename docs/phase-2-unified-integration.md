# Phase 2 — Unified Application Integration

Status: implementation candidate; not yet merged or deployed.

## Scope

Phase 2 advances the original Cognix unified integration architecture and incorporates LML as a cross-platform operational capability.

### Cognix platform delivery
- Versioned server-to-server technical error event contract.
- Per-application service-token validation; legacy SAGA fallback remains SAGA-only.
- Strict allowlisted event schema, bounded request body, event-age validation, idempotency, rate limits, private retention-limited storage.
- Sanitized admin incident workspace.
- Deterministic fingerprint grouping and diagnosis with conservative confidence.
- Category-specific read-only-first remediation plans; every step is explicitly non-executable.
- AI advisor interface is present but disabled by default; dashboard makes no provider calls.

### Application integration status
- SAGA: existing fixed-topic system-help integration remains the only enabled Cognix application capability. Error-event adapter delivery is not yet enabled.
- CLEAR Sys: not connected; no service credential or adapter is configured.
- ROAMPH: not connected; no service credential or adapter is configured.

## Security and data boundaries

- No direct Cognix connection to application databases.
- No user, tenant, student, teacher, customer, booking, payment, financial, academic, or uploaded content in incident events.
- No raw request/response bodies, stack traces, exception messages, URLs, secrets, tokens, IP addresses, or personal identifiers.
- Application-owned adapters must enforce redaction before outbound delivery.
- Service authentication identifies the calling app; it does not grant or replace end-user authorization.
- Unknown fields and unregistered capabilities fail closed.
- Event delivery must be best-effort and must not change the source application's transaction result.

## Explicit non-goals

- No autonomous remediation, business-record mutation, permission changes, transaction replay, arbitrary shell, SQL, generated code, or unrestricted HTTP.
- No AI provider calls, API credentials, environment-variable changes, database migrations, or new app service credentials in this foundation.
- No increase in monitoring frequency or preview deployments.

## Phase acceptance gate

1. Full typecheck, lint, receiver tests, diagnostic tests, advisor tests, planner tests, and production build pass together.
2. Authentication, app isolation, schema strictness, bounded payload handling, idempotency, rate limiting, retention, and storage-failure behavior receive code review.
3. Admin diagnosis remains read-only and explicitly distinguishes hypothesis from verified cause.
4. Remediation plans remain non-executable and require application-owner review.
5. SAGA, CLEAR Sys, and ROAMPH adapters are not enabled until their own integration changes and credential boundaries are reviewed.
6. No production deploy occurs until the complete phase passes its gate and the operator approves the release.

## Follow-on work within Phase 2

- Review and implement source-app event adapters in coordinated SAGA, CLEAR Sys, and ROAMPH changes.
- Add structured redacted integration-delivery audit status.
- Complete SAGA end-to-end verification.
- Add dedicated credentials only when the owning app's deployment configuration is approved.
