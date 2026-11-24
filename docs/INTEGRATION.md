# Application integration contract

COGNIX is called only from trusted server-side code in each application. Never call it directly from a browser.

## Endpoint

POST /api/v1/agent

Headers:
- Authorization: Bearer COGNIX_API_KEY
- Content-Type: application/json

Example request:

    {
      "app": "saga",
      "task": "Summarize attendance trends for this class this month.",
      "context": {
        "classId": "server-authorized-class-id",
        "period": "2026-11"
      },
      "requestId": "saga-unique-request-id"
    }

Allowed app values: saga, clear, roamph.

The endpoint currently returns 503 not_configured after authentication and schema validation. This is intentional: no model or tool execution is enabled until app-specific authorization and read-only tools are implemented.

## Required downstream authorization

Before returning data to COGNIX, an application endpoint must verify:
- the originating service credential;
- the actual signed-in user and current session;
- role and tenant, school, or branch scope;
- record-level access to every requested resource;
- the operation is on the application's explicit read-only allow-list.

Do not treat the app field or identifiers in context as proof of authorization.

## Planned success envelope

    {
      "requestId": "saga-unique-request-id",
      "app": "saga",
      "status": "completed",
      "answer": "A concise, source-grounded summary.",
      "sources": [],
      "warnings": []
    }

Errors use a stable error code and safe message.
