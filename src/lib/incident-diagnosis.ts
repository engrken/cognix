export type DiagnosticEvent = {
  fingerprint: string;
  app: "saga" | "clear" | "roamph";
  category: "application_exception" | "dependency_timeout" | "database_unavailable" | "upstream_failure" | "authentication_failure" | "authorization_failure" | "validation_failure" | "client_render_failure";
  severity: "warning" | "error" | "critical";
  component: string;
  dependencyCode: string | null;
  httpStatusClass: string;
  environment: "production" | "staging";
  occurredAt: string;
};

export type IncidentDiagnosis = {
  fingerprint: string;
  app: DiagnosticEvent["app"];
  environment: DiagnosticEvent["environment"];
  category: DiagnosticEvent["category"];
  component: string;
  severity: DiagnosticEvent["severity"];
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  hypothesis: string;
  rationale: string;
  confidence: "low" | "moderate";
  recommendedChecks: string[];
  execution: "manual_review_only";
};

type DiagnosticRule = {
  matches: (event: DiagnosticEvent) => boolean;
  hypothesis: string;
  rationale: string;
  checks: string[];
  specific: boolean;
};

const SEVERITY_RANK: Record<DiagnosticEvent["severity"], number> = {
  critical: 3,
  error: 2,
  warning: 1,
};

const RULES: DiagnosticRule[] = [
  {
    matches: (event) => event.category === "database_unavailable" || event.dependencyCode === "primary_database" || event.component === "database",
    hypothesis: "The primary database or its connection path may be unavailable or saturated.",
    rationale: "The event identifies a database failure or the primary database dependency.",
    checks: ["Check database provider health and recent availability.", "Review connection-pool saturation, connection limits, and timeout metrics.", "Verify network reachability and service configuration without exposing credentials."],
    specific: true,
  },
  {
    matches: (event) => event.category === "dependency_timeout",
    hypothesis: "A downstream dependency may be responding slower than the application timeout budget.",
    rationale: "The event is classified as a dependency timeout; the event does not establish whether the dependency or network is at fault.",
    checks: ["Check the named dependency's availability and latency trend.", "Compare dependency latency with the application's timeout and retry policy.", "Check for a recent provider incident or network degradation."],
    specific: true,
  },
  {
    matches: (event) => event.category === "upstream_failure" || event.dependencyCode === "external_api" || event.dependencyCode === "payment_provider" || event.dependencyCode === "file_storage",
    hypothesis: "An upstream service or integration may be failing or returning unexpected responses.",
    rationale: "The event identifies an upstream failure or a known external dependency category.",
    checks: ["Check the provider's status and service-health indicators.", "Review integration error rates and response-status classes.", "Confirm whether the owning application has a safe, bounded retry or fallback policy; do not replay user transactions blindly."],
    specific: true,
  },
  {
    matches: (event) => event.category === "authentication_failure" || event.component === "authentication" || event.dependencyCode === "auth_provider",
    hypothesis: "The authentication provider or application authentication flow may be unavailable or misconfigured.",
    rationale: "The event is associated with authentication, but does not reveal credentials or identify an affected user.",
    checks: ["Check authentication-provider availability.", "Review recent authentication configuration and key-rotation changes through the owning application's secure controls.", "Check clock synchronization and callback configuration."],
    specific: true,
  },
  {
    matches: (event) => event.category === "authorization_failure" || event.component === "authorization",
    hypothesis: "An authorization policy or permission mapping may be rejecting an otherwise valid operation.",
    rationale: "The event is classified as an authorization failure; Cognix cannot infer whether the denial is correct.",
    checks: ["Review the owning application's authorization decision and policy version.", "Verify the intended role and resource policy through the application's own audit tools.", "Do not grant permissions or weaken access controls as an automated fix."],
    specific: true,
  },
  {
    matches: (event) => event.category === "validation_failure",
    hypothesis: "A request contract, schema, or validation rule may differ between application components.",
    rationale: "The event is classified as a validation failure; no request values are collected by Cognix.",
    checks: ["Compare the relevant API contract and deployed schema versions.", "Review recent frontend/backend release compatibility.", "Use synthetic, non-production values to reproduce the validation path."],
    specific: true,
  },
  {
    matches: (event) => event.category === "client_render_failure" || event.component === "frontend",
    hypothesis: "A frontend asset, runtime compatibility, or rendering path may be failing.",
    rationale: "The event is associated with client rendering or the frontend component.",
    checks: ["Check recent frontend deployment and asset availability.", "Review browser/runtime compatibility and client error-rate trends.", "Confirm static assets and API contract versions are aligned."],
    specific: true,
  },
  {
    matches: () => true,
    hypothesis: "The application component reported a technical failure; more evidence is needed to isolate the cause.",
    rationale: "The event does not match a more specific deterministic diagnostic rule.",
    checks: ["Review the owning application's sanitized technical health indicators.", "Compare this fingerprint with nearby dependency and availability events.", "Escalate to the application operator if the failure persists."],
    specific: false,
  },
];

export function diagnoseErrorEvents(events: readonly DiagnosticEvent[]): IncidentDiagnosis[] {
  const groups = new Map<string, DiagnosticEvent[]>();
  for (const event of events) {
    // The same technical fingerprint in staging and production represents
    // separate operational incidents and must never be combined.
    const groupKey = `${event.fingerprint}:${event.environment}`;
    const current = groups.get(groupKey) ?? [];
    current.push(event);
    groups.set(groupKey, current);
  }

  return [...groups.values()]
    .map((group) => {
      const ordered = [...group].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
      const representative = ordered[ordered.length - 1];
      const rule = RULES.find((candidate) => candidate.matches(representative)) ?? RULES[RULES.length - 1];
      const occurrences = group.length;
      const severity = group.reduce(
        (highest, event) => SEVERITY_RANK[event.severity] > SEVERITY_RANK[highest] ? event.severity : highest,
        "warning" as DiagnosticEvent["severity"],
      );
      return {
        fingerprint: representative.fingerprint,
        app: representative.app,
        environment: representative.environment,
        category: representative.category,
        component: representative.component,
        severity,
        occurrences,
        firstSeenAt: ordered[0].occurredAt,
        lastSeenAt: representative.occurredAt,
        hypothesis: rule.hypothesis,
        rationale: rule.rationale,
        confidence: rule.specific && occurrences >= 3 ? "moderate" as const : "low" as const,
        recommendedChecks: rule.checks,
        execution: "manual_review_only" as const,
      };
    })
    .sort((a, b) => {
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
        || b.occurrences - a.occurrences
        || Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt);
    })
    .slice(0, 25);
}
