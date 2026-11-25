"use client";

import { useEffect, useState } from "react";

type Registry = {
  applications: Array<{
    id: string;
    name: string;
    integration: string;
    dataOwner: string;
    description: string;
    capabilities: Array<{
      id: string;
      name: string;
      state: string;
      modelAccess: string;
      dataClass: string;
      approval: string;
      reason: string;
    }>;
  }>;
  agents: Array<{
    id: string;
    name: string;
    owner: string;
    state: string;
    scope: string;
    dataBoundary: string;
    modelAccess: string;
    approval: string;
  }>;
  policy: { default: string; note: string };
};

function statusColor(value: string) {
  if (value === "enabled" || value === "adapter-present") return "#74dfb0";
  if (value === "disabled" || value === "blocked" || value === "privacy-review-required") return "#f4c66a";
  return "#9fb2cc";
}

export default function AgentRegistry() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/agent-registry", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "Administrator session expired. Sign in again." : "Could not load the agent registry.");
        return await response.json() as Registry;
      })
      .then((payload) => { if (active) setRegistry(payload); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load the agent registry.");
      });
    return () => { active = false; };
  }, []);

  return (
    <section style={{ marginTop: 30, padding: 22, borderRadius: 14, border: "1px solid #315071", background: "#101d30" }} aria-labelledby="agent-registry-title">
      <div>
        <p style={{ margin: 0, color: "#8fc5ff", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>Governance control plane · v1</p>
        <h2 id="agent-registry-title" style={{ margin: "8px 0", fontSize: 21 }}>Agent registry &amp; policies</h2>
        <p style={{ margin: 0, color: "#aab8ce", fontSize: 13, lineHeight: 1.6 }}>A read-only inventory of connected applications, planned agents, and approved execution boundaries. This page does not grant access or enable capabilities.</p>
      </div>

      {error ? <p role="alert" style={{ marginTop: 16, color: "#ff9999" }}>{error}</p> : null}
      {!registry && !error ? <p role="status" style={{ marginTop: 16, color: "#8fa4c0" }}>Loading registry…</p> : null}

      {registry ? (
        <>
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
            {registry.applications.map((application) => (
              <article key={application.id} style={{ padding: 16, borderRadius: 10, border: "1px solid #30435e", background: "#080f1c" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong>{application.name}</strong>
                  <span style={{ color: statusColor(application.integration), fontSize: 11, fontWeight: 700 }}>{application.integration.replaceAll("-", " ")}</span>
                </div>
                <p style={{ margin: "8px 0 12px", color: "#9eafc6", fontSize: 12, lineHeight: 1.6 }}>{application.description}</p>
                <p style={{ margin: "0 0 8px", color: "#8fa4c0", fontSize: 11 }}>DATA OWNER: {application.dataOwner}</p>
                {application.capabilities.map((capability) => (
                  <div key={capability.id} style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #26364e" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "#e4edfa", fontSize: 13, fontWeight: 700 }}>{capability.name}</span>
                      <span style={{ color: statusColor(capability.state), fontSize: 11, fontWeight: 700 }}>{capability.state}</span>
                    </div>
                    <p style={{ margin: "7px 0", color: "#9eafc6", fontSize: 11, lineHeight: 1.5 }}>{capability.reason}</p>
                    <p style={{ margin: 0, color: "#7589a4", fontSize: 10, lineHeight: 1.5 }}>Data class: {capability.dataClass} · Model: {capability.modelAccess} · Approval: {capability.approval}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>

          <h3 style={{ margin: "22px 0 10px", fontSize: 16 }}>Registered agents</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
            {registry.agents.map((agent) => (
              <article key={agent.id} style={{ padding: 15, borderRadius: 10, border: "1px solid #30435e", background: "#080f1c" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13 }}>{agent.name}</strong>
                  <span style={{ color: statusColor(agent.state), fontSize: 11, fontWeight: 700 }}>{agent.state}</span>
                </div>
                <p style={{ margin: "7px 0", color: "#8196b1", fontSize: 11 }}>Owner: {agent.owner} · Model access: {agent.modelAccess}</p>
                <p style={{ margin: "8px 0", color: "#c1cde0", fontSize: 12, lineHeight: 1.55 }}>{agent.scope}</p>
                <p style={{ margin: 0, color: "#8fa4c0", fontSize: 11, lineHeight: 1.55 }}>{agent.dataBoundary}</p>
              </article>
            ))}
          </div>

          <p style={{ margin: "16px 0 0", paddingTop: 12, borderTop: "1px solid #26364e", color: "#8fa4c0", fontSize: 11, lineHeight: 1.6 }}>Policy default: {registry.policy.default}. {registry.policy.note}</p>
        </>
      ) : null}
    </section>
  );
}
