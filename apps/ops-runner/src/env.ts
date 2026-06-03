import type { ActionType } from "@jaguar/db";

export type OpsRunnerEnv = {
  pollMs: number;
  allowedActions: ActionType[];
  composeFile: string;
  repoDir: string;
};

const ALL_ACTIONS: ActionType[] = ["worker_restart", "rollback", "health_verify"];

// rollback is opt-in (it rebuilds): default whitelist excludes it.
const DEFAULT_ALLOWED = "worker_restart,health_verify";

export const loadOpsRunnerEnv = (): OpsRunnerEnv => {
  const pollMs = Number.parseInt(process.env.OPS_RUNNER_POLL_MS ?? "", 10);
  const allowedRaw = (process.env.OPS_RUNNER_ALLOWED_ACTIONS ?? DEFAULT_ALLOWED)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Intersect requested with known action types so a typo can never widen scope.
  const allowedActions = ALL_ACTIONS.filter((a) => allowedRaw.includes(a));

  return {
    pollMs: Number.isFinite(pollMs) && pollMs >= 1000 ? pollMs : 10_000,
    allowedActions: allowedActions.length > 0 ? allowedActions : ["health_verify"],
    composeFile: process.env.OPS_RUNNER_COMPOSE_FILE ?? "/opt/jaguar/docker-compose.yml",
    repoDir: process.env.OPS_RUNNER_REPO_DIR ?? "/opt/jaguar",
  };
};
