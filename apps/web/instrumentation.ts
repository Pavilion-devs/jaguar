// Next.js instrumentation hook. On Vercel, self-records a deploy event for the
// web app on first cold start of a new build. recordDeployEvent is idempotent
// (no-op when the commit SHA is unchanged), so repeated cold starts are safe.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const gitSha = process.env.VERCEL_GIT_COMMIT_SHA;
  // Only record on Vercel-hosted deploys; skip local dev and previews without a SHA.
  if (!process.env.VERCEL || !gitSha) return;

  try {
    const { recordDeployEvent } = await import("@jaguar/db");
    await recordDeployEvent({
      gitSha,
      service: "jaguar-web",
      source: "vercel_build",
      metadata: {
        env: process.env.VERCEL_ENV ?? null,
        branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      },
    });
  } catch (error) {
    console.error("[instrumentation] web deploy self-record failed", error);
  }
}
