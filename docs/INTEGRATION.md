# COGNIX application integration contract

COGNIX is called only from trusted server-side application code. Never call it directly from a browser.

## Version 1 endpoint

`POST /api/v1/agent`

Headers:

- `Authorization: Bearer <application-specific service token>`
- `Content-Type: application/json`

Request envelope:

    {
      "apiVersion": "1",
      "app": "saga",
      "task": "learning-resource",
      "requestId": "caller-generated-correlation-id",
      "input": {
        "resourceType": "lesson-outline",
        "subject": "Science",
        "level": "Junior High School",
        "topic": "The water cycle"
      }
    }

## Enabled and disabled capabilities

| Application | Capability | State | Data boundary |
|---|---|---|---|
| SAGA | `learning-resource` | Enabled | Generic subject, level, resource type, and topic only |
| SAGA | `teacher-summary` | Disabled | No teacher or academic records sent |
| CLEAR Sys | Management assistance | Planned | No financial or management data |
| ROAMPH | Fleet and rental assistance | Planned | No customer, booking, or payment data |

The Academic Agent generates general lesson outlines, study guides, and practice questions. It does not query SAGA databases or access student/teacher records. The SAGA adapter authenticates an active, non-demo teacher and applies a per-teacher request throttle before calling COGNIX.

## Academic model and provider policy

The Academic Agent uses the AI Gateway virtual model `vmc/academic-assistant`. Its centrally managed configuration selects GPT-4.1 mini and enforces `disallowPromptTraining` with providers listed as no-prompt-training eligible by the live Gateway catalog.

This is **not a zero-data-retention guarantee**. Generic topics are still transmitted to an external model provider for inference. The SAGA interface discloses this and prohibits personal, confidential, or record-level information. If no eligible provider is available, the request fails closed instead of falling back to a provider that trains on prompts.

## Application credentials

Configure separate, high-entropy server-side tokens:

- SAGA: `COGNIX_SAGA_API_KEY` (the existing `COGNIX_API_KEY` remains a SAGA-only legacy fallback).
- CLEAR Sys: `COGNIX_CLEAR_API_KEY`.
- ROAMPH: `COGNIX_ROAMPH_API_KEY`.

Never share credentials between applications, expose credentials to browsers, or use a `NEXT_PUBLIC_` prefix.

## Application ownership and downstream authorization

Each application remains authoritative for its own users, permissions, records, calculations, and business rules. COGNIX does not connect directly to production application databases. A valid service token does not replace the application-side user-session and role check.

## Data minimization

- No application data is shared by default.
- The Academic Agent accepts only a short generic topic plus fixed subject, level, and resource-type selections.
- The API rejects common email/phone/identifier patterns and record-like text; this screening is supplemental, not a substitute for the user-facing warning or governance.
- Do not submit names, student identifiers, grades, scores, attendance, rosters, contact details, health information, family circumstances, or confidential school material.
- The endpoint does not log prompts or generated answers and does not persist requests.
- Outputs are drafts and require teacher review.
- No autonomous grading, student evaluation, attendance action, or record mutation is enabled.
