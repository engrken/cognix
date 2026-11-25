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
          reason: "The use case has not been approved as necessary or proportionate. No teacher or academic data should be sent to the current free model endpoint.",
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
      state: "planned",
      scope: "Future assistance with approved academic workflows and policy guidance.",
      dataBoundary: "No SAGA data transfer until a specific purpose, minimum data contract, and privacy review are approved.",
      modelAccess: "blocked",
      approval: "privacy-review-required",
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
