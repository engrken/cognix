# Cognix Master Roadmap v1

**Product:** Cognix — centralized governed agentic intelligence and orchestration for SAGA, CLEAR Sys, and ROAMPH.

**Status date:** 26 November 2026.

## Product direction

Cognix is the shared intelligence, integration, orchestration, and governance platform for an ecosystem of applications. It centralizes reusable intelligence and policy—not private application data. Each connected application remains authoritative for its users, tenant boundaries, records, permissions, calculations, and business rules.

The original Cognix platform roadmap remains the master roadmap. The Learning Machine Layer (LML) is a cross-platform capability that strengthens Cognix and its specialized agents. LML, incident intelligence, AI resolution advice, remediation planning, and future self-healing are not replacements for the original platform phases.

## Architecture principles

1. **Centralize intelligence and governance, not private application data.**
2. **Application ownership:** each app enforces end-user authorization locally and owns all business-record reads and writes.
3. **Service authentication is not end-user authorization:** app-to-Cognix credentials establish the calling application only.
4. **Default deny:** only statically registered, versioned, explicitly enabled capabilities may be invoked.
5. **Least privilege and data minimization:** transfer only the technical or task-specific fields required for an approved capability.
6. **Human control:** sensitive or state-changing actions require explicit authorization, audit, and application-owned mutation APIs.
7. **Evidence before claims:** hypotheses, recommendations, approvals, execution, and verified outcomes remain distinct states.
8. **Cost-aware operations:** preserve Hobby-plan limits; no unnecessary Cron frequency, previews, deployments, or paid model calls.
9. **No direct application database connections from Cognix.**
10. **No autonomous business-record mutations.**

## Original platform roadmap

### Phase 1 — Cognix core foundation

**Status: substantially implemented; deployed.**

Delivered:
- Repository and application foundation.
- Health endpoint and service authentication.
- Versioned v1 agent API foundation.
- Model adapter and budget configuration.
- Static capability registry with default-deny policy.
- Protected administration and system monitoring.
- Persistent monitor history.
- Initial SAGA fixed-topic system-help integration.

Remaining hardening:
- Keep health and readiness contracts minimal.
- Continue integration, security, and operational testing as capabilities expand.

### Phase 2 — Unified application integration architecture

**Status: partially implemented.**

Delivered:
- Versioned server-to-server agent API.
- Application-scoped service authentication foundation.
- SAGA server-side adapter and narrowly scoped fixed-topic help capability.

To implement:
- Complete SAGA end-to-end integration verification.
- Define and publish a stable versioned application adapter contract.
- Add dedicated credentials and adapters for CLEAR Sys and ROAMPH only after security and purpose review.
- Add structured, redacted integration audit events.
- Add adapter health and delivery diagnostics.
- Ensure each adapter enforces local end-user authorization before any application-owned data operation.

Acceptance:
- Authentication is bound to the calling app.
- Capability allowlists are enforced server-side.
- No app's business data or tenant scope is inferred from a service token.
- Failed delivery is bounded, idempotent where applicable, and auditable.

### Phase 3 — Agent registry and orchestration

**Status: initial capability inventory/policy foundation exists; full orchestration not yet implemented.**

To implement:
- Central Agent Registry with stable agent IDs, versions, owners, purpose, status, and capability declarations.
- Agent lifecycle management and health.
- Orchestration engine for task classification, routing, delegation, and result aggregation.
- Typed inter-agent task contracts and bounded context transfer.
- Timeouts, cancellation, retries, idempotency, concurrency limits, and failure isolation.
- Agent execution trace and operator-visible status.
- Policy checks before every capability invocation.

Acceptance:
- An agent cannot self-register an unrestricted capability.
- Orchestration routes only to enabled, authorized agents.
- Every delegated task has an auditable caller, purpose, and bounded input/output contract.
- Failure in one agent does not silently authorize another agent to exceed its scope.

### Phase 4 — Specialized application intelligence

**Status: SAGA initial narrow integration exists; CLEAR Sys and ROAMPH are not connected.**

To implement:
- SAGA Intelligence Agent, expanding only through reviewed, explicitly enabled capabilities.
- CLEAR Sys Intelligence Agent for approved management-system workflows.
- ROAMPH Intelligence Agent for approved fleet and operational workflows.
- Application-specific agent instructions, tool allowlists, and context boundaries.
- Local authorization checks and application-owned APIs for any application data access.
- Per-app evaluation suites and acceptance criteria.

