# COGNIX

**Think. Connect. Execute.**

The governed intelligence and orchestration layer for SAGA, CLEAR Sys, and ROAMPH.

> Centralize intelligence and governance, not private application data.

## Purpose

COGNIX provides a versioned server-to-server API, a default-deny capability registry, controlled model access, system operations monitoring, and future agent orchestration. Each application remains authoritative for its own data, permissions, calculations, and business rules.

## Connected applications

| App | Integration | Capability policy |
|---|---|---|
| SAGA | Server-side adapter | Fixed-topic system-use guidance enabled; lesson-resource generation and teacher-summary reporting disabled |
| CLEAR Sys | Not connected | Planned; model access blocked |
| ROAMPH | Not connected | Planned; model access blocked |

## Architecture and privacy principles

- Versioned application API: `POST /api/v1/agent`.
- Per-application service credentials; service identity never replaces end-user authorization.
- Static capability registry with default-deny execution.
- Applications retain their own users, tenant scope, records, and business rules.
- No direct production database connections from COGNIX.
- No application data is shared by default.
- SAGA's Virtual Assistant provides generic how-to guidance and read-only workspace answers. SAGA performs all authentication, ownership checks, and academic-data queries locally.
- For SAGA system help, COGNIX receives only one fixed, allowlisted help-topic identifier. The teacher's typed question, class context, and academic records are not sent.
- The SAGA system-help model filters out providers that train on prompts. This is not a zero-data-retention guarantee.
- The former lesson-outline, study-guide, and practice-question generation capability is disabled.
- The separate teacher-summary capability remains disabled.
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

## Master roadmap

The original Cognix platform roadmap remains the governing product roadmap. The Learning Machine Layer (LML), incident intelligence, AI resolution advice, remediation planning, and future self-healing are cross-platform capabilities that strengthen the core platform and its connected agents; they do not replace the original platform phases.

See [docs/cognix-master-roadmap-v1.md](docs/cognix-master-roadmap-v1.md) for phase definitions, current status, dependencies, and delivery order.

No production application database is provisioned or directly connected to COGNIX.
