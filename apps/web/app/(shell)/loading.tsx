export default function ShellLoading() {
  const tiles = ["s-1", "s-2", "s-3", "s-4"];
  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ color: "var(--ink-dim)" }}>Loading…</h1>
          <div className="sub">Loading latest signals…</div>
        </div>
      </div>
      <div className="dash-grid">
        {tiles.map((id) => (
          <div
            key={id}
            className="card"
            style={{ height: 160, opacity: 0.55, animation: "pulseLoad 1.2s ease-in-out infinite" }}
          />
        ))}
      </div>
    </>
  );
}
