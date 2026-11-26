export type CognixAppId = "saga" | "clear" | "roamph";
export type CapabilityState = "enabled" | "disabled" | "planned";

export const AGENT_REGISTRY_VERSION = "2";

/**
 * Static, reviewed policy inventory. This is not a permissions database:
 * enabling a capability requires a code change, review, and deployment.
 * Unknown capabilities fail closed in the API dispatcher.
 */
export const AGENT_REGISTRY = {
  applications: [
    {
      id: "saga",
      name: "SAGA",
      integration: "adapter-present",
      dataOwner: "SAGA",
      description: "Academic records, teacher workflows, and student services remain owned by SAGA.",
      capabilities: [
        {
          id: "teacher-summary",
          name: "Teacher summary",
          state: "disabled",
          modelAccess: "blocked",
          dataClass: "Teacher-scoped academic workload aggregates",
          approval: "privacy-review-required",
          reason: "This reporting experiment remains disabled. It must not query SAGA academic records or send teacher-derived aggregates to a model.",
        },
        {
          id: "learning-resource",
          name: "Academic resource drafting",
          state: "disabled",
          modelAccess: "blocked",
          dataClass: "Retired generic educational-content generation",
          approval: "retired",
          reason: "The former lesson-outline, study-guide, and practice-question generator is retired. Requests fail closed before any model call or SAGA record access.",
        },
        {
          id: "system-help",
          name: "SAGA system help",
          state: "enabled",
          modelAccess: "enabled",
          dataClass: "One fixed, allowlisted SAGA help-topic identifier",
          approval: "generic-system-guidance-only",
          reason: "Enabled only for general SAGA feature-use instructions. The SAGA adapter sends one fixed topic code and never sends the teacher's freeform message, class identifier, workspace metadata, student information, grades, scores, attendance, rosters, or academic records. AI Gateway filters out providers that train on prompts; zero data retention is not guaranteed.",
        },
      ],
    },
    {
      id: "clear",
      name: "CLEAR Sys",
      integration: "not-connected",
      dataOwner: "CLEAR Sys",
      description: "Management and financial records remain owned by CLEAR Sys.",
      capabilities: [
        {
          id: "management-assistance",
          name: "Management assistance",
          state: "planned",
          modelAccess: "blocked",
          dataClass: "Management and potentially financial information",
          approval: "privacy-review-required",
          reason: "No data contract or approved use case is configured.",
        },
      ],
    },
    {
      id: "roamph",
      name: "ROAMPH",
      integration: "not-connected",
      dataOwner: "ROAMPH",
      description: "Rental, booking, customer, and fleet records remain owned by ROAMPH.",
      capabilities: [
        {
          id: "fleet-assistance",
          name: "Fleet and rental assistance",
          state: "planned",
          modelAccess: "blocked",
          dataClass: "Rental, booking, customer, and payment-related information",
          approval: "privacy-review-required",
          reason: "No data contract or approved use case is configured.",
        },
      ],
    },
  ],
  agents: [
    {
      id: "operations-analyst",
      name: "System Operations Agent",
      owner: "COGNIX",
      state: "enabled",
      scope: "Admin-only technical readiness, response latency, recorded availability, and incident metadata.",
      dataBoundary: "COGNIX service-health metadata only; no application tables, user records, student records, financial records, or application secrets.",
      modelAccess: "enabled",
      approval: "admin-session-required",
    },
    {
      id: "saga-virtual-assistant",
      name: "SAGA Virtual Assistant",
      owner: "SAGA",
      state: "enabled",
      scope: "General SAGA feature-use guidance plus read-only questions about the teacher's currently open class workspace. Class data is queried and answered inside SAGA.",
      dataBoundary: "COGNIX receives only one fixed, allowlisted help-topic identifier for general system guidance. It receives no freeform teacher message, class identifier, class metadata, student attributes, grade, score, attendance, roster, or other academic record. Workspace answers are produced locally by the SAGA adapter after teacher and school ownership checks.",
      modelAccess: "enabled",
      approval: "fixed-topic-system-guidance-only",
    },
    {
      id: "management-assistant",
      name: "Management Agent",
      owner: "CLEAR Sys",
      state: "planned",
      scope: "Future management workflow and operational assistance.",
      dataBoundary: "No financial or management records transferred until purpose, permissions, and privacy review are approved.",
      modelAccess: "blocked",
      approval: "privacy-review-required",
    },
    {
      id: "fleet-assistant",
      name: "Fleet Agent",
      owner: "ROAMPH",
      state: "planned",
      scope: "Future fleet and rental operational assistance.",
      dataBoundary: "No customer, booking, rental, or payment records transferred until purpose, permissions, and privacy review are approved.",
      modelAccess: "blocked",
      approval: "privacy-review-required",
    },
  ],
} as const;

export function getCapabilityPolicy(app: CognixAppId, task: string) {
  const application = AGENT_REGISTRY.applications.find((item) => item.id === app);
  return application?.capabilities.find((capability) => capability.id === task) ?? null;
}