Acceptance:
- Each app's agent can only use its own registered capabilities.
- Cognix does not become a shared database or cross-tenant data broker.
- App-specific permissions and business rules remain enforced by the app.

### Phase 5 — Governance, security, and human approval

**Status: foundational policies exist; complete workflows remain to implement.**

To implement:
- Central policy evaluation and capability authorization.
- Human approval workflows for sensitive operations.
- Role separation and approval attribution.
- Immutable or tamper-evident audit history for consequential actions.
- Secret and credential lifecycle procedures.
- Model/provider allowlists, data handling policy, and usage budgets.
- Kill switches, rate limits, bounded retries, and incident escalation.
- Security review and threat models for each new adapter and execution capability.

Acceptance:
- No sensitive action executes solely because a model recommends it.
- Approval is bound to a specific action plan, scope, expiry, and idempotency key.
- Denied, expired, and cancelled approvals cannot be replayed.

### Phase 6 — Unified Cognix administration and operations

**Status: partial implementation in production.**

Delivered:
- Protected admin dashboard.
- System health and availability monitoring.
- Persistent monitor history.
- Initial operations reporting and LML-related admin pages on their respective draft/production states.

To implement:
- Unified view of applications, agents, integrations, capabilities, and policies.
- Agent health, task history, orchestration traces, and failure summaries.
- Integration delivery and authentication status.
- Approval queue and action audit.
- AI usage, quota, and cost visibility.
- Incident intelligence and learning views.
- Role-appropriate administrative controls.

Acceptance:
- Operators can trace a task from app request through agent routing and outcome.
- Sensitive application content is not exposed in central admin by default.
- Admin actions are authenticated, authorized, and audited.

### Phase 7 — Ecosystem and extensibility

**Status: planned.**

To implement:
- Repeatable onboarding contract for additional applications.
- Versioned adapter and capability SDK or templates.
- Agent templates and registration workflow.
- Provider-neutral model gateway expansion.
- Compatibility and lifecycle policy for API, agents, and capabilities.
- Evaluation gates before enabling a new application or agent.

Acceptance:
- A new app can be onboarded without weakening existing app boundaries.
- New agents and providers are disabled until reviewed and explicitly enabled.
- Backward compatibility and deprecation are managed deliberately.

## Cross-platform capability: Learning Machine Layer (LML)

LML is a shared capability spanning the platform phases above. It learns from approved operational experience and helps Cognix and its agents improve over time.

### LML-A — Operational learning foundation

**Status: implemented in production as the initial foundation.**

- Private, versioned incident-learning knowledge.
- Reuse of approved Cognix monitor history.
- Admin-only learning review.
- Verified cause/resolution records.
- No raw app logs, stack traces, secrets, or business records.

### LML-B — Error intelligence collection

**Status: implemented on a draft branch; not merged/deployed.**

- Authenticated technical error receiver.
- Strict allowlisted schema and bounded payload.
- Per-app authentication, rate limiting, idempotency, retention, and private storage.
- Sanitized error dashboard.
- Synthetic contract tests added; latest validation must be confirmed before merge.
- App-side adapters and live delivery remain pending.

### LML-C — Diagnostic reasoning

**Status: deterministic foundation on a draft branch; not merged/deployed.**

- Fingerprint-based grouping.
- Candidate hypotheses and rationale.
- Recurrence and time-window evidence.
- Conservative confidence labels.
- Read-only checks and manual-review-only output.
- Integration with the receiver and dashboard remains pending.

### LML-D — AI resolution advice

**Status: guarded provider-neutral foundation on a draft branch; not merged/deployed.**

- Strict sanitized input.
- Bounded structured output.
- Provider adapter with Groq as an initial candidate.
- Disabled by default.
- No live provider calls or credentials configured.
- Provider model and free-tier eligibility must be verified before any enablement.

### LML-E — Remediation planning

**Status: non-executable planner foundation on a draft branch; not merged/deployed.**

- Category-specific plans.
- Read-only-first checks.
- Preconditions, risk labels, approval requirements, verification, and rollback guidance.
- No Tier 2 or Tier 3 execution.
- Every plan and step is explicitly non-executable.

### LML-F — Unified incident intelligence

**Status: not yet integrated.**

