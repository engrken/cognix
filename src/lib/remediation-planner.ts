export type RemediationDiagnosis = {
  fingerprint: string;
  app: "saga" | "clear" | "roamph";
  category:
    | "application_exception"
    | "dependency_timeout"
    | "database_unavailable"
    | "upstream_failure"
    | "authentication_failure"
    | "authorization_failure"
    | "validation_failure"
    | "client_render_failure";
  severity: "warning" | "error" | "critical";
  occurrences: number;
  hypothesis: string;
  confidence: "low" | "moderate";
};

export type RemediationRisk = "tier1_read_only" | "tier3_operator_approval";

export type RemediationStep = {
  id: string;
  kind: "observe" | "operator_assessment" | "escalate";
  title: string;
  purpose: string;
  risk: RemediationRisk;
  approval: "not_required_read_only" | "explicit_operator_approval";
  preconditions: string[];
  verification: string[];
  rollback: string;
  execution: "not_executable";
};

export type RemediationPlan = {
  schemaVersion: 1;
  incidentFingerprint: string;
  app: RemediationDiagnosis["app"];
  severity: RemediationDiagnosis["severity"];
  hypothesis: string;
  confidence: RemediationDiagnosis["confidence"];
  status: "advisory_plan_only";
  execution: "not_executable";
  steps: RemediationStep[];
  safetyNotes: string[];
};

type PlanTemplate = {
  observations: Array<{ title: string; purpose: string; preconditions: string[]; verification: string[] }>;
  operatorTitle: string;
  operatorPurpose: string;
  operatorPreconditions: string[];
  operatorVerification: string[];
};

