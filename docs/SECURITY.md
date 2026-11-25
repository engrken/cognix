# Security baseline

## Default-deny integration policy

- No application capability is enabled by default.
- The static agent registry is the reviewed inventory; unregistered, disabled, planned, or unimplemented capabilities fail closed.
- A registry entry is not by itself permission to execute. Enabling a capability requires implementation, code review, privacy review, provider review (when a model is involved), and deployment.
- The COGNIX Agent API does not persist integration prompts or payloads.

## Authentication and authorization

- Require a high-entropy server-to-server bearer token for every application.
- Use separate server-only credentials: `COGNIX_SAGA_API_KEY`, `COGNIX_CLEAR_API_KEY`, and `COGNIX_ROAMPH_API_KEY`.
- The legacy `COGNIX_API_KEY` is accepted only as a backward-compatible SAGA credential.
- Store credentials only in server-side environment variables. Rotate exposed credentials; never commit secrets.
- Service authentication is not end-user authorization. Each application independently enforces the current user's permissions, tenant scope, and record access.
- Never trust an app name, user ID, role, tenant ID, or permission claim supplied only by a model or browser.

## Data handling and privacy

- Identify a specific, legitimate purpose before processing application data.
- Assess necessity and proportionality; use less intrusive local processing where practical.
- Send only the minimum data required for an approved task.
- Do not log raw prompts, credentials, student information, financial records, payment details, or sensitive payloads.
- Review model provider retention, training/improvement use, data processing terms, and region before sending non-public application data.
- Do not treat aggregate information as automatically anonymous.
- Define retention and deletion rules before adding persistent audit storage.

## Tool safety

- Read-only capabilities first.
- Explicit allow-list per application and task.
- Validate every enabled tool input with a strict schema.
- No arbitrary URL fetching, SQL execution, code execution, or unrestricted filesystem access.
- Future write operations require separate permission design, user confirmation, idempotency, and audit records.

## Domain constraints

- SAGA: existing SAGA academic rules remain authoritative; COGNIX must not invent or alter grade calculations.
- CLEAR Sys: no posting, editing, or approving financial transactions.
- ROAMPH: no changing bookings, availability, payment status, or rental records.

## Deployment checklist

- [ ] Set a unique high-entropy application key only for an approved integration.
- [ ] Keep preview and production credentials separate.
- [ ] Restrict access to logs and environment settings.
- [ ] Confirm HTTPS and deployment access controls.
- [ ] Add rate limiting and request budgets before external exposure.
- [ ] Review data processing and retention before sending real user data to a model.

## System Admin dashboard

- Admin access requires a `COGNIX_ADMIN_PASSWORD` of at least 16 characters and a separate `COGNIX_ADMIN_SESSION_SECRET` of at least 32 characters.
- The dashboard fails closed when either setting is missing.
- Admin sessions are signed, HTTP-only, Secure in production, SameSite=Strict, and expire after 12 hours. Login requests require a same-origin Origin header and reject oversized form bodies.
- Monitoring uses a fixed HTTPS endpoint allow-list; no caller- or model-supplied URLs are fetched.
- Status responses expose only endpoint labels, HTTP status, latency, and coarse diagnostics. Response bodies, credentials, and application records are not collected.
- Monitoring history is stored separately from integration requests. The agent endpoint does not persist prompts or application payloads.
- No automatic remediation or business-record write operations are enabled.
