# COGNIX

**Think. Connect. Execute.**

The shared intelligence layer for SAGA, CLEAR Sys, and ROAMPH.

> One intelligence platform. Multiple intelligent applications.

## Purpose

COGNIX provides a governed API, agent orchestration, application-scoped tools, model access, and execution auditing for the three applications.

## Connected applications

| App | Initial capabilities | Access |
|---|---|---|
| SAGA | Academic summaries, class performance, attendance insights, teacher assistance | Read-only |
| CLEAR Sys | Collections and financial summaries, audit assistance, clearance support | Read-only |
| ROAMPH | Fleet utilization, booking summaries, overdue rentals, payment-status analysis | Read-only |

## Architecture

- API layer: stable server-to-server interface.
- Authentication: service credential plus application-side end-user authorization.
- Orchestrator: policy checks, tool selection, and model invocation.
- Tool registry: explicit application-scoped allow-list.
- Model adapter: provider-neutral boundary with usage budgets.
- Audit layer: redacted execution metadata and outcomes.

See docs/ARCHITECTURE.md, docs/SECURITY.md, and docs/INTEGRATION.md.

## Local development

Requires Node.js 20.9+ and npm.

1. Run npm install.
2. Copy .env.example to .env.local.
3. Set COGNIX_API_KEY to a long random secret.
4. Run npm run dev.
5. Open http://localhost:3000/api/health.

## v1 safety rules

1. Read-only tools by default.
2. Each application enforces its own user, tenant, role, and record permissions.
3. COGNIX does not connect directly to production application databases.
4. No autonomous grading, financial, booking, payment, or clearance mutations.
5. One model call per task by default; enforce token and request budgets.
6. Never log raw prompts, credentials, student records, financial details, or payment data.

## Roadmap

- [x] Repository foundation and architecture boundaries
- [x] Health endpoint and service-authentication foundation
- [ ] Model adapter and budget configuration
- [ ] First read-only tool for each application
- [ ] Structured audit persistence
- [ ] Integration tests and deployment
- [ ] Human-approved write workflows after security review

No production integrations or paid infrastructure are provisioned by this scaffold.
