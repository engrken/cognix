# COGNIX

**Think. Connect. Execute.**

The governed intelligence and orchestration layer for SAGA, CLEAR Sys, and ROAMPH.

> Centralize intelligence and governance, not private application data.

## Purpose

COGNIX provides a versioned server-to-server API, a default-deny capability registry, controlled model access, system operations monitoring, and future agent orchestration. Each application remains authoritative for its own data, permissions, calculations, and business rules.

## Connected applications

| App | Integration | Capability policy |
|---|---|---|
| SAGA | Initial server adapter exists; experimental call disabled | Teacher-summary disabled pending privacy review |
| CLEAR Sys | Not connected | Planned; model access blocked |
| ROAMPH | Not connected | Planned; model access blocked |

## Architecture and privacy principles

- Versioned application API: `POST /api/v1/agent`.
- Per-application service credentials; service identity never replaces end-user authorization.
- Static capability registry with default-deny execution.
- Applications retain their own users, tenant scope, records, and business rules.
- No direct production database connections from COGNIX.
- No application data is shared by default.
- Each proposed capability requires a defined purpose, necessity/proportionality review, minimum-data contract, and provider-retention review before model access.
- Prefer local deterministic processing when it accomplishes the task without disclosing application data.
- No autonomous business-record mutations.

## Operations and administration

The protected `/admin` dashboard provides:
- Live health checks and persistent availability/incident history.
- Read-only System Operations Agent reports using COGNIX technical health metadata.
- Agent registry showing application owners, capability states, data boundaries, approval requirements, and model-access state.

The registry is an inventory and policy control plane, not a dynamic permission editor. Capability changes require reviewed code changes and deployment.

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
- [x] Privacy-first static agent registry and default-deny API policy
- [x] Admin registry and policy inventory
- [x] System Admin monitoring and persistent history
- [ ] Approved, minimum-data application capabilities
- [ ] Structured, redacted integration audit
- [ ] Agent orchestration and human approval workflows
- [ ] Application-specific adapters after privacy and security review
- [ ] Expanded integration tests and operational controls

No production application database is provisioned or directly connected to COGNIX.
