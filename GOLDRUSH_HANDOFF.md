# Jaguar / GoldRush Handoff

Last updated: 2026-05-09

This file is for a future agent or fresh chat session taking over the Jaguar GoldRush project. It captures the product context, deployment state, VPS setup, and the operational commands that have already been used.

## Product Summary

Jaguar is a real-time Solana launch conviction engine powered by GoldRush.

The worker streams live GoldRush data, persists launches and metrics into the database, scores each launch, and the web app presents persona-specific verdicts, paper calls, scorecards, alerts, and Claude-powered analyst memos.

Important product rule from `AGENTS.md`: runtime UI must not use mock launch data, hardcoded live rows, fake API responses, placeholder market metrics, localStorage as canonical product state, or fake AI explanations. If a user sees a launch, score, verdict, memo, or timeline entry, it must be backed by real GoldRush data and real application logic.

## Repo

Local path:

```bash
/Users/favourolaboye/Downloads/claude-code/frontier/tracks/goldrush
```

Monorepo layout:

```text
apps/web       Next.js 15 frontend
apps/worker    Node worker for GoldRush ingestion and scoring
packages/db    Prisma schema, generated client, DB operations
packages/goldrush GoldRush GraphQL/WebSocket client
packages/scoring Conviction scoring logic
packages/agent  Claude/OpenAI analyst memo generation
packages/domain Shared types
```

Package manager:

```bash
pnpm@10.10.0
```

Common commands:

```bash
pnpm install
pnpm --filter @jaguar/web typecheck
pnpm --filter @jaguar/web build
pnpm --filter @jaguar/worker typecheck
pnpm db:generate
pnpm db:push
pnpm dev:web
pnpm dev:worker
```

## Production Web Deployment

Provider: Vercel

Production URL:

```text
https://www.jaguaralpha.xyz
```

Vercel project:

```text
projectName: jaguar
projectId: prj_JCXHLbpZHoXD7lolSwhCwEcOgYjt
orgId: team_0rpv72ltY8JpwGL7PmGOJnPA
```

Local Vercel link:

```text
.vercel/project.json
```

Deploy command from repo root:

```bash
vercel deploy --prod --yes
```

Useful Vercel checks:

```bash
vercel project ls
vercel env ls
vercel inspect https://www.jaguaralpha.xyz
```

Production web env vars are configured in Vercel. Do not paste secrets into this file. Required categories:

```text
DATABASE_URL
DIRECT_URL
GOLDRUSH_API_KEY
GOLDRUSH_STREAM_URL
NEXT_PUBLIC_APP_URL
DEFAULT_CHAIN
TRACKED_PROTOCOLS
ANTHROPIC_API_KEY
JAGUAR_AGENT_PROVIDER
OPENAI_API_KEY, only if switching agent provider to OpenAI
```

Known deployment fixes already done:

- Vercel was linked to the `jaguar` project.
- Vercel env vars were restored from local config after production hit Prisma `P1001 Can't reach database server`.
- Frontend production build now succeeds.
- Favicon exists at `apps/web/app/icon.svg`.

## Database

Current production database: Supabase Postgres via Prisma.

The app expects:

```text
DATABASE_URL = pooled runtime connection string
DIRECT_URL   = direct/session connection string for Prisma schema operations
```

Run schema/client commands from repo root:

```bash
pnpm db:generate
pnpm db:push
```

The web build runs a prebuild that generates Prisma and copies Prisma query engine files into the Next app:

```bash
pnpm --filter @jaguar/db db:generate
```

## Current VPS Worker

Provider: TierHive

Instance:

```text
Name: Jaguar
Hostname: jaguar-workers
OS: Ubuntu 22.04
Location: Frankfurt, DE
Internal IP: 10.3.245.2
Public SSH host: 57.129.106.133
Forwarded SSH port: 2150
Resources at setup time: 2 vCPU, 4 GB RAM, 40 GB NVMe
```

SSH command:

```bash
ssh -i ~/.ssh/tierhive_jaguar root@57.129.106.133 -p 2150
```

SSH key files on this laptop:

```text
Private key: /Users/favourolaboye/.ssh/tierhive_jaguar
Public key:  /Users/favourolaboye/.ssh/tierhive_jaguar.pub
```

Public key:

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPUGY3QuWtTLPiPEvr2AOregdxCRsjfjbADErjZGx7ns tierhive-jaguar-worker
```

Do not commit or paste the private key contents. If this laptop is no longer available, create a new key pair and add the new public key through TierHive's SSH key/VPS access UI or directly into `/root/.ssh/authorized_keys` while you still have access.

Worker runtime:

```text
Docker installed on VPS
Worker container name: jaguar-worker
```

Useful VPS commands:

```bash
docker ps
docker logs --tail=200 jaguar-worker
docker logs -f --tail=200 jaguar-worker
docker restart jaguar-worker
docker stop jaguar-worker
docker start jaguar-worker
docker stats jaguar-worker
df -h
free -h
uptime
```

The worker writes heartbeat rows to the database. The dashboard's Worker Uptime card and ingestion diagnostics use this heartbeat to show whether the worker is alive.

## Recent Fixes Already Applied

Anthropic memo issue:

- Symptom: launch detail memo stayed on `hey, on it / reading signals, back in a sec`.
- Root cause: `packages/agent/src/index.ts` sent `thinking: { type: "adaptive" }` to `claude-haiku-4-5-20251001`, and Anthropic rejected it because adaptive thinking is not supported by that model.
- Fix: removed unsupported `thinking` field, returned saved memo from server action, and added UI error state so memo generation does not spin forever.

Favicon:

- Added `apps/web/app/icon.svg` using the Jaguar logo mark.

Dashboard polish:

- Fixed win-rate gauge SVG positioning in `apps/web/components/dashboard/winrate-gauge.tsx` and `apps/web/app/dashboard.css`.
- Removed stale `local SQLite` loading/error copy. The app now refers to the database generically.

## How To Set Up A VPS

Use this section when adding another worker to the same TierHive instance or setting up a new VPS for another project.

### 1. Create Or Select The VPS

Recommended minimum for one Node streaming worker:

```text
2 vCPU
2-4 GB RAM
20-40 GB disk
Ubuntu 22.04 or 24.04
```

For Jaguar, the 4 GB RAM / 40 GB NVMe setup is comfortable and leaves room for Docker builds. If you add many workers to one VPS, watch RAM and CPU with `docker stats`, `free -h`, and `htop`.

### 2. Add SSH Access

Create a dedicated key on your local machine:

```bash
ssh-keygen -t ed25519 -C "project-worker" -f ~/.ssh/project_worker
```

Upload the `.pub` key to the VPS provider, then connect:

```bash
ssh -i ~/.ssh/project_worker root@SERVER_IP -p SSH_PORT
```

For this Jaguar VPS:

```bash
ssh -i ~/.ssh/tierhive_jaguar root@57.129.106.133 -p 2150
```

### 3. Install Base Packages

On a fresh Ubuntu VPS:

```bash
apt update
apt upgrade -y
apt install -y ca-certificates curl gnupg git ufw htop
```

### 4. Install Docker

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker --version
```

