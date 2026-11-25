export type CognixAppId = "saga" | "clear" | "roamph";
export type CapabilityState = "enabled" | "disabled" | "planned";

export const AGENT_REGISTRY_VERSION = "1";

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
          state: "enabled",
          modelAccess: "enabled",
          dataClass: "Teacher-owned subject title/code, course-year label, term, learning level, resource type, and generic topic",
          approval: "non-personal-content-only; teacher review required",
          reason: "Enabled only for class-contextual lesson outlines, study guides, and practice questions. SAGA reads one teacher-owned Subject row's instructional metadata only; no rosters, enrollments, assessments, grades, scores, or attendance are queried or sent. AI Gateway routes only to providers marked no-prompt-training; zero data retention is not guaranteed.",
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
      id: "academic-assistant",
      name: "Academic Agent",
      owner: "SAGA",
      state: "enabled",
      scope: "Create subject-specific lesson outlines, study guides, and practice questions using a teacher-owned SAGA class subject's instructional metadata, selected learning level, resource type, and generic topic.",
      dataBoundary: "The SAGA adapter reads only one authenticated teacher-owned Subject row's title, course code, course/year label, and term. COGNIX receives those instructional fields plus the chosen learning level, resource type, and generic topic; no rosters, enrollments, assessments, grades, scores, attendance, or personal records are sent. AI Gateway filters for no-prompt-training providers; zero data retention is not guaranteed.",
      modelAccess: "enabled",
      approval: "non-personal-content-only; teacher review required",
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
