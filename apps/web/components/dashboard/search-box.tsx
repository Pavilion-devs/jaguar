"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type LocalResult = {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  pairAddress: string;
  quoteTokenSymbol: string;
  protocol: string;
  score: number;
  verdict: "ignore" | "watch" | "enter";
};

type GoldRushResult = {
  pair_address: string;
  chain_name: string;
  quote_rate_usd?: number | null;
  volume_usd?: number | null;
  swap_count?: number | string | null;
  market_cap?: number | null;
  base_token?: {
    contract_name?: string | null;
    contract_address?: string | null;
    contract_ticker_symbol?: string | null;
  } | null;
  quote_token?: {
    contract_ticker_symbol?: string | null;
  } | null;
  localLaunchId: string | null;
};

type SearchPayload = {
  query: string;
  local: LocalResult[];
  goldrush: GoldRushResult[];
  goldrushError: string | null;
};

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatUsd = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "$0" : compactUsd.format(value);

const shortAddress = (value: string) => `${value.slice(0, 5)}…${value.slice(-4)}`;

const goldRushTokenLabel = (result: GoldRushResult) =>
  result.base_token?.contract_ticker_symbol ||
  result.base_token?.contract_name ||
  shortAddress(result.pair_address);

const goldRushTokenName = (result: GoldRushResult) =>
  result.base_token?.contract_name || result.base_token?.contract_ticker_symbol || "Unknown token";

export function SearchBox() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<SearchPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= 2;
  const hasResults =
    (payload?.local.length ?? 0) > 0 ||
    (payload?.goldrush.length ?? 0) > 0 ||
    Boolean(payload?.goldrushError);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!hasQuery) {
      setPayload(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Search failed with ${response.status}`);
        }

        const nextPayload = (await response.json()) as SearchPayload;
        setPayload(nextPayload);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPayload({
          query: trimmedQuery,
          local: [],
          goldrush: [],
          goldrushError: error instanceof Error ? error.message : "Search failed.",
        });
      } finally {
        setIsLoading(false);
      }
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [hasQuery, trimmedQuery]);

  const firstHref = useMemo(() => {
    if (payload?.local[0]) return `/launches/${payload.local[0].id}`;
    if (payload?.goldrush[0]?.localLaunchId)
      return `/launches/${payload.goldrush[0].localLaunchId}`;
    if (trimmedQuery) return `/lookup?query=${encodeURIComponent(trimmedQuery)}`;
    return "/lookup";
  }, [payload, trimmedQuery]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedQuery) return;
    router.push(firstHref);
    setIsOpen(false);
  };

  return (
    <form className="search search-wrap" onSubmit={submitSearch}>
      <svg viewBox="0 0 24 24" fill="none">
        <title>Search</title>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        placeholder="Search token, pair address..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        autoComplete="off"
      />
      <span className="kbd">⌘ F</span>

      {isOpen && hasQuery ? (
        <div className="search-menu">
          <div className="search-menu-head">
            <span>{isLoading ? "Searching" : "Search results"}</span>
            <Link href={`/lookup?query=${encodeURIComponent(trimmedQuery)}`}>Open lookup</Link>
          </div>

          {!isLoading && !hasResults ? (
            <div className="search-empty">
              No tracked Jaguar result for "{trimmedQuery}". Open lookup to query GoldRush.
            </div>
          ) : null}

          {payload?.local.length ? (
            <div className="search-group">
              <div className="search-group-label">Tracked in Jaguar</div>
              {payload.local.map((result) => (
                <Link
                  className="search-result-row"
                  href={`/launches/${result.id}`}
                  key={result.id}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="search-avatar">{result.tokenSymbol.slice(0, 2)}</span>
                  <span className="search-result-main">
                    <span>
                      {result.tokenName}
                      <b>${result.tokenSymbol}</b>
                    </span>
                    <small>
                      {result.protocol.replace(/_/g, " ")} · pair {shortAddress(result.pairAddress)}
                    </small>
                  </span>
                  <span className={`verdict-pill ${result.verdict}`}>{result.verdict}</span>
                  <span className="score-pill">
                    <span className="score-dot" />
                    {result.score}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {payload?.goldrush.length ? (
            <div className="search-group">
              <div className="search-group-label">GoldRush Solana</div>
              {payload.goldrush.map((result) => {
                const href = result.localLaunchId
                  ? `/launches/${result.localLaunchId}`
                  : `/lookup?query=${encodeURIComponent(result.pair_address)}`;

                return (
                  <Link
                    className="search-result-row"
                    href={href}
                    key={result.pair_address}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="search-avatar">{goldRushTokenLabel(result).slice(0, 2)}</span>
                    <span className="search-result-main">
                      <span>
                        {goldRushTokenName(result)}
                        <b>${goldRushTokenLabel(result)}</b>
                      </span>
                      <small>
                        {formatUsd(result.volume_usd)} vol · {formatUsd(result.market_cap)} mcap
                      </small>
                    </span>
                    <span className="lookup-pill">
                      {result.localLaunchId ? "Tracked" : "Lookup"}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {payload?.goldrushError ? (
            <div className="search-error">GoldRush: {payload.goldrushError}</div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
