# COGNIX

**Think. Connect. Execute.**

The governed intelligence and orchestration layer for SAGA, CLEAR Sys, and ROAMPH.

> Centralize intelligence and governance, not private application data.

## Purpose

COGNIX provides a versioned server-to-server API, a default-deny capability registry, controlled model access, system operations monitoring, and future agent orchestration. Each application remains authoritative for its own data, permissions, calculations, and business rules.

## Connected applications

| App | Integration | Capability policy |
|---|---|---|
| SAGA | Server-side adapter | Generic academic resource drafting enabled; teacher-summary reporting disabled |
| CLEAR Sys | Not connected | Planned; model access blocked |
| ROAMPH | Not connected | Planned; model access blocked |

## Architecture and privacy principles

- Versioned application API: `POST /api/v1/agent`.
- Per-application service credentials; service identity never replaces end-user authorization.
- Static capability registry with default-deny execution.
- Applications retain their own users, tenant scope, records, and business rules.
- No direct production database connections from COGNIX.
- No application data is shared by default.
- The Academic Agent creates class-contextual lesson outlines, study guides, and practice questions using only a teacher-owned subject's title, code, course/year label, term, and a generic topic.
- The Academic Agent uses an AI Gateway virtual model that filters out providers that train on prompts. This is not a zero-data-retention guarantee.
- No student/teacher records, grades, scores, attendance, rosters, assessments, or school-private material may be submitted.
- No autonomous business-record mutations.

## Operations and administration

The protected `/admin` dashboard provides live health checks, persistent availability/incident history, read-only System Operations Agent reports, and the agent registry/policy inventory.

## Local development

Requires Node.js 20.9+ and npm.

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Configure administrator variables for local admin testing.
4. Run `npm run dev`.
5. Open `http://localhost:3000/api/health`.

## Roadmap

- [x] Repository foundation and architecture boundaries
- [x] Health endpoint and service authentication
- [x] Model adapter and budget configuration
- [x] Versioned v1 agent API
- [x] Privacy-first agent registry and default-deny policy
- [x] Generic Academic Agent with no-prompt-training provider routing
- [x] System Admin monitoring and persistent history
- [ ] CLEAR Sys and ROAMPH capabilities after purpose and privacy review
- [ ] Structured, redacted integration audit
- [ ] Agent orchestration and human approval workflows
- [ ] Expanded integration tests and operational controls

No production application database is provisioned or directly connected to COGNIX.
