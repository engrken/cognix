"use client";

import { useState } from "react";

type ReportPayload = {
  report?: string;
  generatedAt?: string;
  historySamples?: number;
  historyWriteSucceeded?: boolean;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | null;
  message?: string;
};

export default function OperationsAgent() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [historySamples, setHistorySamples] = useState<number | null>(null);
  const [historyWriteSucceeded, setHistoryWriteSucceeded] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<ReportPayload["usage"]>(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  async function copyReport() {
    if (!report) return;
    const generatedLabel = generatedAt
      ? new Date(generatedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })
      : "just now";
    const historyLabel = historySamples === null
      ? "History unavailable"
      : `${historySamples} recorded samples${historyWriteSucceeded === true ? " · Latest check saved" : historyWriteSucceeded === false ? " · Latest check not saved" : ""}`;
    const completeReport = `Generated ${generatedLabel}\n${historyLabel}\n\n${report}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(completeReport);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = completeReport;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) throw new Error("Clipboard copy was not available.");
      }
      setCopyStatus("Report copied to clipboard.");
    } catch {
      setCopyStatus("Could not copy automatically. Please select and copy the report text.");
    }
  }

  async function generateReport() {
    if (loading) return;
    setLoading(true);
    setError("");
    setReport("");
    setGeneratedAt("");
    setHistorySamples(null);
    setHistoryWriteSucceeded(null);
    setUsage(null);

    try {
      const response = await fetch("/api/admin/operations-report", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as ReportPayload | null;
      if (!response.ok || !payload?.report) {
        setError(payload?.message || "The operations report could not be generated. Refresh the dashboard and try again.");
        return;
      }
      setReport(payload.report);
      setGeneratedAt(payload.generatedAt || "");
      setHistorySamples(typeof payload.historySamples === "number" ? payload.historySamples : null);
      setHistoryWriteSucceeded(typeof payload.historyWriteSucceeded === "boolean" ? payload.historyWriteSucceeded : null);
      setUsage(payload.usage ?? null);
    } catch {
      setError("COGNIX could not reach the report service. The live monitoring dashboard is still available.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 30, padding: 22, borderRadius: 14, border: "1px solid #315071", background: "#101d30" }} aria-labelledby="operations-agent-title">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, color: "#8fc5ff", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>COGNIX agent · v1</p>
          <h2 id="operations-agent-title" style={{ margin: "8px 0", fontSize: 21 }}>Operations report</h2>
          <p style={{ margin: 0, color: "#aab8ce", fontSize: 13, lineHeight: 1.6 }}>On-demand analysis of live readiness, latency, recorded availability, and incidents.</p>
        </div>
        <button type="button" onClick={generateReport} disabled={loading} style={{ padding: "12px 16px", border: 0, borderRadius: 8, background: loading ? "#49617b" : "#75baff", color: "#07101e", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Analyzing monitored metrics…" : report ? "Generate fresh report" : "Generate operations report"}
        </button>
      </div>
      <p style={{ margin: "14px 0 0", color: "#8295ae", fontSize: 12, lineHeight: 1.6 }}>Read-only advisory. No application records, secrets, or database tables are accessed. The agent cannot deploy, modify databases, or execute operational actions. Deployment/build metadata and raw runtime traces are not part of this report.</p>
      {error ? <p role="alert" style={{ margin: "16px 0 0", color: "#ff9999", lineHeight: 1.6 }}>{error}</p> : null}
      {report ? (
        <div style={{ marginTop: 18, padding: 18, borderRadius: 10, border: "1px solid #30435e", background: "#080f1c" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, color: "#8fa4c0", fontSize: 12 }}>
              <span>Generated {generatedAt ? new Date(generatedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "just now"}</span>
              <span>{historySamples === null ? "History unavailable" : historySamples + " recorded samples"}{historyWriteSucceeded === true ? " · Latest check saved" : historyWriteSucceeded === false ? " · Latest check not saved" : ""}{usage?.outputTokens ? " · " + usage.outputTokens + " output tokens" : ""}</span>
            </div>
            <button type="button" onClick={copyReport} style={{ padding: "9px 13px", border: "1px solid #52769d", borderRadius: 8, background: "#142943", color: "#d7eaff", fontWeight: 700, cursor: "pointer" }}>Copy report</button>
          </div>
          <p role="status" aria-live="polite" style={{ margin: "0 0 10px", color: copyStatus.startsWith("Could not") ? "#f4c66a" : "#8fc5ff", fontSize: 12 }}>{copyStatus}</p>
          <pre style={{ margin: 0, color: "#d7e2f2", fontFamily: "inherit", fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{report}</pre>
        </div>
      ) : null}
    </section>
  );
}
