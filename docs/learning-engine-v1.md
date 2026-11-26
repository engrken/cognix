# COGNIX Learning Machine Layer (LML) — Incident Intelligence v1

Status: architecture proposal for a read-only, evidence-based first release. This document does not enable automated remediation, application-data ingestion, new production schedules, or model training.

## Goal

Make COGNIX better at resolving recurring technical issues by retaining verified operational experience, matching new symptoms to prior incidents, and identifying early warning patterns. The first release is deliberately deterministic and read-only. It builds on the existing COGNIX system monitor and private monitor-history store rather than introducing a new database or additional scheduled workload.

The learning loop is:

1. Observe approved technical signals.
2. Normalize and group related symptoms.
3. Compare the observation with known incident patterns.
4. Recommend investigation steps with evidence and confidence.
5. Let an authorized operator resolve and verify the issue.
6. Preserve the verified cause and outcome as reusable knowledge.
7. Evaluate whether later recommendations were accurate and useful.

A recommendation is not a diagnosis, and a proposed fix is not a verified resolution.

## Existing foundation

The current COGNIX monitor already checks the public readiness endpoints for COGNIX, SAGA, CLEAR Sys, and ROAMPH. It records service status, HTTP status, response latency, timestamps, and check source in a private Vercel Blob history document. It derives availability and incident intervals from those snapshots.

The current application health endpoints expose minimal readiness and database-connectivity results. They do not expose application tables or business records. This is the correct boundary for the first LML iteration.

The existing scheduled monitor runs once daily. That cadence is useful for low-cost availability history, but it is not sufficient for real-time incident detection or reliable short-horizon forecasting. Do not increase Cron frequency on the Hobby plan as part of this phase.

## LML v1 scope

### Included

- Read-only use of existing monitor snapshots and derived incident intervals.
- Deterministic incident fingerprints from allowlisted technical fields.
- Grouping and recurrence counts for similar incidents.
- An operator-curated knowledge record for confirmed root causes and verified resolutions.
- Evidence-linked recommendations that distinguish known matches from weak similarities.
- A feedback outcome for each recommendation: helpful, not helpful, or inconclusive.
- A simple evaluation report: match count, confirmed resolution count, recurrence, and recommendation outcome.

### Explicitly excluded

- Direct database connections to SAGA, CLEAR Sys, or ROAMPH.
- Student, teacher, customer, tenant, booking, payment, financial, academic, or uploaded-document data.
- Raw request bodies, arbitrary application logs, stack traces, environment variables, tokens, and secrets.
- Free-form application payloads sent to a model.
- Automatic code changes, deployment actions, database writes, or business-record mutations.
- Autonomous model fine-tuning or self-modification.
- Claims of predictive accuracy before enough timestamped observations and verified outcomes exist.

## Incident knowledge record

The initial record is a logical schema. It can be stored in the existing private operational store in a later implementation after validation; it does not require a database migration.

| Field | Purpose |
|---|---|
| incidentId | Random, opaque incident identifier |
| application | One of cognix, saga, clear, roamph |
| fingerprint | Stable hash of normalized technical symptom fields |
| firstSeenAt / lastSeenAt | Observation window |
| severity | degraded or unhealthy |
| signal | Allowlisted category such as readiness-failure, dependency-unavailable, http-error-class, or latency-anomaly |
| evidence | Snapshot IDs and safe numeric/status fields supporting the match |
| suspectedCause | Optional operator-entered hypothesis, explicitly unverified |
| confirmedCause | Optional operator-approved root cause |
| resolution | Sanitized, operator-approved remediation summary |
| verification | Evidence and timestamp showing whether service health recovered |
| outcome | unverified, verified, ineffective, or inconclusive |
| recurrenceCount | Number of matching observations/incidents |
| confidence | Explainable rule-based confidence, not model intuition |
| reviewedBy / reviewedAt | Authenticated operator attribution |

Never store a raw log line or user-submitted text in the shared incident memory. If a diagnostic excerpt is ever needed, it must be redacted and reviewed inside the source application before any transfer.

## Fingerprinting and matching

The first matcher should be deterministic. Its fingerprint may use only:

