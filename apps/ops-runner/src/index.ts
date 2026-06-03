// Jaguar ops-runner — runs ON the VPS as a sibling docker-compose service. It
// polls the action queue for operator-APPROVED action requests, executes the
// whitelisted docker-compose/git commands, and writes results back. It never
// approves anything itself; the approval gate lives upstream (web / MCP behind
// the operator secret). See README.md for the docker-compose wiring.

import {
  claimNextApprovedAction,
  completeActionRequest,
  getWorkerHealth,
  recordOperationalEvent,
} from "@jaguar/db";

import { loadOpsRunnerEnv } from "./env.js";
import { executeAction } from "./executors.js";

const env = loadOpsRunnerEnv();
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let draining = false;
let stopped = false;

// After a worker restart, poll health (~60s) and emit recovery_complete once healthy.
const verifyRecovery = async (actionId: string) => {
  for (let i = 0; i < 12; i += 1) {
    const health = await getWorkerHealth();
    if (health?.assessment.status === "healthy") {
      await recordOperationalEvent({
        type: "recovery_complete",
        severity: "info",
        subsystem: "ops-runner",
        title: "Worker restart verified healthy",
        summary: "Worker heartbeat and ingestion recovered after restart.",
        actionRequestId: actionId,
      });
      return;
    }
    await delay(5_000);
  }
  console.warn(`[ops-runner] recovery not confirmed healthy within timeout for ${actionId}`);
};

const tick = async () => {
  if (draining || stopped) return;
  draining = true;
  try {
    for (;;) {
      const action = await claimNextApprovedAction(env.allowedActions);
      if (!action) break;

      console.log(`[ops-runner] executing ${action.actionType} (${action.id})`);
      try {
        const result = await executeAction(action, env);
        await completeActionRequest({ id: action.id, outcome: "executed", result });
        console.log(`[ops-runner] executed ${action.id}`);
        if (action.actionType === "worker_restart") {
          await verifyRecovery(action.id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ops-runner] action ${action.id} failed:`, message);
        await completeActionRequest({
          id: action.id,
          outcome: "failed",
          result: { error: message },
        });
      }
    }
  } catch (error) {
    console.error("[ops-runner] poll loop error", error);
  } finally {
    draining = false;
  }
};

const timer = setInterval(() => void tick(), env.pollMs);

const shutdown = () => {
  stopped = true;
  clearInterval(timer);
  console.log("[ops-runner] shutting down");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(
  `[ops-runner] started — polling every ${env.pollMs}ms for [${env.allowedActions.join(", ")}] · compose: ${env.composeFile}`,
);
void tick();
