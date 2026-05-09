import Link from "next/link";

import { runJaguarSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    query?: string;
  }>;
};

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatUsd = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "$0" : compactUsd.format(value);

const shortAddress = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

const tokenSymbol = (result: Awaited<ReturnType<typeof runJaguarSearch>>["goldrush"][number]) =>
  result.base_token?.contract_ticker_symbol ||
  result.base_token?.contract_name ||
  shortAddress(result.pair_address);

const tokenName = (result: Awaited<ReturnType<typeof runJaguarSearch>>["goldrush"][number]) =>
  result.base_token?.contract_name || result.base_token?.contract_ticker_symbol || "Unknown token";

const quoteSymbol = (result: Awaited<ReturnType<typeof runJaguarSearch>>["goldrush"][number]) =>
  result.quote_token?.contract_ticker_symbol || "quote";

export default async function LookupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params?.query?.trim() ?? "";
  const results = query
    ? await runJaguarSearch(query, {
        localLimit: 10,
        goldrushLimit: 20,
      })
    : null;

  const localCount = results?.local.length ?? 0;
  const goldRushCount = results?.goldrush.length ?? 0;
  const trackedGoldRushCount =
    results?.goldrush.filter((result) => result.localLaunchId !== null).length ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Token lookup</h1>
          <div className="sub">
            Search GoldRush Solana token and pair data, with persisted Jaguar matches lifted first.
          </div>
        </div>
      </div>

      <form className="lookup-form" action="/lookup">
        <input
          name="query"
          defaultValue={query}
          placeholder="Token name, symbol, token address, or pair address"
        />
        <button className="btn primary" type="submit">
          Search
        </button>
      </form>

      <div className="dash-grid">
        <div className="card lookup-stat dark">
          <span>GoldRush results</span>
          <strong>{goldRushCount}</strong>
          <small>{query ? "Live searchToken query" : "Waiting for a query"}</small>
        </div>
        <div className="card lookup-stat">
          <span>Tracked matches</span>
          <strong>{localCount}</strong>
          <small>Persisted in Jaguar database</small>
        </div>
        <div className="card lookup-stat">
          <span>Linked pairs</span>
          <strong>{trackedGoldRushCount}</strong>
          <small>GoldRush result already has a Jaguar dossier</small>
        </div>
      </div>

      {results?.goldrushError ? <div className="lookup-error">{results.goldrushError}</div> : null}

      {!query ? (
        <div className="card lookup-empty">
          <h3>Manual lookup ready</h3>
          <p>Paste a Solana token address, pair address, ticker, or token name.</p>
        </div>
      ) : null}

      {results && localCount > 0 ? (
        <div className="card lookup-card">
          <div className="list-head">
            <h3>Tracked in Jaguar</h3>
            <span className="count-pill">{localCount} found</span>
          </div>
          <div className="lookup-list">
            {results.local.map((launch) => (
              <Link className="lookup-row" href={`/launches/${launch.id}`} key={launch.id}>
                <span className="search-avatar">{launch.tokenSymbol.slice(0, 2)}</span>
                <span className="lookup-row-main">
                  <strong>
                    {launch.tokenName} <b>${launch.tokenSymbol}</b>
                  </strong>
                  <small>
                    {launch.protocol.replace(/_/g, " ")} · pair {shortAddress(launch.pairAddress)}
                  </small>
                </span>
                <span className={`verdict-pill ${launch.verdict}`}>{launch.verdict}</span>
                <span className="score-pill">
                  <span className="score-dot" />
                  {launch.score}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {results && goldRushCount > 0 ? (
        <div className="card lookup-card">
          <div className="list-head">
            <h3>GoldRush Solana results</h3>
            <span className="count-pill muted">{goldRushCount} live</span>
          </div>
          <div className="lookup-list">
            {results.goldrush.map((result) => (
              <div className="lookup-row" key={result.pair_address}>
                <span className="search-avatar">{tokenSymbol(result).slice(0, 2)}</span>
                <span className="lookup-row-main">
                  <strong>
                    {tokenName(result)} <b>${tokenSymbol(result)}</b>
                  </strong>
                  <small>
                    pair {shortAddress(result.pair_address)} · quote {quoteSymbol(result)}
                  </small>
                </span>
                <span className="lookup-metrics">
                  <span>{formatUsd(result.volume_usd)} vol</span>
                  <span>{formatUsd(result.market_cap)} mcap</span>
                  <span>{formatUsd(result.quote_rate_usd)} quote</span>
                </span>
                {result.localLaunchId ? (
                  <Link className="btn ghost" href={`/launches/${result.localLaunchId}`}>
                    Open dossier
                  </Link>
                ) : (
                  <span className="lookup-pill">GoldRush only</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {results && localCount === 0 && goldRushCount === 0 && !results.goldrushError ? (
        <div className="card lookup-empty">
          <h3>No result</h3>
          <p>GoldRush returned no Solana token or pair matches for "{query}".</p>
        </div>
      ) : null}
    </>
  );
}
