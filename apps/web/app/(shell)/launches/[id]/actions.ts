"use server";

import { revalidatePath } from "next/cache";

import { generateLaunchMemo } from "@jaguar/agent";
import { getLaunchDetail, saveAgentMemo } from "@jaguar/db";
import type { AgentMemoRecord } from "@jaguar/domain";

export type GenerateMemoState = {
  ok: boolean;
  error?: string;
  memo?: AgentMemoRecord;
};

export async function generateAgentDebate(launchId: string): Promise<GenerateMemoState> {
  try {
    const detail = await getLaunchDetail(launchId);
    if (!detail) {
      return { ok: false, error: "Launch not found." };
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
