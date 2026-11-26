import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";
import { getLearningPatterns } from "@/lib/incident-learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

export default async function LearningPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#080d18", color: "#eef3ff" }}>
        <section style={{ maxWidth: 440, padding: 24, border: "1px solid #26364e", borderRadius: 14, background: "#111b2c" }}>
          <h1>Administrator sign-in required</h1>
          <p style={{ color: "#aab8ce" }}>Incident learning is restricted to authenticated Cognix administrators.</p>
          <Link href="/admin" style={{ color: "#8fc5ff" }}>Go to System Admin</Link>
        </section>
      </main>
    );
  }

  const params = await searchParams;
  const overview = await getLearningPatterns();

  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px 64px", background: "#080d18", color: "#eef3ff" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #26364e", paddingBottom: 20 }}>
          <div>
            <Link href="/admin" style={{ color: "#8fc5ff", textDecoration: "none", fontWeight: 800, letterSpacing: ".14em" }}>COGNIX</Link>
            <p style={{ margin: "8px 0 0", color: "#aab8ce" }}>Learning Machine Layer · Incident Memory</p>
          </div>
          <Link href="/admin" style={{ color: "#8fc5ff" }}>Back to System Admin</Link>
        </header>

        <section style={{ margin: "28px 0", padding: 22, borderRadius: 14, border: "1px solid #26364e", background: "#111b2c" }}>
          <p style={{ margin: 0, color: "#8fa4c0", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>LML Phase 1</p>
          <h1 style={{ margin: "10px 0", fontSize: 30 }}>Incident learning</h1>
          <p style={{ margin: 0, color: "#aab8ce", lineHeight: 1.7 }}>Patterns are derived from existing technical health snapshots only. Cognix does not inspect application databases, business records, or raw application logs here.</p>
        </section>

        {params.saved === "1" && <p role="status" style={{ padding: 14, borderRadius: 10, background: "#123326", color: "#9be2bd" }}>Verified learning saved to private Cognix incident memory.</p>}

        {!overview.available ? (
          <p role="status" style={{ color: "#f4c66a" }}>Private incident-learning storage is unavailable. Configure the existing private Blob storage before using this feature.</p>
        ) : overview.patterns.length === 0 ? (
          <section style={{ padding: 20, borderRadius: 12, border: "1px solid #26364e", background: "#111b2c" }}>
            <h2 style={{ marginTop: 0 }}>No non-healthy patterns recorded</h2>
            <p style={{ color: "#aab8ce", lineHeight: 1.7 }}>As future monitoring snapshots record degraded or unhealthy readiness checks, Cognix will group matching technical symptoms here. A healthy check is not treated as an incident.</p>
          </section>
        ) : (
          <section style={{ display: "grid", gap: 14 }}>
            <p style={{ color: "#8fa4c0", fontSize: 13 }}>{overview.patterns.length} distinct technical patterns derived from recorded observations.</p>
            {overview.patterns.map((pattern) => (
              <article key={pattern.fingerprint} style={{ padding: 20, borderRadius: 12, border: "1px solid #26364e", background: "#111b2c" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 19 }}>{pattern.application}</h2>
                    <p style={{ margin: "6px 0", color: "#8fa4c0", fontSize: 12 }}>{pattern.signal} · HTTP {pattern.httpStatusClass}</p>
                  </div>
                  <span style={{ color: pattern.severity === "unhealthy" ? "#ff8585" : "#f4c66a", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>{pattern.severity}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: "14px 0" }}>
                  <div><p style={{ margin: 0, color: "#8fa4c0", fontSize: 11 }}>Observations</p><strong>{pattern.observations}</strong></div>
                  <div><p style={{ margin: 0, color: "#8fa4c0", fontSize: 11 }}>First observed</p><strong style={{ fontSize: 13 }}>{formatDate(pattern.firstSeenAt)}</strong></div>
                  <div><p style={{ margin: 0, color: "#8fa4c0", fontSize: 11 }}>Last observed</p><strong style={{ fontSize: 13 }}>{formatDate(pattern.lastSeenAt)}</strong></div>
                  <div><p style={{ margin: 0, color: "#8fa4c0", fontSize: 11 }}>Average response</p><strong>{pattern.averageLatencyMs === null ? "—" : `${pattern.averageLatencyMs} ms`}</strong></div>
                </div>
                {pattern.verifiedLearning ? (
                  <div style={{ padding: 14, borderRadius: 9, background: "#123326", border: "1px solid #245b43" }}>
                    <strong style={{ color: "#9be2bd" }}>Verified learning recorded</strong>
                    <p style={{ margin: "8px 0", color: "#d0e9dc" }}><strong>Confirmed cause:</strong> {pattern.verifiedLearning.confirmedCause}</p>
                    <p style={{ margin: "8px 0", color: "#d0e9dc" }}><strong>Verified resolution:</strong> {pattern.verifiedLearning.resolution}</p>
                    <p style={{ margin: 0, color: "#8fa4c0", fontSize: 11 }}>Reviewed {formatDate(pattern.verifiedLearning.verifiedAt)} · authenticated administrator</p>
                  </div>
                ) : (
                  <form action="/api/admin/learning" method="post" style={{ display: "grid", gap: 10, marginTop: 12, paddingTop: 14, borderTop: "1px solid #26364e" }}>
                    <strong>Record a verified resolution</strong>
                    <p style={{ margin: 0, color: "#8fa4c0", fontSize: 12, lineHeight: 1.6 }}>Only submit this after a human has confirmed the root cause, applied the resolution through the owning application, and verified recovery. Do not enter secrets, personal data, raw logs, or business records.</p>
                    <input type="hidden" name="fingerprint" value={pattern.fingerprint} />
                    <input type="hidden" name="applicationId" value={pattern.applicationId} />
                    <label style={{ display: "grid", gap: 6, color: "#c7d4e7", fontSize: 13 }}>Confirmed root cause
                      <textarea name="confirmedCause" required maxLength={500} rows={2} style={{ padding: 10, borderRadius: 8, border: "1px solid #40516a", background: "#080d18", color: "#fff", resize: "vertical" }} />
                    </label>
                    <label style={{ display: "grid", gap: 6, color: "#c7d4e7", fontSize: 13 }}>Resolution that was tested successfully
                      <textarea name="resolution" required maxLength={500} rows={2} style={{ padding: 10, borderRadius: 8, border: "1px solid #40516a", background: "#080d18", color: "#fff", resize: "vertical" }} />
                    </label>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#c7d4e7", fontSize: 12, lineHeight: 1.5 }}>
                      <input type="checkbox" name="verificationConfirmed" value="yes" required />
                      I confirm this resolution was tested and the service recovered.
                    </label>
                    <button type="submit" style={{ justifySelf: "start", padding: "10px 14px", border: 0, borderRadius: 8, background: "#75baff", color: "#07101e", fontWeight: 700 }}>Save verified learning</button>
                  </form>
                )}
              </article>
            ))}
          </section>
        )}

        <footer style={{ marginTop: 32, paddingTop: 18, borderTop: "1px solid #26364e", color: "#718198", fontSize: 12, lineHeight: 1.7 }}>
          Incident fingerprints use application ID, readiness status, signal category, and HTTP status class. This initial version groups observations; it does not claim a predicted outage or automatically resolve issues.
        </footer>
      </div>
    </main>
  );
}
