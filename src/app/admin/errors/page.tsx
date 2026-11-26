import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";
import { getRecentErrorEvents } from "@/lib/error-intelligence";

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
        <p style={{ color: "#aab8ce" }}>Error intelligence is restricted to authenticated Cognix administrators.</p>
        <Link href="/admin" style={{ color: "#8fc5ff" }}>Go to System Admin</Link>
      </section>
    </main>;
  }

  const result = await getRecentErrorEvents();
  return <main style={{ minHeight: "100vh", padding: "32px 20px 64px", background: "#080d18", color: "#eef3ff" }}>
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #26364e", paddingBottom: 20 }}>
        <div><Link href="/admin" style={{ color: "#8fc5ff", fontWeight: 800, letterSpacing: ".14em" }}>COGNIX</Link><p style={{ margin: "8px 0 0", color: "#aab8ce" }}>LML · Error Intelligence</p></div>
        <Link href="/admin" style={{ color: "#8fc5ff" }}>Back to System Admin</Link>
      </header>
      <section style={{ margin: "28px 0", padding: 22, borderRadius: 14, border: "1px solid #26364e", background: "#111b2c" }}>
        <p style={{ margin: 0, color: "#8fa4c0", fontSize: 12, letterSpacing: ".12em" }}>LML RECEIVER · STAGE B</p>
        <h1 style={{ margin: "10px 0", fontSize: 30 }}>Technical error events</h1>
        <p style={{ margin: 0, color: "#aab8ce", lineHeight: 1.7 }}>Only allowlisted technical metadata is retained. No user identity, request body, raw exception, stack trace, or business record is accepted.</p>
      </section>
      {!result.available ? <p role="status" style={{ color: "#f4c66a" }}>Private event storage is not configured or unavailable.</p>
        : result.events.length === 0 ? <section style={{ padding: 20, border: "1px solid #26364e", borderRadius: 12, background: "#111b2c" }}><h2>No application error events received</h2><p style={{ color: "#aab8ce" }}>The authenticated receiver is ready. No SAGA, CLEAR Sys, or ROAMPH adapters are connected yet.</p></section>
        : <section style={{ display: "grid", gap: 12 }}>
          <p style={{ color: "#8fa4c0", fontSize: 13 }}>Showing the latest {result.events.length} events. Retention is limited to 30 days and 1,000 events.</p>
          {result.events.map((event) => <article key={event.eventRef} style={{ padding: 18, border: "1px solid #26364e", borderRadius: 12, background: "#111b2c" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ textTransform: "uppercase" }}>{event.app} · {event.category.replaceAll("_", " ")}</strong>
              <span style={{ color: event.severity === "critical" ? "#ff8585" : event.severity === "error" ? "#f4c66a" : "#8fc5ff", fontSize: 12, fontWeight: 700 }}>{event.severity.toUpperCase()}</span>
            </div>
            <p style={{ color: "#aab8ce", margin: "8px 0" }}>Component: {event.component} · Operation: {event.operationCode ?? "—"} · HTTP: {event.httpStatusClass}</p>
            <p style={{ color: "#8fa4c0", fontSize: 12, margin: "8px 0" }}>Occurred {localDate(event.occurredAt)} · Received {localDate(event.receivedAt)} · {event.environment}</p>
            <p style={{ color: "#718198", fontSize: 11, overflowWrap: "anywhere" }}>Reference: {event.eventRef} · Fingerprint: {event.fingerprint}</p>
          </article>)}
        </section>}
      <footer style={{ marginTop: 32, borderTop: "1px solid #26364e", paddingTop: 18, color: "#718198", fontSize: 12, lineHeight: 1.7 }}>
        Events are advisory diagnostics only. Cognix does not retry transactions, modify application data, edit code, restart services, or deploy fixes.
      </footer>
    </div>
  </main>;
}
