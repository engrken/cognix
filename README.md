# COGNIX

**Think. Connect. Execute.**

The shared intelligence layer for SAGA, CLEAR Sys, and ROAMPH.

> One intelligence platform. Multiple intelligent applications.

## Purpose

COGNIX provides a governed API, agent orchestration, application-scoped tools, model access, and execution auditing for the three applications.

## Connected applications

| App | Initial capabilities | Access |
|---|---|---|
| SAGA | Aggregate teacher summaries | Read-only |
| CLEAR Sys | Planned operational summaries and audit assistance | Not enabled |
| ROAMPH | Planned fleet and rental operations summaries | Not enabled |

## Architecture

- API layer: versioned server-to-server interface at `POST /api/v1/agent`.
- Authentication: distinct service credential per application, with a SAGA-only legacy credential fallback.
- Authorization: each application retains ownership of end-user, tenant, role, and record-level permissions.
- Orchestrator: explicit application/task allow-list; disabled capabilities fail closed.
- Model adapter: provider-neutral boundary with usage budgets.
- Audit layer: redacted execution metadata; persistent audit storage is a later milestone.

See docs/ARCHITECTURE.md, docs/SECURITY.md, and docs/INTEGRATION.md.

## Local development

Requires Node.js 20.9+ and npm.

1. Run npm install.
2. Copy .env.example to .env.local.
3. Set `COGNIX_API_KEY` or `COGNIX_SAGA_API_KEY` to a long random secret for the SAGA pilot.
4. Run npm run dev.
5. Open http://localhost:3000/api/health.

## v1 safety rules

1. Read-only capabilities only.
2. Each application enforces its own user, tenant, role, and record permissions.
3. COGNIX does not connect directly to production application databases.
4. No autonomous grading, financial, booking, payment, or clearance mutations.
5. One model invocation per task by default; enforce token and request budgets.
6. Never log raw prompts, credentials, student records, financial details, or payment data.

## Roadmap

- [x] Repository foundation and architecture boundaries
- [x] Health endpoint and service authentication
- [x] Model adapter and budget configuration
- [x] Versioned v1 agent API and SAGA compatibility adapter
- [ ] CLEAR Sys application credential and first read-only capability
- [ ] ROAMPH application credential and first read-only capability
- [ ] Structured audit persistence and approvals
- [ ] Integration tests and expanded operational controls
- [ ] Human-approved write workflows after security review

No production application database is provisioned or directly connected to COGNIX.

## System Admin monitoring

The protected `/admin` dashboard provides live HTTP readiness checks for COGNIX, SAGA, CLEAR Sys, and ROAMPH. Persistent sample and incident history is stored in a private Vercel Blob. The monitor uses a fixed HTTPS endpoint allow-list and does not inspect application records or connect to application databases. Admin-triggered checks and the scheduled monitoring route are separate from application agent requests.