### 5. Add Swap

This helps small VPS boxes survive Node/Next/Prisma builds.

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

### 6. Put The App On The Server

Two acceptable approaches:

Clone from Git:

```bash
mkdir -p /opt/apps
cd /opt/apps
git clone REPO_URL project-name
cd project-name
```

Or copy from local machine:

```bash
rsync -az --exclude node_modules --exclude .next --exclude .git \
  -e "ssh -i ~/.ssh/project_worker -p SSH_PORT" \
  ./ root@SERVER_IP:/opt/apps/project-name/
```

### 7. Create The Worker Environment File

On the VPS, create a project-specific env file. Example path:

```text
/opt/apps/project-name/.env
```

Include only the runtime values the worker needs:

```text
DATABASE_URL=...
DIRECT_URL=...
GOLDRUSH_API_KEY=...
GOLDRUSH_STREAM_URL=wss://streaming.goldrushdata.com/graphql
DEFAULT_CHAIN=SOLANA_MAINNET
TRACKED_PROTOCOLS=...
ANTHROPIC_API_KEY=...
JAGUAR_AGENT_PROVIDER=claude
```

Do not commit this env file.

### 8. Run The Worker With Docker

If the repo has a committed Dockerfile, use it. If not, create one for the worker deployment and keep it simple. A good production pattern is:

```Dockerfile
FROM node:22-bookworm-slim

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/agent/package.json packages/agent/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/goldrush/package.json packages/goldrush/package.json
COPY packages/scoring/package.json packages/scoring/package.json

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @jaguar/db db:generate
RUN pnpm --filter @jaguar/worker typecheck

CMD ["pnpm", "--filter", "@jaguar/worker", "dev"]
```

Build and run:

```bash
docker build -t project-worker .
docker run -d \
  --name project-worker \
  --restart unless-stopped \
  --env-file .env \
  project-worker
```

For Jaguar specifically, the existing container is named:

```text
jaguar-worker
```

### 9. Monitor The Worker

```bash
docker ps
docker logs -f --tail=200 project-worker
docker stats project-worker
```

Expected healthy behavior:

- The worker boots without env/database errors.
- GoldRush subscriptions connect.
- New launches and pair updates are ingested.
- Worker heartbeat in the dashboard updates regularly.
- Dashboard totals, launches, calls, and scorecard values move based on real stored data.

### 10. Updating A Worker

Typical update flow:

```bash
cd /opt/apps/project-name
git pull
docker build -t project-worker .
docker stop project-worker
docker rm project-worker
docker run -d \
  --name project-worker \
  --restart unless-stopped \
  --env-file .env \
  project-worker
```

If using a copied repo instead of Git, rsync the new files first, then rebuild the container.

## Debug Checklist

If dashboard data looks stale:

```bash
ssh -i ~/.ssh/tierhive_jaguar root@57.129.106.133 -p 2150
docker ps
docker logs --tail=200 jaguar-worker
docker stats jaguar-worker
```

Check these in order:

1. Worker container is running.
2. Logs do not show GoldRush auth/subscription failures.
3. Logs do not show Prisma/Postgres connection failures.
4. Vercel and VPS are using the same production database.
5. Dashboard worker heartbeat is recent.
6. GoldRush API key still has quota/access.

If analyst memos hang:

1. Check the launch detail network/server action error.
2. Check Anthropic model compatibility in `packages/agent/src/index.ts`.
3. Confirm `ANTHROPIC_API_KEY` is present in the environment where memo generation runs.
4. Confirm the UI shows an error state instead of indefinite loading.

If Vercel deploy fails:

```bash
pnpm --filter @jaguar/web typecheck
pnpm --filter @jaguar/web build
vercel inspect DEPLOYMENT_URL
```

Common causes:

- Missing Prisma generated client.
- Missing Vercel env var.
- Database URL points to the wrong host or wrong Supabase pooler mode.
- Next build cannot copy Prisma query engine files.

## Notes For Future Agents

- Do not pause, restart, or change the VPS worker unless the user explicitly asks.
- Do not replace real data flows with mocks to make the UI look good.
- Treat dashboard symptoms as clues. Trace from UI component to server action/query to DB rows to worker ingestion/logs.
- Keep deployment changes documented here when they affect production, Vercel, VPS access, env vars, or operational commands.
