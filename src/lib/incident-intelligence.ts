import { diagnoseErrorEvents, type DiagnosticEvent } from "@/lib/incident-diagnosis";
import { createRemediationPlan } from "@/lib/remediation-planner";

export function buildIncidentIntelligence(events: readonly DiagnosticEvent[]) {
  return diagnoseErrorEvents(events).map((diagnosis) => ({
    diagnosis,
    plan: createRemediationPlan({
      fingerprint: diagnosis.fingerprint,
      app: diagnosis.app,
      category: diagnosis.category,
      severity: diagnosis.severity,
      occurrences: diagnosis.occurrences,
      hypothesis: diagnosis.hypothesis,
      confidence: diagnosis.confidence,
    }),
  }));
}
