# COGNIX application integration contract

COGNIX is called only from trusted server-side code in each application. Never call it directly from a browser.

## Version 1 endpoint

`POST /api/v1/agent`

Headers:

- `Authorization: Bearer <application-specific service token>`
- `Content-Type: application/json`

Versioned request:

    {
      "apiVersion": "1",
      "app": "saga",
      "task": "teacher-summary",
      "requestId": "saga-unique-request-id",
      "input": {
        "reportingPeriod": {
          "start": "2026-11-01",
          "endExclusive": "2026-11-08",
          "timezone": "Asia/Manila"
        },
        "totals": {
          "assignedSubjects": 3,
          "enrollmentRecords": 84,
          "assessmentsDueWithinSevenDays": 2,
          "gradeWorkflow": {
            "draftSubjects": 1,
            "submittedSubjects": 1,
            "verifiedSubjects": 1
          }
        }
      }
    }

Successful response:

    {
      "apiVersion": "1",
      "status": "completed",
      "app": "saga",
      "task": "teacher-summary",
      "requestId": "saga-unique-request-id",
      "answer": "Teacher-facing summary...",
      "summary": "Teacher-facing summary...",
      "sources": [],
      "warnings": [],
      "usage": {
        "inputTokens": 220,
        "outputTokens": 100,
        "totalTokens": 320
      }
    }

`summary` is a compatibility alias retained for the existing SAGA caller. New integrations should consume `answer`. `requestId` is a correlation identifier; it is not an idempotency guarantee.

## Application credentials

Configure separate, high-entropy server-side tokens on COGNIX:

- SAGA: `COGNIX_SAGA_API_KEY` (the existing `COGNIX_API_KEY` remains a SAGA-only fallback for backward compatibility).
- CLEAR Sys: `COGNIX_CLEAR_API_KEY`.
- ROAMPH: `COGNIX_ROAMPH_API_KEY`.

Configure the matching credential only in the corresponding application's server-side environment. Never use a `NEXT_PUBLIC_` prefix and never send a token to a browser. Do not reuse one application token across applications.

A recognized `app` value is not authorization. COGNIX authenticates against the matching application credential and routes only explicitly enabled capabilities.

## Enabled capabilities

| Application | Task | Status |
|---|---|---|
| SAGA | `teacher-summary` | Enabled; aggregate-only input |
| CLEAR Sys | — | Not enabled |
| ROAMPH | — | Not enabled |

Requests for recognized but disabled app/task combinations return `501 capability_not_enabled` without a model call or application action. Missing or invalid app credentials return `401 unauthorized`.

## Error envelope

Errors use a stable envelope:

    {
      "apiVersion": "1",
      "status": "error",
      "app": "saga",
      "requestId": "saga-unique-request-id",
      "error": "invalid_input",
      "message": "Safe explanation."
    }

Current codes include `invalid_json`, `invalid_request`, `invalid_input`, `payload_too_large`, `unauthorized`, `capability_not_enabled`, `not_configured`, and `model_unavailable`.

## Legacy SAGA compatibility

The original SAGA request shape (`app`, the fixed teacher-summary `task` description, `context`, and optional `requestId`) remains accepted. It is normalized internally to the v1 `saga/teacher-summary` capability and receives the new response envelope, including the legacy `summary` field.

## Required downstream authorization

Before returning data to COGNIX, an application endpoint must verify:

- the originating service credential;
- the actual signed-in user and current session;
- role and tenant, school, or branch scope;
- record-level access to every requested resource;
- the operation is on the application's explicit read-only allow-list.

Do not treat the app field or identifiers in context as proof of authorization. Each application remains authoritative for its own user permissions and data.

## Initial safety boundary

- COGNIX does not connect directly to application databases.
- The SAGA task accepts only aggregate counts and a reporting period; no student-level records, grades, attendance marks, or raw records.
- No CLEAR financial records or ROAMPH booking/payment records are accepted by an enabled capability.
- Disabled applications are not sent to the model.
- Requests and prompts are not persisted by this endpoint. Logs contain only a generated/request-supplied correlation ID, app/task labels, and coarse gateway status.
- All v1 capabilities are read-only. No autonomous mutations or write workflows are enabled.