To implement:
- Connect receiver events to deterministic diagnosis.
- Add optional AI advice as a separate, clearly labelled source.
- Generate remediation plans from validated diagnosis outputs.
- Display evidence, confidence, recommendations, and plan state in admin.
- Record operator feedback and independently verified outcomes.
- Keep diagnosis, recommendation, approval, execution, and verification as distinct states.

### LML-G — Application adapters and operational feedback

**Status: not yet implemented.**

To implement:
- Add technical-only event adapters to SAGA, CLEAR Sys, and ROAMPH.
- Enforce local redaction and allowlists before events leave each app.
- Authenticate each app independently.
- Provide delivery retry/idempotency and operator diagnostics.
- Never send student, teacher, customer, tenant, booking, payment, financial, academic, or uploaded content to Cognix incident memory.

### LML-H — Governed self-healing

**Status: architecture defined; execution not implemented.**

Lifecycle:
**Detect → Normalize → Diagnose → Plan → Authorize → Execute → Verify → Learn**

Rollout:
1. Read-only diagnosis and runbook recommendations.
2. Human-approved, bounded, reversible technical actions through app-owned allowlisted adapters.
3. Selective autonomy only for narrowly defined low-risk operations after measured reliability and a separate approval gate.

Never allow arbitrary shell, SQL, generated code execution, unrestricted HTTP, business-record mutation, permission escalation, grading/attendance changes, booking/payment changes, or unreviewed deployments/schema changes.

### LML-I — Predictive intelligence and evaluation

**Status: future capability; not yet implemented.**

To implement:
- Baselines from adequate timestamped observations.
- Early warning for persistent latency drift and recurring degradation.
- Evaluation against held-out incidents and verified outcomes.
- False-positive and false-negative tracking.
- Recommendation usefulness and resolution effectiveness.
- Confidence calibration and drift monitoring.
- Explicitly avoid outage predictions without sufficient evidence.

## Integrated delivery sequence

The platform phases and LML work should advance together, with dependencies respected:

1. Complete security review and synthetic validation of the existing draft receiver, diagnostic, AI-advisor, and planner work.
2. Integrate LML-B through LML-E into one coherent, read-only incident intelligence pipeline.
3. Build the unified admin experience for apps, agents, incidents, diagnostics, plans, approvals, and learning outcomes.
4. Complete the Agent Registry and bounded orchestration engine.
5. Complete SAGA adapter verification, then onboard CLEAR Sys and ROAMPH separately.
6. Establish full governance, approval, audit, cost, and evaluation controls.
7. Introduce human-approved technical remediation only after the preceding controls are independently validated.
8. Expand predictive intelligence and carefully gated selective autonomy based on measured evidence.
9. Add further applications and agents through the reviewed onboarding contract.

## Release and production gates

- Draft branches do not become production merely because CI passes.
- Merge only after code review, security review, synthetic tests, and integration tests appropriate to the change.
- Deploy only when the change provides production value and has a verified rollback path.
- No production secrets, environment variables, database migrations, Blob writes, provider calls, or app credentials are changed without a specific need and appropriate authorization.
- Preserve Vercel Hobby constraints: no preview deployments, no unnecessary production deploys, and no increased Cron frequency without a cost/plan review.
- Report exactly what was tested and what was not.

## Current delivery snapshot

| Area | Current state |
|---|---|
| Cognix core, API, policy foundation | Production foundation |
| SAGA narrow integration | Existing; end-to-end review remains |
| CLEAR Sys integration | Not connected |
| ROAMPH integration | Not connected |
| Agent registry | Initial policy inventory; full registry/lifecycle pending |
| Orchestration | Pending |
| Governance and approvals | Foundational policies; full workflow pending |
| Unified admin | Partial |
| LML learning foundation | Production |
| Error receiver | Draft |
| Diagnostic reasoning | Draft |
| AI resolution advisor | Draft; disabled |
| Remediation planner | Draft; non-executable |
| Integrated incident intelligence | Pending |
| Self-healing execution | Not implemented |
| Predictive intelligence | Not implemented |

## Definition of success

Cognix becomes the trusted intelligence and orchestration layer for its application ecosystem: it can securely connect applications, route work to specialized agents, enforce shared governance, learn from verified operational outcomes, and—only when explicitly authorized—coordinate safe technical recovery without taking ownership of application business data or decisions.