const TEMPLATES: Record<RemediationDiagnosis["category"], PlanTemplate> = {
  database_unavailable: {
    observations: [
      { title: "Check database provider health", purpose: "Establish whether the primary database reports an availability incident.", preconditions: ["Use the database provider's read-only status and health views.", "Do not expose connection strings, credentials, query parameters, or customer data."], verification: ["Record provider health state and the observation timestamp.", "Compare the health state with the incident time window."] },
      { title: "Inspect connection and saturation indicators", purpose: "Determine whether connection limits, pool saturation, or latency correlate with the reported failure.", preconditions: ["Use aggregate technical metrics only.", "Do not run ad hoc SQL or change pool/database settings."], verification: ["Confirm whether connection pressure or latency is elevated against the normal baseline.", "Preserve the metric window and source for operator review."] },
    ],
    operatorTitle: "Prepare an operator-led database recovery decision",
    operatorPurpose: "If read-only evidence confirms an outage, the database owner evaluates provider-supported recovery options under its change controls.",
    operatorPreconditions: ["Database owner confirms the affected environment and current provider status.", "A change record, impact assessment, and rollback path are available.", "No Cognix-generated SQL, shell command, or configuration change is used."],
    operatorVerification: ["Database owner confirms service health has recovered.", "Owning application confirms its own health checks and error rate have returned to baseline."],
  },
  dependency_timeout: {
    observations: [
      { title: "Check dependency health and latency", purpose: "Compare dependency availability and latency with the incident observation window.", preconditions: ["Use approved provider status and aggregate telemetry.", "Do not submit user payloads or replay requests."], verification: ["Capture status and latency trend for the affected window.", "Determine whether latency exceeds the application's documented timeout budget."] },
      { title: "Review timeout and retry policy", purpose: "Check whether the owning application has a bounded timeout and retry configuration.", preconditions: ["Read the owning application's documented configuration.", "Do not change retry settings or replay transactions."], verification: ["Confirm the configured timeout/retry bounds and responsible owner.", "Check for retry amplification or duplicate-operation risk."] },
    ],
    operatorTitle: "Request dependency-owner assessment",
    operatorPurpose: "The dependency owner decides whether a provider escalation or a controlled application change is warranted.",
    operatorPreconditions: ["Dependency and application owners agree on the affected service boundary.", "Any proposed change has bounded retries, idempotency safeguards, and a rollback plan."],
    operatorVerification: ["Dependency health and application latency are checked independently.", "The original symptom is no longer recurring during the agreed observation window."],
  },
  upstream_failure: {
    observations: [
      { title: "Check upstream provider status", purpose: "Establish whether the external provider reports degradation during the incident window.", preconditions: ["Use provider status pages or approved read-only telemetry.", "Do not include credentials, request URLs, or customer identifiers."], verification: ["Record the provider status and matching time window.", "Compare upstream status with the application's sanitized failure trend."] },
      { title: "Review integration response classes", purpose: "Determine whether failures cluster by sanitized response-status class.", preconditions: ["Use aggregate metrics only.", "Do not inspect raw request/response bodies or replay business transactions."], verification: ["Confirm the response-class trend and whether it is improving.", "Check whether the owning application already has a safe fallback policy."] },
    ],
    operatorTitle: "Escalate to the integration owner",
    operatorPurpose: "The integration owner evaluates provider escalation or a controlled fallback under application-owned safeguards.",
    operatorPreconditions: ["Integration owner confirms provider and application impact.", "Any fallback is documented, bounded, and does not mutate or replay business records."],
    operatorVerification: ["Provider status is healthy or an approved fallback is confirmed active.", "The owning application verifies recovery without duplicating user transactions."],
  },
  authentication_failure: {
    observations: [
      { title: "Check authentication-provider health", purpose: "Determine whether the authentication provider reports an availability or latency issue.", preconditions: ["Use read-only provider health indicators.", "Never retrieve, display, or transmit secrets or tokens."], verification: ["Record provider health and the incident time window.", "Compare with aggregate authentication failure rates."] },
      { title: "Review recent authentication configuration changes", purpose: "Identify whether an approved configuration change aligns with the onset of failures.", preconditions: ["The application security owner uses its secure configuration audit tools.", "Do not rotate, reveal, or modify credentials from Cognix."], verification: ["Confirm whether a relevant approved change occurred.", "Verify callback and clock settings through the application owner."] },
    ],
    operatorTitle: "Escalate to the application security owner",
    operatorPurpose: "The owner determines whether a provider incident or approved configuration correction is appropriate.",
    operatorPreconditions: ["Security owner confirms the affected environment and intended authentication flow.", "Any change follows the application's credential and change-management controls."],
    operatorVerification: ["Authentication provider health is independently confirmed.", "The owning application verifies the flow with non-production test identities or its approved synthetic check."],
  },
  authorization_failure: {
    observations: [
      { title: "Review authorization decision telemetry", purpose: "Determine whether the owning application is consistently denying the relevant operation.", preconditions: ["Use aggregate, sanitized authorization telemetry.", "Do not inspect user identities or retrieve business records in Cognix."], verification: ["Confirm the policy version and denial trend with the application owner.", "Determine whether denials are expected security behavior."] },
      { title: "Review policy change history", purpose: "Check whether an approved policy change correlates with the incident.", preconditions: ["The application security owner uses its own audit tools.", "Do not alter roles, permissions, or policy rules."], verification: ["Confirm the policy change history and intended access behavior.", "Record the owner responsible for any follow-up."] },
    ],
    operatorTitle: "Escalate to the application security owner",
    operatorPurpose: "Only the owning application may decide whether an authorization policy is incorrect; Cognix must not weaken access controls.",
    operatorPreconditions: ["Security owner validates the intended access policy.", "Any correction is reviewed and approved through the application's access-governance process."],
    operatorVerification: ["The owner confirms expected allow/deny behavior with controlled test cases.", "No permission escalation or broad policy weakening occurred."],
  },
  validation_failure: {
    observations: [
      { title: "Compare API contract versions", purpose: "Check whether deployed components agree on the relevant schema and contract version.", preconditions: ["Use version metadata and synthetic non-production values.", "Do not collect or replay production request payloads."], verification: ["Confirm the deployed contract versions and compatibility status.", "Reproduce only with synthetic values in an approved non-production environment."] },
      { title: "Review release compatibility", purpose: "Check whether a frontend/backend release mismatch aligns with the failure window.", preconditions: ["Use deployment metadata and release notes.", "Do not roll back or deploy from Cognix."], verification: ["Identify the relevant release pair and owning team.", "Confirm whether a compatibility issue is reproducible with synthetic data."] },
    ],
    operatorTitle: "Request application-owner contract review",
    operatorPurpose: "The application owner decides whether a compatibility fix or controlled release action is warranted.",
    operatorPreconditions: ["Application owner confirms the contract mismatch using synthetic reproduction.", "Any release action follows normal review, deployment, and rollback controls."],
    operatorVerification: ["Compatible versions are confirmed in the target environment.", "Synthetic verification passes and the sanitized failure trend returns to baseline."],
  },
  client_render_failure: {
    observations: [
      { title: "Check frontend deployment and asset health", purpose: "Determine whether the failure correlates with a frontend release or unavailable static asset.", preconditions: ["Use deployment metadata and read-only asset health checks.", "Do not collect browser storage, user content, or session tokens."], verification: ["Confirm asset availability and release metadata.", "Compare the incident window with deployment timing."] },
      { title: "Review runtime compatibility indicators", purpose: "Check aggregate client/runtime compatibility and API contract alignment.", preconditions: ["Use aggregate technical telemetry only.", "Do not collect raw browser logs or user identifiers."], verification: ["Identify affected runtime/version bands if available in sanitized aggregates.", "Confirm API and asset versions are compatible."] },
    ],
    operatorTitle: "Escalate to the frontend owner",
    operatorPurpose: "The frontend owner evaluates a controlled fix or rollback using the application's release process.",
    operatorPreconditions: ["Frontend owner confirms a reproducible issue using a safe test environment.", "Any release action has an approved change and rollback plan."],
    operatorVerification: ["Static assets load and the synthetic rendering check passes.", "The owning application confirms the client-render failure trend has subsided."],
  },
  application_exception: {
    observations: [
      { title: "Correlate sanitized technical health signals", purpose: "Compare the event fingerprint with aggregate availability, latency, and dependency indicators.", preconditions: ["Use allowlisted technical metadata only.", "Do not inspect raw logs, stack traces, request bodies, or business data."], verification: ["Identify whether a dependency or component health signal aligns with the event.", "Record the observation window and source."] },
      { title: "Confirm recent release and dependency changes", purpose: "Check whether deployment metadata or dependency health changed near the incident.", preconditions: ["Use read-only release metadata and provider health views.", "Do not trigger deployments, restarts, or dependency changes."], verification: ["Confirm relevant version and health metadata.", "Escalate if the cause remains ambiguous."] },
    ],
    operatorTitle: "Escalate for application-owner diagnosis",
    operatorPurpose: "The application owner decides the next diagnostic or recovery step when the available technical evidence is inconclusive.",
    operatorPreconditions: ["Owner reviews the evidence in the application's secured observability environment.", "Any proposed change has explicit approval and a rollback plan."],
    operatorVerification: ["Owner confirms the root cause independently.", "Recovery is checked using application-owned health indicators."],
  },
};

