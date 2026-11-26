# COGNIX v1 application integration contract

Status: contract definition only. This document does not activate an application capability or authorize transfer of application data.

## Ownership and trust boundaries

- SAGA, CLEAR Sys, and ROAMPH remain the systems of record for their own users, tenants, records, permissions, calculations, and business rules.
- COGNIX does not connect directly to application databases.
- A service token authenticates an application server. It does not authenticate or authorize the end user.
- Each application must authenticate the current user and enforce its own role, tenant, school, and record-level access before calling COGNIX.
- Default policy is deny. An unknown, disabled, or planned task must not reach a model or cause an application action.

## Transport

- Method: `POST`
- Path: `/api/v1/agent`
- Content type: `application/json`
- Authentication: `Authorization: Bearer <application-specific-secret>`
- Request body maximum: 8 KiB
- Responses: `Cache-Control: no-store`; no response should be cached by clients or intermediaries.
- Use TLS only. Never put credentials in URLs, browser code, logs, analytics, or error messages.

## Application-specific credentials

Configure independent server-only secrets in each application and the corresponding COGNIX deployment:

| Application | Secret name |
|---|---|
| SAGA | `COGNIX_SAGA_API_KEY` |
| CLEAR Sys | `COGNIX_CLEAR_API_KEY` |
| ROAMPH | `COGNIX_ROAMPH_API_KEY` |

The legacy `COGNIX_API_KEY` is accepted only as a SAGA compatibility fallback. It must not be reused for CLEAR Sys or ROAMPH. Secrets must be generated independently, rotated through coordinated deployment, and never exposed to client-side bundles.

## Version 1 request envelope

```json
{
  "apiVersion": "1",
  "app": "clear",
  "task": "management-assistance",
  "input": {},
  "requestId": "clear-opaque-request-id"
}
```

- `app` must match the calling application identity: `saga`, `clear`, or `roamph`.
- `task` must be a registered capability identifier.
- `input` must contain only fields explicitly approved for that capability. Do not send raw database rows, free-form user prompts, credentials, direct identifiers, payment details, student records, or uploaded documents by default.
- `requestId` should be an opaque, non-sensitive correlation identifier. Do not encode names, emails, booking references, student numbers, or tenant identifiers in it.
- The current API accepts the envelope but only executes capabilities whose registry state and model-access policy are both enabled and have an implementation.

## Current capability status

| Application | Capability | Status | Data boundary |
|---|---|---|---|
| SAGA | `system-help` | Enabled | Fixed allowlisted topic code only |
| SAGA | `teacher-summary` | Disabled | No academic records or teacher aggregates |
| SAGA | `learning-resource` | Disabled/retired | No model call |
| CLEAR Sys | `management-assistance` | Planned | No management or financial data transfer |
| ROAMPH | `fleet-assistance` | Planned | No customer, booking, rental, or payment data transfer |

A capability is not enabled by supplying a credential. Enabling requires an explicit registry change, a reviewed data contract, tests, and a deployment approval.

## Response handling

Successful requests return `status: "completed"`, the same application/task/request identifiers, and the capability result. Clients must treat the answer as advisory text unless a future, separately reviewed structured-output contract says otherwise.

Expected errors include:

| HTTP | Error | Client behavior |
|---|---|---|
| 400 | `invalid_json`, `invalid_request`, `invalid_input` | Correct the request; do not retry unchanged |
| 401 | `unauthorized` | Stop; verify server-side credential configuration |
| 403 | `capability_disabled` | Do not retry or bypass policy |
| 413 | `payload_too_large` | Reduce the approved payload |
| 501 | `capability_not_enabled`, `capability_not_implemented` | Treat as unavailable; do not fall back to another task |
| 502/503 | `model_unavailable`, `not_configured` | Show a safe fallback; retry only with bounded backoff |

Clients must not interpret a model response as authorization to change a record. Any future write operation requires a separate application-owned endpoint, end-user authorization, explicit confirmation, idempotency, audit logging, and an independently reviewed capability.

## Audit and privacy requirements before enabling CLEAR Sys or ROAMPH

1. Document a specific user benefit and permitted purpose for each proposed capability.
2. Define a field-level allowlist, data classification, retention, and provider processing review.
3. Prove tenant/role/record authorization remains enforced inside the source application.
4. Add tests for wrong application tokens, missing tokens, disabled tasks, unknown tasks, oversized payloads, and cross-tenant access.
5. Log only app ID, task ID, opaque request ID, policy decision, duration, and outcome. Never log prompts, records, tokens, or provider payloads.
6. Provide a non-AI fallback and a kill switch.
7. Keep all application mutations in the owning application and require human confirmation.

## Rollout state

This contract is documentation for implementation planning. CLEAR Sys and ROAMPH remain disconnected from executable COGNIX capabilities until their respective reviews are completed. No production integration is activated by this document.
