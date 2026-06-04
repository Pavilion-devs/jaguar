import { execFile } from "node:child_process";

export type ExecResult = {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

// Run a command with an explicit argv (no shell), a timeout, and bounded output.
// Using execFile (not exec) means action payloads can never inject shell syntax.
export const run = (
  command: string,
  args: string[],
  options?: { cwd?: string; timeoutMs?: number },
): Promise<ExecResult> =>
  new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        cwd: options?.cwd,
        timeout: options?.timeoutMs ?? 120_000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const code =
          error && typeof (error as { code?: unknown }).code === "number"
            ? (error as { code: number }).code
            : error
              ? 1
              : 0;
        resolve({
          ok: !error,
          code,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
        });
      },
    );
  });

export const tail = (s: string, n = 1200) => (s.length > n ? s.slice(-n) : s);
