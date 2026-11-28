import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";
import { getRecentErrorEvents } from "@/lib/error-intelligence";
import { buildIncidentIntelligence } from "@/lib/incident-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localDate(value: string) {
  return new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

export default async function ErrorIntelligencePage() {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#080d18", color: "#eef3ff" }}>
      <section style={{ maxWidth: 440, padding: 24, border: "1px solid #26364e", borderRadius: 14, background: "#111b2c" }}>
        <h1>Administrator sign-in required</h1>
        <p style={{ color: "#aab8ce" }}>Incident intelligence is restricted to authenticated Cognix administrators.</p>
        <Link href="/admin" style={{ color: "#8fc5ff" }}>Go to System Admin</Link>
      </section>
    </main>;
  }
  let result: Awaited<ReturnType<typeof getRecentErrorEvents>>;
  let storageError = false;
  try { result = await getRecentErrorEvents(); } catch {
    result = { available: false, events: [] };
    storageError = true;
  }
  const incidents = buildIncidentIntelligence(result.events);
  return <main style={{ minHeight: "100vh", padding: "32px 20px 64px", background: "#080d18", color: "#eef3ff" }}>
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #26364e", paddingBottom: 20 }}>
        <div><Link href="/admin" style={{ color: "#8fc5ff", fontWeight: 800, letterSpacing: ".14em" }}>COGNIX</Link><p style={{ margin: "8px 0 0", color: "#aab8ce" }}>Phase 2 · Unified Integration · LML Incident Intelligence</p></div>
        <Link href="/admin" style={{ color: "#8fc5ff" }}>Back to System Admin</Link>
      </header>
      <section style={{ margin: "28px 0", padding: 22, borderRadius: 14, border: "1px solid #26364e", background: "#111b2c" }}>
        <p style={{ margin: 0, color: "#8fa4c0", fontSize: 12, letterSpacing: ".12em" }}>TECHNICAL SIGNALS ONLY</p>
        <h1 style={{ margin: "10px 0", fontSize: 30 }}>Incident intelligence</h1>
        <p style={{ margin: 0, color: "#aab8ce", lineHeight: 1.7 }}>Cognix groups allowlisted technical events, produces evidence-limited hypotheses, and creates advisory runbooks. No business records, user identities, raw logs, or stack traces are retained.</p>
      </section>
      {storageError ? <p role="status" style={{ color: "#f4c66a" }}>Private event storage could not be read. No incident diagnosis is available for this request.</p>
        : !result.available ? <p role="status" style={{ color: "#f4c66a" }}>Private event storage is not configured. The receiver remains unavailable until storage is configured.</p>
        : incidents.length === 0 ? <section style={{ padding: 20, border: "1px solid #26364e", borderRadius: 12, background: "#111b2c" }}><h2>No application error events received</h2><p style={{ color: "#aab8ce" }}>The receiver is ready, but no SAGA, CLEAR Sys, or ROAMPH adapter is currently delivering technical events.</p></section>
        : <section style={{ display: "grid", gap: 14 }}>
          <p style={{ color: "#8fa4c0", fontSize: 13 }}>Showing {incidents.length} grouped patterns from up to 100 recent events. Retention is limited to 30 days and 1,000 records.</p>
          {incidents.map(({ diagnosis, plan }) => <article key={`${diagnosis.fingerprint}:${diagnosis.environment}`} style={{ padding: 18, border: "1px solid #26364e", borderRadius: 12, background: "#111b2c" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ textTransform: "uppercase" }}>{diagnosis.app} · {diagnosis.environment} · {diagnosis.category.replaceAll("_", " ")}</strong>
              <span style={{ color: diagnosis.severity === "critical" ? "#ff8585" : diagnosis.severity === "error" ? "#f4c66a" : "#8fc5ff", fontSize: 12, fontWeight: 700 }}>{diagnosis.severity.toUpperCase()}</span>
            </div>
            <h2 style={{ margin: "12px 0 6px", fontSize: 19 }}>{diagnosis.hypothesis}</h2>
            <p style={{ color: "#aab8ce", margin: "6px 0", lineHeight: 1.6 }}>{diagnosis.rationale}</p>
            <p style={{ color: "#8fa4c0", fontSize: 12 }}>Occurrences: {diagnosis.occurrences} · Confidence: {diagnosis.confidence} · Component: {diagnosis.component}</p>
            <p style={{ color: "#8fa4c0", fontSize: 12 }}>First seen {localDate(diagnosis.firstSeenAt)} · Last seen {localDate(diagnosis.lastSeenAt)}</p>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Recommended read-only checks</h3>
            <ul style={{ color: "#c5d1e1", lineHeight: 1.7, paddingLeft: 22 }}>{diagnosis.recommendedChecks.map((check) => <li key={check}>{check}</li>)}</ul>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #26364e" }}>
              <h3 style={{ fontSize: 14 }}>Remediation plan · Advisory only</h3>
              <p style={{ color: "#aab8ce", fontSize: 13 }}>Status: {plan.status} · Execution: {plan.execution}</p>
              {plan.steps.map((step) => <div key={step.id} style={{ margin: "12px 0", paddingLeft: 12, borderLeft: "2px solid #40516a" }}>
                <strong>{step.title}</strong>
                <p style={{ color: "#aab8ce", fontSize: 13, lineHeight: 1.6 }}>{step.purpose}</p>
                <p style={{ color: "#8fa4c0", fontSize: 12 }}>Risk: {step.risk} · Approval: {step.approval} · {step.execution}</p>
              </div>)}
            </div>
            <p style={{ color: "#718198", fontSize: 11, overflowWrap: "anywhere" }}>Fingerprint: {diagnosis.fingerprint}</p>
          </article>)}
        </section>}
      <section style={{ marginTop: 24, padding: 18, border: "1px solid #26364e", borderRadius: 12, background: "#111b2c" }}>
        <h2 style={{ marginTop: 0, fontSize: 17 }}>AI resolution advisor</h2>
        <p style={{ color: "#aab8ce", lineHeight: 1.6, marginBottom: 0 }}>Provider-neutral advisor code is included but remains disabled by default. This dashboard makes no AI provider calls. Diagnoses are deterministic and remediation steps are non-executable.</p>
      </section>
      <footer style={{ marginTop: 32, borderTop: "1px solid #26364e", paddingTop: 18, color: "#718198", fontSize: 12, lineHeight: 1.7 }}>
        Cognix does not retry transactions, modify application data, edit code, restart services, or deploy fixes. Root causes and recovery remain unverified until confirmed by the owning application.
      </footer>
    </div>
  </main>;
}
