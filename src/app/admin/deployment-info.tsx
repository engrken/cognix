function valueOrUnavailable(value: string | undefined) {
  return value && value.trim().length > 0 ? value : "Unavailable";
}

function shortSha(value: string | undefined) {
  if (!value || !/^[a-f0-9]{7,64}$/i.test(value)) return "Unavailable";
  return value.slice(0, 12);
}

export default function DeploymentInfo() {
  const items = [
    ["Environment", valueOrUnavailable(process.env.VERCEL_ENV)],
    ["Git branch", valueOrUnavailable(process.env.VERCEL_GIT_COMMIT_REF)],
    ["Commit", shortSha(process.env.VERCEL_GIT_COMMIT_SHA)],
    ["Deployment ID", valueOrUnavailable(process.env.VERCEL_DEPLOYMENT_ID)],
    ["Deployment host", valueOrUnavailable(process.env.VERCEL_URL)],
  ];

  return (
    <section aria-labelledby="deployment-info-title" style={{ marginTop: 30 }}>
      <h2 id="deployment-info-title" style={{ fontSize: 20 }}>Deployment metadata</h2>
      <p style={{ color: "#8fa4c0", fontSize: 13, lineHeight: 1.6 }}>
        Read-only Vercel build identity. Values come from deployment system
        environment variables; unavailable values are not inferred.
      </p>
      <dl style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 12,
        margin: 0,
      }}>
        {items.map(([label, value]) => (
          <div key={label} style={{
            padding: 16,
            borderRadius: 10,
            border: "1px solid #26364e",
            background: "#111b2c",
            minWidth: 0,
          }}>
            <dt style={{ color: "#8fa4c0", fontSize: 12 }}>{label}</dt>
            <dd style={{
              margin: "8px 0 0",
              color: "#d7e2f2",
              fontSize: 13,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              overflowWrap: "anywhere",
            }}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
