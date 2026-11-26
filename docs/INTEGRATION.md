# COGNIX application integration contract

COGNIX is called only from trusted server-side application code. Never call it directly from a browser.

## Version 1 endpoint

`POST /api/v1/agent`

Headers:

- `Authorization: Bearer <application-specific service token>`
- `Content-Type: application/json`

The current SAGA capability is generic system-use guidance only:

    {
      "apiVersion": "1",
      "app": "saga",
      "task": "system-help",
      "requestId": "caller-generated-correlation-id",
      "input": { "topic": "score-entry" }
    }

The `topic` is one of a fixed, allowlisted enum (for example `class-roster`, `grading-setup`, `assessments`, `score-entry`, `attendance`, or `final-grades`). SAGA classifies the teacher's typed question locally and sends only the fixed topic code. COGNIX does not receive the freeform question, user identity, subject/class identifiers, class metadata, rosters, student data, grades, scores, attendance marks, or other academic records.

## Enabled and disabled capabilities

| Application | Capability | State | Data boundary |
|---|---|---|---|
| SAGA | `system-help` | Enabled | One fixed allowlisted SAGA help-topic identifier only |
| SAGA | `learning-resource` | Disabled | Former generic lesson-material generation is retired |
| SAGA | `teacher-summary` | Disabled | No teacher or academic records sent |
| CLEAR Sys | Management assistance | Planned | No financial or management data |
| ROAMPH | Fleet and rental assistance | Planned | No customer, booking, or payment data |

## System-help model and provider policy

The SAGA Virtual Assistant uses the AI Gateway virtual model `vmc/saga-system-help`, targeting `openai/gpt-4.1-mini`. Its configuration sets `disallowPromptTraining` and restricts routing to approved Azure/OpenAI providers. The model receives only a fixed help-topic code and generates generic product-use instructions from the SAGA feature notes in the system prompt.

This is **not a zero-data-retention guarantee**. No personal or academic data is included in the COGNIX request. If COGNIX or the model provider is unavailable, SAGA falls back to built-in help instructions.

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
- SAGA's workspace-aware academic questions are queried and answered locally by SAGA. No academic record is sent to COGNIX.
- COGNIX receives only the fixed `system-help` topic code; the SAGA adapter does not forward teacher messages or workspace context.
- The endpoint does not log prompts or generated answers and does not persist requests.
- No autonomous grading, student evaluation, attendance action, or record mutation is enabled.
