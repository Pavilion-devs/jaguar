type Props = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: Props) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <div className="sub">{description}</div>
        </div>
      </div>

      <div className="dash-grid">
        <div
          className="card"
          style={{
            gridColumn: "1 / -1",
            padding: 40,
            textAlign: "center",
            color: "var(--ink-dim)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>Coming in PR-2</div>
          <p style={{ marginTop: 10, maxWidth: 480, marginInline: "auto", lineHeight: 1.55 }}>
            This surface will be wired to real data in the next pass. For now the sidebar entry is a
            placeholder so navigation feels complete.
          </p>
        </div>
      </div>
    </>
  );
}