function validateDiagnosis(diagnosis: RemediationDiagnosis): void {
  if (!diagnosis || typeof diagnosis !== "object") throw new TypeError("A diagnosis is required.");
  if (typeof diagnosis.fingerprint !== "string" || !/^[a-f0-9]{64}$/i.test(diagnosis.fingerprint)) {
    throw new TypeError("A valid opaque incident fingerprint is required.");
  }
  if (!["saga", "clear", "roamph"].includes(diagnosis.app)) throw new TypeError("Unsupported application.");
  if (!Object.hasOwn(TEMPLATES, diagnosis.category)) throw new TypeError("Unsupported incident category.");
  if (!["warning", "error", "critical"].includes(diagnosis.severity)) throw new TypeError("Unsupported severity.");
  if (!["low", "moderate"].includes(diagnosis.confidence)) throw new TypeError("Unsupported confidence.");
  if (typeof diagnosis.hypothesis !== "string" || diagnosis.hypothesis.length > 500) throw new TypeError("Invalid diagnosis hypothesis.");
  if (!Number.isInteger(diagnosis.occurrences) || diagnosis.occurrences < 1) throw new TypeError("Invalid occurrence count.");
}

export function createRemediationPlan(diagnosis: RemediationDiagnosis): RemediationPlan {
  validateDiagnosis(diagnosis);
  const template = TEMPLATES[diagnosis.category];
  const observations: RemediationStep[] = template.observations.map((item, index) => ({
    id: `observe-${index + 1}`,
    kind: "observe",
    title: item.title,
    purpose: item.purpose,
    risk: "tier1_read_only",
    approval: "not_required_read_only",
    preconditions: item.preconditions,
    verification: item.verification,
    rollback: "Not applicable: this step is read-only and makes no changes.",
    execution: "not_executable",
  }));
  const operatorStep: RemediationStep = {
    id: "operator-review",
    kind: "operator_assessment",
    title: template.operatorTitle,
    purpose: template.operatorPurpose,
    risk: "tier3_operator_approval",
    approval: "explicit_operator_approval",
    preconditions: template.operatorPreconditions,
    verification: template.operatorVerification,
    rollback: "No action is performed by Cognix. The responsible operator must document a rollback plan before any separately authorized change.",
    execution: "not_executable",
  };
  const escalation: RemediationStep = {
    id: "escalate-if-unresolved",
    kind: "escalate",
    title: "Escalate if evidence is incomplete or recovery is not verified",
    purpose: "Stop the plan and hand off to the owning application's designated operator rather than guessing or retrying.",
    risk: "tier1_read_only",
    approval: "not_required_read_only",
    preconditions: ["The available evidence is ambiguous, contradictory, or insufficient.", "The incident persists after the approved observation window."],
    verification: ["A named application operator accepts the handoff.", "No recovery is marked complete until the owning application verifies it independently."],
    rollback: "Not applicable: escalation makes no system changes.",
    execution: "not_executable",
  };

  return {
    schemaVersion: 1,
    incidentFingerprint: diagnosis.fingerprint,
    app: diagnosis.app,
    severity: diagnosis.severity,
    hypothesis: diagnosis.hypothesis,
    confidence: diagnosis.confidence,
    status: "advisory_plan_only",
    execution: "not_executable",
    steps: [...observations, operatorStep, escalation],
    safetyNotes: [
      "This plan is advisory. It does not execute, schedule, or authorize an operation.",
      "Cognix must not access application databases or mutate application business records.",
      "No shell commands, SQL, generated code, arbitrary HTTP requests, or transaction replays are included.",
      "Tier 2 and Tier 3 changes remain outside this planner; any future execution requires a separately reviewed capability registry and explicit authorization.",
      "A diagnosis is a hypothesis, not a verified root cause. Recovery requires independent application-owned verification.",
    ],
  };
}
