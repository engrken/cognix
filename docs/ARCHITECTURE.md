# Architecture

## Request flow

1. A trusted server-side caller submits a task.
2. COGNIX validates the request and service credential.
3. The orchestrator selects tools registered for that application only.
4. The selected tool calls the application's own authenticated server API.
5. The application verifies the signed-in user, tenant, role, and record-level access.
6. A model adapter receives only the minimum permitted context.
7. COGNIX returns a structured response and records a redacted execution event.

## Boundaries

- COGNIX is not a shared database and does not replace application business logic.
- Each application remains authoritative for its data, permissions, and domain rules.
- Calls are server-to-server; no browser-side secrets.
- Tools are allow-listed and scoped by application.
- Never accept arbitrary URLs, SQL, or shell commands from model output.
- Mutations are excluded from the initial release.

## Runtime

The initial service uses small Next.js route handlers and a provider-neutral core. Durable sessions, queues, subagents, and vector retrieval are deferred until actual workloads justify their cost.

## Model policy

- One model invocation per task by default.
- Explicit model, token, and request budgets.
- Bounded input and output sizes.
- No automatic retries that can multiply model spend.
- Fail safely when model configuration is absent.
