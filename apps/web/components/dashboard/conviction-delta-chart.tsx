type DeltaBar = {
  label: string;
  value: number;
  cap: number;
};

type Props = {
  delta1m: number;
  delta5m: number;
  delta15m: number;
  delta1h: number;
  score: number;
};

function Bar({ label, value, cap }: DeltaBar) {
  const pct = Math.min(Math.abs(value) / cap, 1) * 100;
  const positive = value >= 0;

  return (
    <div className="cd-bar-col">
      <div className="cd-bar-track">
        {/* positive bar grows upward from centre */}
        <div className="cd-half cd-half-pos">
          {positive && (
            <div
              className="cd-fill cd-fill-pos"
              style={{ height: `${pct}%` }}
            />
          )}
        </div>
        {/* negative bar grows downward from centre */}
        <div className="cd-half cd-half-neg">
          {!positive && (
            <div
              className="cd-fill cd-fill-neg"
              style={{ height: `${pct}%` }}
            />
          )}
        </div>
      </div>
      <div className="cd-value" style={{ color: positive ? "var(--green-2)" : "#dc2626" }}>
        {positive ? "+" : ""}{value.toFixed(1)}
      </div>
      <div className="cd-label">{label}</div>
    </div>
  );
}

export function ConvictionDeltaChart({ delta1m, delta5m, delta15m, delta1h, score }: Props) {
  const bars: DeltaBar[] = [
    { label: "1m", value: delta1m, cap: 20 },
    { label: "5m", value: delta5m, cap: 30 },
    { label: "15m", value: delta15m, cap: 35 },
    { label: "1h", value: delta1h, cap: 35 },
  ];

  const direction =
    delta5m > 2 ? "accelerating" : delta5m < -2 ? "fading" : "flat";

  const directionColor =
    direction === "accelerating"
      ? "var(--green-2)"
      : direction === "fading"
        ? "#dc2626"
        : "var(--muted)";

  return (
    <div className="card c-delta-chart">
      <div className="list-head">
        <h3>Conviction Delta</h3>
        <span className="cd-direction" style={{ color: directionColor }}>
          {direction === "accelerating" ? "↑ building" : direction === "fading" ? "↓ fading" : "→ flat"}
        </span>
      </div>

      <div className="cd-body">
        <div className="cd-bars">
          {bars.map((b) => (
            <Bar key={b.label} {...b} />
          ))}
        </div>

        <div className="cd-legend">
          <div className="cd-legend-row">
            <span className="cd-legend-dot cd-legend-pos" />
            <span>Conviction building</span>
          </div>
          <div className="cd-legend-row">
            <span className="cd-legend-dot cd-legend-neg" />
            <span>Conviction fading</span>
          </div>
          <div className="cd-score-line">
            Current score <strong>{Math.round(score)}</strong> / 100
          </div>
        </div>
      </div>
    </div>
  );
}
