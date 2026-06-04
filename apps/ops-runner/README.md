# @jaguar/ops-runner

Runs **on the VPS** alongside `jaguar-worker`. It polls the database for
operator-**approved** `ActionRequest` rows, executes a small whitelist of
docker-compose / git commands, writes the result back, and emits operational
events. It never approves anything — the approval gate lives upstream (the web
Ops page and the MCP `approve_action` tool, both behind `OPERATOR_SECRET`).

## Whitelisted actions

| actionType      | what it runs                                                        |
| --------------- | ------------------------------------------------------------------- |
| `worker_restart`| `docker-compose -f <compose> up -d --no-build jaguar-worker`        |
| `rollback`      | `git checkout <sha>` then `docker-compose up -d --build <service>`  |
| `health_verify` | reads `getWorkerHealth` / `getIngestionDiagnostics` (no side effect)|

`rollback` is **opt-in** — the default `OPS_RUNNER_ALLOWED_ACTIONS` is
`worker_restart,health_verify`. Action payloads only ever contribute validated
parameters (git SHA matched against `^[0-9a-f]{7,40}$`, service name against
`^[a-z0-9][a-z0-9_-]*$`); no raw command strings are ever taken from a payload.

## Environment

| var                          | default                          |
| ---------------------------- | -------------------------------- |
| `DATABASE_URL`               | (required)                       |
| `OPS_RUNNER_COMPOSE_FILE`    | `/opt/jaguar/docker-compose.yml` |
| `OPS_RUNNER_REPO_DIR`        | `/opt/jaguar`                    |
| `OPS_RUNNER_ALLOWED_ACTIONS` | `worker_restart,health_verify`   |
| `OPS_RUNNER_POLL_MS`         | `10000`                          |

The runner does **not** need `OPERATOR_SECRET` — it only ever consumes rows that
are already `approved`.

## VPS wiring (handoff checklist)

1. Apply the schema once: `pnpm --filter @jaguar/db db:push` against prod `DATABASE_URL`
   (additive — creates `OperationalEvent`, `DeployEvent`, `ActionRequest`).
2. On `jaguar-worker`: ensure `JAGUAR_STORE_RAW_EVENTS` is unset (raw events default ON)
   and set `JAGUAR_GIT_SHA` to the built commit so boot deploy-recording works.
3. Add `OPERATOR_SECRET` (long random) to the VPS `.env` and to Vercel — same value.
4. Add an `ops-runner` service to `/opt/jaguar/docker-compose.yml`:

   ```yaml
   ops-runner:
     image: jaguar-ops-runner            # or the shared monorepo image
     command: ["node", "--enable-source-maps", "apps/ops-runner/dist/index.js"]
     restart: unless-stopped
     environment:
       - DATABASE_URL=${DATABASE_URL}
       - OPS_RUNNER_COMPOSE_FILE=/opt/jaguar/docker-compose.yml
       - OPS_RUNNER_REPO_DIR=/opt/jaguar
       - OPS_RUNNER_ALLOWED_ACTIONS=worker_restart,health_verify
     volumes:
       - /var/run/docker.sock:/var/run/docker.sock   # controls sibling containers
       - /opt/jaguar:/opt/jaguar                      # repo for git checkout/rebuild
   ```

   The image needs the `docker-compose` (and `git`) CLIs available.

5. `cd /opt/jaguar && docker-compose up -d --build` and confirm `docker-compose ps`
   shows both `jaguar-worker` and `ops-runner` healthy.

> Mounting the docker socket grants root-equivalent host control. Safety rests on:
> the hard-coded command templates, the SHA/service regex validation, only ever
> consuming `approved` rows, and the upstream `OPERATOR_SECRET` approval gate.
