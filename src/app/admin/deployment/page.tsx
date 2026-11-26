import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function display(value: string | undefined) {
  return value && value.trim() ? value : "Unavailable";
}

function commit(value: string | undefined) {
  return value && /^[a-f0-9]{7,64}$/i.test(value) ? value.slice(0, 12) : "Unavailable";
}

export default async function DeploymentPage() {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#080d18", color: "#eef3ff" }}>
        <section style={{ maxWidth: 480, padding: 24, border: "1px solid #26364e", borderRadius: 14, background: "#111b2c" }}>
          <h1>Administrator sign-in required</h1>
          <p style={{ color: "#aab8ce" }}>Deployment metadata is restricted to authenticated administrators.</p>
          <Link href="/admin" style={{ color: "#8fc5ff" }}>Go to System Admin sign-in</Link>
        </section>
      </main>
    );
  }

  const items = [
    ["Environment", display(process.env.VERCEL_ENV)],
    ["Git branch", display(process.env.VERCEL_GIT_COMMIT_REF)],
    ["Commit", commit(process.env.VERCEL_GIT_COMMIT_SHA)],
    ["Deployment ID", display(process.env.VERCEL_DEPLOYMENT_ID)],
    ["Deployment host", display(process.env.VERCEL_URL)],
  ];

  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px 64px", background: "#080d18", color: "#eef3ff" }}>
      <section style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#8fc5ff" }}>← System Admin</Link>
        <h1 style={{ marginTop: 24 }}>Deployment metadata</h1>
        <p style={{ color: "#aab8ce", lineHeight: 1.6 }}>
          Read-only deployment identity supplied by Vercel. This page does not
          trigger deployments, inspect secrets, or access application records.
        </p>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {items.map(([label, value]) => (
            <div key={label} style={{ padding: 18, border: "1px solid #26364e", borderRadius: 10, background: "#111b2c", minWidth: 0 }}>
              <dt style={{ color: "#8fa4c0", fontSize: 12 }}>{label}</dt>
              <dd style={{ margin: "8px 0 0", color: "#d7e2f2", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, overflowWrap: "anywhere" }}>{value}</dd>
            </div>
          ))}
        </dl>
        <p style={{ marginTop: 24, color: "#718198", fontSize: 12 }}>
          Unavailable values are intentionally not inferred. Only non-secret
          deployment identifiers are displayed.
        </p>
      </section>
    </main>
  );
}
