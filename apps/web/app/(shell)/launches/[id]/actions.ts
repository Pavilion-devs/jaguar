"use server";

import { revalidatePath } from "next/cache";

import { generateLaunchMemo } from "@jaguar/agent";
import {
  countAgentMemosSince,
  getLatestAgentMemo,
  getLaunchDetail,
  saveAgentMemo,
} from "@jaguar/db";
import type { AgentMemoRecord } from "@jaguar/domain";

export type GenerateMemoState = {
  ok: boolean;
  error?: string;
  memo?: AgentMemoRecord;
};

const WEB_MEMO_STALE_MS = 60 * 60_000;
const WEB_MEMO_SCORE_DRIFT = 8;
const WEB_MEMO_MAX_PER_HOUR = Number(process.env.JAGUAR_WEB_AGENT_MEMO_MAX_PER_HOUR ?? 10);
const WEB_MEMO_MAX_PER_DAY = Number(process.env.JAGUAR_WEB_AGENT_MEMO_MAX_PER_DAY ?? 50);

const isFreshEnough = (memo: AgentMemoRecord, currentScore: number) => {
  const ageMs = Date.now() - new Date(memo.generatedAt).getTime();
  const scoreDrift = Math.abs(currentScore - memo.scoreAtMemo);
  return ageMs < WEB_MEMO_STALE_MS && scoreDrift < WEB_MEMO_SCORE_DRIFT;
};

const hasMemoBudget = async () => {
  const now = Date.now();
  const [hourlyCount, dailyCount] = await Promise.all([
    countAgentMemosSince(new Date(now - 60 * 60_000)),
    countAgentMemosSince(new Date(now - 24 * 60 * 60_000)),
  ]);

  return hourlyCount < WEB_MEMO_MAX_PER_HOUR && dailyCount < WEB_MEMO_MAX_PER_DAY;
};

export async function generateAgentDebate(launchId: string): Promise<GenerateMemoState> {
  try {
    const detail = await getLaunchDetail(launchId);
    if (!detail) {
      return { ok: false, error: "Launch not found." };
    }

    const latestMemo = await getLatestAgentMemo(launchId);
    if (latestMemo && isFreshEnough(latestMemo, detail.launch.score)) {
      return { ok: true, memo: latestMemo };
    }

    if (process.env.JAGUAR_WEB_AGENT_MEMOS === "false") {
      return latestMemo
        ? { ok: true, memo: latestMemo }
        : { ok: false, error: "Agent memo generation is disabled." };
    }

    if (!(await hasMemoBudget())) {
      return latestMemo
        ? { ok: true, memo: latestMemo }
        : { ok: false, error: "Agent memo budget reached." };
    }

    const memo = await generateLaunchMemo({
      launch: detail.launch,
      recentTimeline: detail.timeline,
    });

    const savedMemo = await saveAgentMemo({
      launchId,
      scoreAtMemo: detail.launch.score,
      verdictAtMemo: detail.launch.verdict,
      reasonsAtMemo: detail.launch.reasons,
      headline: memo.headline,
      bull: memo.bull,
      bear: memo.bear,
      verdict: memo.verdict,
      confidence: memo.confidence,
      modelUsed: memo.modelUsed,
      inputTokens: memo.inputTokens,
      outputTokens: memo.outputTokens,
      cacheReadTokens: memo.cacheReadTokens,
    });

    revalidatePath(`/launches/${launchId}`);
    return { ok: true, memo: savedMemo };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent generation failed.";
    return { ok: false, error: message };
  }
}
