import Link from "next/link";

const apps = [
  {
    name: "SAGA",
    category: "Academic intelligence",
    description: "Teacher assistance, class summaries, attendance insights, and academic analytics.",
    status: "Pilot integration",
  },
  {
    name: "CLEAR Sys",
    category: "Financial administration",
    description: "Collections insights, audit assistance, and student clearance support.",
    status: "Planned integration",
  },
  {
    name: "ROAMPH",
    category: "Mobility operations",
    description: "Fleet utilization, booking summaries, overdue rentals, and payment-status insights.",
    status: "Planned integration",
  },
];

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", overflow: "hidden", background: "radial-gradient(ellipse at 75% 5%, rgba(40,105,190,.22), transparent 38%), #080d18" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px 72px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, borderBottom: "1px solid rgba(180,200,235,.14)", paddingBottom: 22 }}>
          <Link href="/" style={{ color: "#f5f8ff", textDecoration: "none", fontWeight: 800, letterSpacing: ".18em", fontSize: 18 }}>COGNIX<span style={{ color: "#69b7ff" }}>.</span></Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 18 }}><span style={{ color: "#9baac2", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase" }}>Shared intelligence platform</span><Link href="/admin" style={{ color: "#9bcfff", fontSize: 13, textDecoration: "none" }}>System Admin</Link></nav>
        </header>

        <section style={{ padding: "100px 0 76px", maxWidth: 820 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, border: "1px solid rgba(105,183,255,.32)", borderRadius: 999, padding: "8px 13px", color: "#9bcfff", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#64d6a3", display: "inline-block" }} />
            Governed agentic AI
          </div>
          <h1 style={{ margin: "26px 0 18px", fontSize: "clamp(48px, 8vw, 88px)", lineHeight: .98, letterSpacing: "-.065em", fontWeight: 750 }}>
            One intelligence.<br /><span style={{ color: "#75baff" }}>Many possibilities.</span>
          </h1>
          <p style={{ maxWidth: 650, color: "#aab8ce", fontSize: 19, lineHeight: 1.75, margin: "0 0 30px" }}>
            COGNIX connects your applications to a shared, governed intelligence layer—helping teams understand information, surface insights, and make better decisions.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <a href="/api/health" style={{ display: "inline-block", borderRadius: 9, padding: "13px 18px", background: "#75baff", color: "#07101e", fontWeight: 700, textDecoration: "none" }}>View system status ↗</a>
            <span style={{ color: "#8292aa", fontSize: 13 }}>Think. Connect. Execute.</span>
          </div>
        </section>

        <section style={{ borderTop: "1px solid rgba(180,200,235,.14)", paddingTop: 32 }}>
          <div style={{ color: "#75baff", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 700 }}>Connected applications</div>
          <h2 style={{ fontSize: 30, letterSpacing: "-.035em", margin: "12px 0 24px" }}>Built to work across your ecosystem.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
            {apps.map((app) => (
              <article key={app.name} style={{ background: "rgba(20,31,50,.72)", border: "1px solid rgba(180,200,235,.14)", borderRadius: 14, padding: 22 }}>
                <div style={{ color: "#7ebfff", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700 }}>{app.category}</div>
                <h3 style={{ fontSize: 23, margin: "12px 0 10px" }}>{app.name}</h3>
                <p style={{ color: "#aab8ce", fontSize: 14, lineHeight: 1.7, minHeight: 72 }}>{app.description}</p>
                <div style={{ borderTop: "1px solid rgba(180,200,235,.12)", paddingTop: 14, color: "#8f9db3", fontSize: 12 }}>{app.status}</div>
              </article>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 54, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
          {["Permission-aware by design", "Read-only pilot workflows", "No direct app-database access"].map((item) => (
            <div key={item} style={{ padding: "15px 17px", borderLeft: "2px solid #579fe8", background: "rgba(20,31,50,.45)", color: "#bdc9da", fontSize: 13 }}>{item}</div>
          ))}
        </section>
        <footer style={{ marginTop: 76, borderTop: "1px solid rgba(180,200,235,.14)", paddingTop: 20, color: "#718198", fontSize: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>© {new Date().getFullYear()} COGNIX</span>
          <span>One intelligence platform. Multiple intelligent applications.</span>
        </footer>
      </div>
    </main>
  );
}
