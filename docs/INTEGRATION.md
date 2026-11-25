# COGNIX application integration contract

COGNIX is called only from trusted server-side code in each application. Never call it directly from a browser.

## Version 1 endpoint

`POST /api/v1/agent`

Headers:

- `Authorization: Bearer <application-specific service token>`
- `Content-Type: application/json`

Request envelope:

    {
      "apiVersion": "1",
      "app": "saga",
      "task": "approved-task-id",
      "requestId": "caller-generated-correlation-id",
      "input": {}
    }

The envelope is a transport contract, not permission to process the supplied data. The application name and task are not authorization claims. COGNIX authenticates the application-specific bearer token and then checks the static capability registry. Unknown, disabled, unapproved, or unimplemented capabilities fail closed.

## Application credentials

Configure separate, high-entropy server-side tokens on COGNIX only when an application integration is approved:

- SAGA: `COGNIX_SAGA_API_KEY` (the existing `COGNIX_API_KEY` is a SAGA-only legacy fallback).
- CLEAR Sys: `COGNIX_CLEAR_API_KEY`.
- ROAMPH: `COGNIX_ROAMPH_API_KEY`.

Never share one application's credential with another application. Never use a `NEXT_PUBLIC_` prefix or expose a token to a browser. Do not configure new credentials merely to make a planned application appear connected.

## Current application capability policy

| Application | Capability | State | Model access |
|---|---|---|---|
| SAGA | `teacher-summary` | Disabled pending privacy review | Blocked |
| CLEAR Sys | Management assistance | Planned | Blocked |
| ROAMPH | Fleet and rental assistance | Planned | Blocked |

The teacher-summary experiment is intentionally disabled. Its SAGA server route returns a capability-disabled response before querying academic records or contacting COGNIX. The COGNIX API also rejects the capability without calling a model. Do not enable or reintroduce data transmission without an approved purpose, necessity/proportionality assessment, provider-retention review, and explicit data contract.

## Response and errors

All API responses use `apiVersion`, `status`, `app`, `task`, and `requestId`. Success responses will add task output fields only after an approved execution implementation exists. Errors use stable codes such as `invalid_json`, `invalid_request`, `payload_too_large`, `unauthorized`, `capability_disabled`, `capability_not_enabled`, and `capability_not_implemented`.

`requestId` is a correlation identifier, not an idempotency guarantee.

## Application ownership and downstream authorization

Before an application sends any data to COGNIX, its own server must verify:

- the originating service credential;
- the actual signed-in user and current session;
- role and tenant, school, or branch scope;
- record-level access to every requested resource;
- the operation is on the application's explicit allow-list.

Each application remains authoritative for its own users, permissions, records, calculations, and business rules. COGNIX must not connect directly to production application databases.

## Data minimization

- No application data is shared with COGNIX by default.
- Do not send student, teacher, customer, financial, booking, payment, or other personal information unless a defined task has been approved as necessary and proportionate.
- Use synthetic test data for integration testing.
- Prefer local deterministic processing when it achieves the purpose without external model disclosure.
- Model provider retention, data processing terms, and deployment configuration must be reviewed before enabling a capability that sends non-public application data.
- COGNIX does not persist integration prompts or inputs in this API.
- No autonomous mutations are enabled.
