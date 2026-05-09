type Props = {
  percent: number;
  label?: string;
  validatedCount: number;
  openCount: number;
  failedCount: number;
};

const GAUGE_ARC = "M 30 124 A 90 90 0 0 1 210 124";

export function WinrateGauge({
  percent,
  label = "Calls Validated",
  validatedCount,
  openCount,
  failedCount,
}: Props) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const displayPct = Math.round(clampedPercent);

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
        <svg className="gauge-svg" viewBox="0 0 240 160" role="img" aria-label={`Win rate ${displayPct}%`}>
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
            d={GAUGE_ARC}
            fill="none"
            stroke="url(#gaugeStripe)"
            strokeWidth={26}
            strokeLinecap="round"
            pathLength={100}
          />
          {clampedPercent > 0 ? (
            <>
              <path
                d={GAUGE_ARC}
                fill="none"
                stroke="#14593a"
                strokeWidth={26}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${clampedPercent} ${100 - clampedPercent}`}
              />
              <path
                d={GAUGE_ARC}
                fill="none"
                stroke="#2ea86b"
                strokeWidth={16}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${clampedPercent} ${100 - clampedPercent}`}
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
