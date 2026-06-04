import {
  type ActionRequestRecord,
  getIngestionDiagnostics,
  getWorkerHealth,
  recordDeployEvent,
} from "@jaguar/db";

import type { OpsRunnerEnv } from "./env.js";
import { run, tail } from "./exec.js";

export type ExecutionResult = Record<string, unknown>;

// Only these hard-coded command templates ever run. Action payloads contribute
// validated parameters (a git SHA, a service name) — never raw command strings.
const SHA_RE = /^[0-9a-f]{7,40}$/;
const SERVICE_RE = /^[a-z0-9][a-z0-9_-]*$/;

export const executeAction = async (
  action: ActionRequestRecord,
  env: OpsRunnerEnv,
): Promise<ExecutionResult> => {
  switch (action.actionType) {
    case "worker_restart": {
      const result = await run(
        "docker-compose",
        ["-f", env.composeFile, "up", "-d", "--no-build", "jaguar-worker"],
        { cwd: env.repoDir, timeoutMs: 180_000 },
      );
      if (!result.ok) {
        throw new Error(
          `docker-compose restart failed (code ${result.code}): ${tail(result.stderr || result.stdout)}`,
        );
      }
      return {
        command: "docker-compose up -d --no-build jaguar-worker",
        stdout: tail(result.stdout),
      };
    }

    case "rollback": {
      const targetSha = String((action.payload?.targetSha as string | undefined) ?? "").trim();
      const service = String(
        (action.payload?.service as string | undefined) ?? "jaguar-worker",
      ).trim();
      if (!SHA_RE.test(targetSha)) throw new Error(`invalid targetSha: "${targetSha}"`);
      if (!SERVICE_RE.test(service)) throw new Error(`invalid service: "${service}"`);

      const fetch = await run("git", ["-C", env.repoDir, "fetch", "--all"], { timeoutMs: 120_000 });
      if (!fetch.ok) throw new Error(`git fetch failed: ${tail(fetch.stderr)}`);

      const checkout = await run("git", ["-C", env.repoDir, "checkout", targetSha], {
        timeoutMs: 60_000,
      });
      if (!checkout.ok)
        throw new Error(`git checkout ${targetSha} failed: ${tail(checkout.stderr)}`);

      const up = await run(
        "docker-compose",
        ["-f", env.composeFile, "up", "-d", "--build", service],
        { cwd: env.repoDir, timeoutMs: 600_000 },
      );
      if (!up.ok) throw new Error(`docker-compose rebuild failed: ${tail(up.stderr || up.stdout)}`);

      await recordDeployEvent({ gitSha: targetSha, service, source: "ops_runner_rollback" });

      return {
        targetSha,
        service,
        command: `git checkout ${targetSha} && docker-compose up -d --build ${service}`,
        stdout: tail(up.stdout),
      };
    }

    case "health_verify": {
      const [health, diag] = await Promise.all([getWorkerHealth(), getIngestionDiagnostics()]);
      return {
        workerStatus: health?.assessment.status ?? "offline",
        ingestionStatus: diag.assessment.status,
        heartbeatAt: health?.heartbeatAt ?? null,
        reasons: health?.assessment.reasons ?? ["no heartbeat"],
      };
    }

    default:
      throw new Error(`unsupported action type: ${action.actionType}`);
  }
};
