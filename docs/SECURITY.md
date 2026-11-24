# Security baseline

## Authentication and authorization

- Require a high-entropy server-to-server bearer token.
- Store credentials only in server-side environment variables.
- Rotate exposed credentials; never commit secrets.
- Service authentication is not end-user authorization. Each application independently enforces the current user's permissions, tenant scope, and record access.
- Never trust an app name, user ID, role, tenant ID, or permission claim supplied only by a model or browser.

## Data handling

- Send only the minimum data required for a task.
- Do not log raw prompts, credentials, student information, financial records, payment details, or sensitive payloads.
- Redact identifiers and error details in operational logs.
- Define retention and deletion rules before adding persistent audit storage.

## Tool safety

- Read-only tools first.
- Explicit allow-list per application.
- Validate every tool input with a schema.
- No arbitrary URL fetching, SQL execution, code execution, or unrestricted filesystem access.
- Future write operations require separate permission design, user confirmation, idempotency, and audit records.

## Domain constraints

- SAGA: existing SAGA academic rules remain authoritative; COGNIX must not invent or alter grade calculations.
- CLEAR Sys: no posting, editing, or approving financial transactions.
- ROAMPH: no changing bookings, availability, payment status, or rental records.

## Deployment checklist

- [ ] Set a high-entropy COGNIX_API_KEY in deployment secrets.
- [ ] Keep preview and production credentials separate.
- [ ] Restrict access to logs and environment settings.
- [ ] Confirm HTTPS and deployment access controls.
- [ ] Add rate limiting and request budgets before external exposure.
- [ ] Review data processing and retention before sending real user data to a model.
