"use client";

import { useEffect, useTransition } from "react";

import type { AgentMemoRecord, Persona, Verdict } from "@jaguar/domain";

import { generateAgentDebate } from "@/app/(shell)/launches/[id]/actions";

type Props = {
  launchId: string;
  agentMemo: AgentMemoRecord | null;
  currentScore: number;
  currentVerdict: Verdict;
  activePersona: Persona;
  activePersonaLabel: string;
};

const STALE_MS = 15 * 60 * 1000; // 15 minutes

const relativeTime = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h ago` : `${hrs}h ${rem}m ago`;
};

const isStale = (memo: AgentMemoRecord, currentScore: number) => {
  const ageTooOld = Date.now() - new Date(memo.generatedAt).getTime() > STALE_MS;
  const scoreDrifted = Math.abs(currentScore - memo.scoreAtMemo) >= 8;
  return ageTooOld || scoreDrifted;
};

// Derive a fallback headline from verdict when old memos predate the headline field
const fallbackHeadline = (verdict: Verdict): string => {
  if (verdict === "enter") return "This one's live.";
  if (verdict === "watch") return "Worth watching.";
  return "Skip it.";
};

function LoadingState() {
  return (
    <div className="memo-loading">
      <div className="memo-loading-text">
        hey, on it
        <span className="memo-loading-dots">
          <span>.</span><span>.</span><span>.</span>
        </span>
      </div>
      <div className="memo-loading-sub">reading signals, back in a sec</div>
    </div>
  );
}

function MemoBody({ memo, currentScore, currentVerdict }: {
  memo: AgentMemoRecord;
  currentScore: number;
  currentVerdict: Verdict;
}) {
  const headline = memo.headline ?? fallbackHeadline(currentVerdict);
  const modelShort = memo.modelUsed.includes("haiku")
    ? "haiku"
    : memo.modelUsed.includes("sonnet")
      ? "sonnet"
      : memo.modelUsed.includes("gpt")
        ? memo.modelUsed
        : memo.modelUsed;

  return (
    <div className="memo-convo">
      <div className="memo-headline">{headline}</div>

      <div className="memo-prose-block">
        <span className="memo-mini-label">why</span>
        <p className="memo-prose">{memo.bull}</p>
      </div>

      <div className="memo-prose-block">
        <span className="memo-mini-label">what could go wrong</span>
        <p className="memo-prose">{memo.bear}</p>
      </div>

      <div className="memo-prose-block">
        <span className="memo-mini-label">next move</span>
        <p className="memo-prose">{memo.verdict}</p>
      </div>

      <div className="memo-convo-footer">
        <span>{modelShort} · {relativeTime(memo.generatedAt)}</span>
        <span>conf {memo.confidence}</span>
        <span>score {memo.scoreAtMemo} → {currentScore}</span>
      </div>
    </div>
  );
}

export function AgentMemoCard({
  launchId,
  agentMemo,
  currentScore,
  currentVerdict,
  activePersona,
  activePersonaLabel,
}: Props) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const needsGeneration = !agentMemo || isStale(agentMemo, currentScore);
    if (needsGeneration) {
      startTransition(async () => {
        await generateAgentDebate(launchId);
      });
    }
  }, [launchId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card c-conviction">
      <div className="list-head">
        <h3>Jaguar's take</h3>
        <span className="count-pill muted">
          {isPending ? "thinking…" : `${activePersonaLabel} lens`}
        </span>
      </div>

      <div className="memo-panel">
        {isPending ? (
          <LoadingState />
        ) : agentMemo ? (
          <MemoBody
            memo={agentMemo}
            currentScore={currentScore}
            currentVerdict={currentVerdict}
          />
        ) : (
          <LoadingState />
        )}
      </div>
    </div>
  );
}
