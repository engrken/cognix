import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, isAdminConfigured, verifyAdminSession } from "@/lib/admin-session";
import { getSystemStatus } from "@/lib/system-monitor";
import OperationsAgent from "./operations-agent";
import AgentRegistry from "./agent-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const palette = {
  healthy: { color: "#74dfb0", label: "Healthy" },
  degraded: { color: "#f4c66a", label: "Degraded" },
  unhealthy: { color: "#ff8585", label: "Unhealthy" },
};

function formatDuration(milliseconds: number | null) {
  if (milliseconds === null) return "Ongoing";
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; setup?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const authenticated = verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
  const configured = isAdminConfigured();

  if (!authenticated) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#080d18", color: "#eef3ff" }}>
        <section style={{ width: "100%", maxWidth: 420, padding: 28, border: "1px solid #26364e", borderRadius: 16, background: "#111b2c" }}>
          <Link href="/" style={{ color: "#8fc5ff", textDecoration: "none", fontWeight: 800, letterSpacing: ".14em" }}>COGNIX</Link>
          <h1 style={{ margin: "24px 0 8px", fontSize: 28 }}>System Admin</h1>
          <p style={{ color: "#aab8ce", lineHeight: 1.6 }}>Restricted operations dashboard. Sign in with the administrator credential.</p>
          {!configured ? (
            <p role="alert" style={{ padding: 14, borderRadius: 10, background: "#3a2c17", color: "#f4d49a", lineHeight: 1.6 }}>
              Admin access is not configured. Set COGNIX_ADMIN_PASSWORD and COGNIX_ADMIN_SESSION_SECRET (at least 32 characters) in the COGNIX deployment environment before enabling this dashboard.
            </p>
          ) : (
            <form action="/api/admin/login" method="post" style={{ display: "grid", gap: 12 }}>
              {params.error && <p role="alert" style={{ color: "#ff9999" }}>Sign-in failed. Check the credential and try again.</p>}
              <label htmlFor="password" style={{ color: "#c7d4e7", fontSize: 13 }}>Administrator password</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" style={{ padding: 13, borderRadius: 8, border: "1px solid #40516a", background: "#080d18", color: "#fff" }} />
              <button type="submit" style={{ padding: 13, border: 0, borderRadius: 8, background: "#75baff", color: "#07101e", fontWeight: 700 }}>Sign in</button>
            </form>
          )}
          <p style={{ color: "#718198", fontSize: 12, marginTop: 24 }}>Monitoring is read-only. No application data or database records are accessed.</p>
        </section>
      </main>
    );
  }

  const status = await getSystemStatus("dashboard", { persist: false });
  const history = status.history;
  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px 64px", background: "#080d18", color: "#eef3ff" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #26364e", paddingBottom: 20 }}>
          <div><Link href="/" style={{ color: "#8fc5ff", textDecoration: "none", fontWeight: 800, letterSpacing: ".14em" }}>COGNIX</Link><p style={{ margin: "8px 0 0", color: "#aab8ce" }}>System Admin · Read-only monitoring · <Link href="/admin/learning" style={{ color: "#8fc5ff" }}>LML Incident Learning</Link> · <Link href="/admin/errors" style={{ color: "#8fc5ff" }}>Incident Intelligence</Link></p></div>
          <form action="/api/admin/logout" method="post"><button type="submit" style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #40516a", background: "transparent", color: "#d7e2f2" }}>Sign out</button></form>
        </header>

        <section style={{ margin: "28px 0", padding: 22, borderRadius: 14, border: "1px solid #26364e", background: "#111b2c" }}>
          <p style={{ margin: 0, color: "#8fa4c0", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>Ecosystem status</p>
          <h1 style={{ margin: "10px 0", fontSize: 32, textTransform: "capitalize" }}>{status.overall}</h1>
          <p style={{ margin: 0, color: "#aab8ce" }}>{status.summary.healthy} healthy · {status.summary.degraded} degraded · {status.summary.unhealthy} unhealthy · Checked {new Date(status.checkedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</p>
        </section>

        <section>
          <h2 style={{ fontSize: 20 }}>Applications</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
            {status.services.map((service) => {
              const style = palette[service.status];
              return <article key={service.id} style={{ padding: 20, borderRadius: 12, border: "1px solid #26364e", background: "#111b2c" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 19 }}>{service.name}</h3>
                  <span style={{ color: style.color, fontSize: 12, fontWeight: 700 }}>{style.label}</span>
                </div>
                <p style={{ color: "#8fa4c0", fontSize: 12 }}>{service.endpoint} · HTTP {service.httpStatus ?? "—"} · {service.latencyMs ?? "—"} ms</p>
                <p style={{ color: "#b9c7da", fontSize: 14, lineHeight: 1.6 }}>{service.detail}</p>
              </article>;
            })}
          </div>
        </section>

        <section style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 20 }}>Historical availability</h2>
          {!history.available ? (
            <p role="status" style={{ color: "#f4c66a" }}>History storage is currently unavailable. Live health checks are still active.</p>
          ) : history.sampleCount === 0 ? (
            <p style={{ color: "#aab8ce" }}>No historical checks have been recorded yet.</p>
          ) : (
            <>
              <p style={{ color: "#8fa4c0", fontSize: 13 }}>{history.sampleCount} recorded checks · {history.periodStart ? new Date(history.periodStart).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "—"} to {history.periodEnd ? new Date(history.periodEnd).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "—"}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
                {history.availability.map((item) => (
                  <article key={item.id} style={{ padding: 16, borderRadius: 10, border: "1px solid #26364e", background: "#111b2c" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{item.name}</h3>
                    <p style={{ margin: "0 0 6px", color: "#74dfb0", fontSize: 24, fontWeight: 800 }}>{item.healthyPercent === null ? "—" : `${item.healthyPercent}%`}</p>
                    <p style={{ margin: 0, color: "#8fa4c0", fontSize: 12 }}>{item.healthyChecks} healthy / {item.totalChecks} samples</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 20 }}>Incident history</h2>
          {!history.available ? (
            <p style={{ color: "#8fa4c0" }}>Incident history will appear when storage is available.</p>
          ) : history.incidents.length === 0 ? (
            <p style={{ color: "#74dfb0" }}>No incidents observed in recorded checks.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {history.incidents.map((incident) => (
                <article key={incident.id} style={{ padding: 16, borderRadius: 10, border: "1px solid #26364e", background: "#111b2c" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <strong>{incident.service}</strong>
                    <span style={{ color: incident.resolved ? "#74dfb0" : "#ff8585", fontSize: 12, fontWeight: 700 }}>{incident.resolved ? "Resolved" : "Ongoing"} · {incident.severity}</span>
                  </div>
                  <p style={{ margin: "8px 0 0", color: "#8fa4c0", fontSize: 12 }}>Started {new Date(incident.startedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} · Duration {formatDuration(incident.durationMs)}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 20 }}>Recommended checks</h2>
          {status.recommendations.length === 0 ? <p style={{ color: "#74dfb0" }}>No availability issues detected in this check.</p> : <ul style={{ paddingLeft: 22, color: "#c5d1e1", lineHeight: 1.8 }}>{status.recommendations.map((item) => <li key={item.service}><strong>{item.service} ({item.priority})</strong>: {item.action}</li>)}</ul>}
        </section>

        <OperationsAgent />
        <AgentRegistry />

        <footer style={{ marginTop: 36, paddingTop: 18, borderTop: "1px solid #26364e", color: "#718198", fontSize: 12, lineHeight: 1.7 }}>
          {status.scope}<br />Checks run daily automatically and whenever the dashboard is opened. Availability percentages reflect recorded samples, not continuous minute-by-minute uptime.
          <p><Link href="/admin" style={{ color: "#8fc5ff" }}>Refresh status</Link> · <Link href="/api/admin/status" style={{ color: "#8fc5ff" }}>Protected status API</Link></p>
        </footer>
      </div>
    </main>
  );
}
