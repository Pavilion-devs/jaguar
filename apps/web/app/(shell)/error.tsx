"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ShellError({ error, reset }: ErrorProps) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Something broke.</h1>
          <div className="sub">
            This is usually a local database, worker, or dependency issue. Retry first. If it
            persists, check that the worker is ingesting GoldRush data and that Prisma can read the
            local SQLite database.
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card" style={{ gridColumn: "1 / -1", padding: 24 }}>
          <div
            style={{
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 13,
              color: "var(--ink-dim)",
              padding: 14,
              borderRadius: 14,
              background: "var(--card-muted)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message}
          </div>
          <button type="button" onClick={reset} className="btn primary" style={{ marginTop: 18 }}>
            Try again
          </button>
        </div>
      </div>
    </>
  );
}
