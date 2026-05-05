type Props = {
  percent: number;
  label?: string;
  validatedCount: number;
  openCount: number;
  failedCount: number;
};

const CX = 110;
const CY = 120;
const R = 90;

// SVG arc endpoint for a given percent along a 180° gauge from (20, 120) on the
// left through the top to (200, 120) on the right.
const arcEndpoint = (percent: number) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const angle = (1 - clamped / 100) * Math.PI;
  return {
    x: +(CX + R * Math.cos(angle)).toFixed(2),
    y: +(CY - R * Math.sin(angle)).toFixed(2),
  };
};

export function WinrateGauge({
  percent,
  label = "Calls Validated",
  validatedCount,
  openCount,
  failedCount,
}: Props) {
  const end = arcEndpoint(percent);
  const largeArc = percent > 50 ? 1 : 0;
  const displayPct = Math.round(percent);

  return (
    <div className="card c-progress">
      <div className="gauge-head">
        <h3>Win Rate</h3>
        <div className="menu">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <title>More</title>
            <circle cx="5" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </div>
      </div>
      <div className="gauge-wrap">
        <svg width={220} height={140} viewBox="0 0 220 140">
          <title>Win rate gauge</title>
          <defs>
            <pattern
              id="gaugeStripe"
              patternUnits="userSpaceOnUse"
              width={6}
              height={6}
              patternTransform="rotate(45)"
            >
              <rect width={6} height={6} fill="#eef0ea" />
              <rect width={3} height={6} fill="#e3e5df" />
            </pattern>
          </defs>
          <path
            d="M 20 120 A 90 90 0 0 1 200 120"
            fill="none"
            stroke="url(#gaugeStripe)"
            strokeWidth={26}
            strokeLinecap="round"
          />
          {percent > 0 ? (
            <>
              <path
                d={`M 20 120 A 90 90 0 ${largeArc} 1 ${end.x} ${end.y}`}
                fill="none"
                stroke="#14593a"
                strokeWidth={26}
                strokeLinecap="round"
              />
              <path
                d={`M 20 120 A 90 90 0 ${largeArc} 1 ${end.x} ${end.y}`}
                fill="none"
                stroke="#2ea86b"
                strokeWidth={16}
                strokeLinecap="round"
              />
            </>
          ) : null}
        </svg>
        <div className="gauge-value">
          <div className="pct">{displayPct}%</div>
          <div className="lbl">{label}</div>
        </div>
      </div>
      <div className="gauge-legend">
        <div className="lg">
          <span className="sw c" />
          Validated · {validatedCount}
        </div>
        <div className="lg">
          <span className="sw p" />
          Open · {openCount}
        </div>
        <div className="lg">
          <span className="sw pd" />
          Failed · {failedCount}
        </div>
      </div>
    </div>
  );
}
