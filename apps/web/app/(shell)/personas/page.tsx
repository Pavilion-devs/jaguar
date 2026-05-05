import Link from "next/link";

import { PERSONA_OPTIONS, personaThresholdLine, withPersonaParam } from "@/lib/persona";

export default function PersonasPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Personas</h1>
          <div className="sub">
            Pick the operating lens Jaguar should use for ranking launches, verdict emphasis, and
            detail-page decision copy.
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card c-launches-full">
          <div className="list-head">
            <h3>Trading lenses</h3>
            <span className="count-pill">{PERSONA_OPTIONS.length} active</span>
          </div>
          <div className="list-rows">
            {PERSONA_OPTIONS.map((persona) => (
              <Link
                key={persona.value}
                href={withPersonaParam("/launches", persona.value)}
                className="launch-row"
              >
                <div className="l-avatar">{persona.label.slice(0, 2).toUpperCase()}</div>
                <div className="l-body">
                  <div className="l-name">{persona.label}</div>
                  <div className="l-meta">
                    {persona.description} {personaThresholdLine(persona.value)}
                  </div>
                </div>
                <div className="l-metrics">
                  <span className="verdict-pill watch">Open lens</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