- Application ID from the fixed monitor target list.
- Health status (healthy, degraded, unhealthy).
- HTTP status class or exact status when useful.
- A bounded signal category derived by COGNIX from the health result.
- A coarse latency bucket, not an unbounded raw trace.

Do not include hostnames supplied by requests, URLs with query strings, user identifiers, tenant identifiers, request IDs, free-form error messages, or payload content.

A match should return:
- The prior incident/pattern identifier.
- Which fields matched.
- How many prior observations support the match.
- Whether a root cause and resolution were verified.
- Whether the same resolution previously restored health.
- A confidence label with a plain-language explanation.

An exact fingerprint with a verified successful resolution is stronger evidence than a partial symptom match. If the evidence is weak or conflicting, report that no reliable match was found.

## Prediction and early warning

Prediction must be evidence-based and separate from incident matching.

The first useful signals are:
- Repeated degraded/unhealthy checks.
- Increasing latency across a sufficient observation window.
- Repeated transitions between healthy and degraded.
- Recurrence of a previously verified incident fingerprint.

A warning should include the observed trend, observation window, baseline, threshold, and confidence. Avoid statements that an outage will occur. Prefer wording such as "rising latency resembles a prior incident pattern; investigate dependency health."

The current daily schedule cannot support minute-level warning or robust forecasting. Higher-frequency signals should come from existing application-side alerting or carefully reviewed event delivery, not a new frequent Cognix Cron loop. Any future event integration must be authenticated, rate-limited, idempotent, and restricted to the same technical metadata allowlist.

## Governance and safety

- COGNIX remains an advisory intelligence layer; each app remains the system of record.
- Application-specific health signals are treated as operational metadata, not authorization to access application data.
- No application capability is enabled by adding an incident-learning record.
- Only an authenticated Cognix administrator may mark a cause or resolution as verified.
- All edits to incident knowledge must be attributable and auditable.
- Recommendations must never execute themselves.
- A human-approved action must still use the owning application's own authorization and mutation APIs.
- A failed or inconclusive recommendation must be retained as negative feedback so the engine does not keep presenting it as a proven fix.
- Data retention, deletion, access control, and backup behavior for the knowledge store must be defined before persistence is implemented.

## Delivery plan

### Phase 0 — Foundation and contract
- [x] Review existing monitor and health endpoint contracts.
- [x] Define the incident-learning boundary and logical record.
- [ ] Review this architecture and approve the first implementation scope.

### Phase 1 — Deterministic incident memory
- Reuse current private monitor snapshots.
- Add a versioned incident knowledge document with strict schema validation.
- Derive stable fingerprints and recurrence summaries.
- Add authenticated admin-only review of incident records.
- Keep all writes limited to Cognix operational metadata and operator-reviewed technical notes.

### Phase 2 — Resolution learning
- Capture suspected cause separately from confirmed cause.
- Record remediation and post-fix verification.
- Rank prior resolutions by verified outcomes, recency, and exact symptom match.
- Add feedback on whether recommendations helped.

### Phase 3 — Predictive warnings
- Establish baselines from adequate observation history.
- Detect persistent latency drift and repeated degradation.
- Report evidence, confidence, and false-positive feedback.
- Do not claim prediction until measured against held-out historical incidents.

### Phase 4 — Carefully controlled remediation
- Start with runbook links and manual steps.
- Consider only low-risk, reversible actions after a separate threat model and approval.
- Require explicit human confirmation, idempotency, least privilege, audit records, and rollback.
- Keep application data changes owned and authorized by the source application.

## Acceptance criteria for Phase 1

- Invalid or unknown incident records are rejected.
- Incident fingerprints are deterministic for equivalent normalized signals.
- Different applications cannot collide in the same fingerprint namespace.
- No raw application payloads or business records are accepted.
- A recommendation cites its supporting prior incident and verification outcome.
- Unverified fixes are never described as known-good resolutions.
- All read/write operations are admin-authorized and non-cacheable.
- Existing health checks and daily monitor behavior remain unchanged.
- No database migration, new Cron schedule, model call, or production deployment is required for this phase.
