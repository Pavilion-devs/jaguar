# Jaguar MCP — Notes & Framing

## The Right Way To Frame This (for tweets, submissions, demos)

The GoldRush MCP gives AI agents raw chain data — token balances, transactions, pair metadata.
The Jaguar MCP gives AI agents conviction decisions — scores, verdicts, AI memos, paper trade outcomes.

Raw data vs. actionable intelligence. That's the distinction. Never lose that framing.

**Wrong framing:** "We added an MCP to Jaguar"
**Right framing:** "The GoldRush MCP gives agents raw chain data. The Jaguar MCP gives agents conviction decisions. Two different layers."

If someone asks why not just use the GoldRush MCP directly: the GoldRush MCP has no scoring model, no conviction deltas, no persona verdicts, no paper trade outcomes, no AI memos. Those only exist inside Jaguar. That's the value.

---

## Tweet Angle (when posting about the MCP)

Lead with the distinction — not the technology.

> GoldRush MCP gives your AI agent raw Solana chain data.
> Jaguar MCP gives your AI agent conviction decisions.
>
> Ask it: "what are the top launches right now?" and get scores, verdicts, and analyst memos — not raw pairs.
>
> Two different layers. Both matter.

---

## UI / Production Problem (READ BEFORE BUILDING)

Right now the MCP server requires:
- `cwd` pointing to the local repo
- `DATABASE_URL` passed as an env var
- Node + tsx installed locally

This is fine for local dev. It is NOT shippable to end users on Vercel production. You cannot tell a trader to clone the repo, set a DATABASE_URL, and run Node just to connect their AI agent to Jaguar.

### The real solution for production

The MCP server needs to run as an **HTTP/SSE endpoint hosted by Jaguar itself** — not locally by the user.

Concretely:
- Host the MCP server as a route on the Jaguar web app or a separate service
- Users connect their agent to a URL like `https://www.jaguaralpha.xyz/mcp` with just an API key
- No cwd, no DATABASE_URL, no local setup

The MCP spec supports HTTP+SSE transport for exactly this use case. The `@modelcontextprotocol/sdk` already supports it on the server side.

### What the UI settings panel would look like

Instead of showing a JSON config with file paths, show:
1. User generates an API key in the Jaguar settings page
2. They get a one-line MCP config to paste into Claude Desktop / Claude Code:
   ```json
   {
     "mcpServers": {
       "jaguar": {
         "url": "https://www.jaguaralpha.xyz/mcp",
         "headers": { "Authorization": "Bearer YOUR_API_KEY" }
       }
     }
   }
   ```
3. Done. No Node, no repo, no DATABASE_URL.

### Build order when ready

1. Add HTTP/SSE transport to `packages/mcp/src/index.ts` (SDK supports this already)
2. Create an API key model in the Prisma schema
3. Add the MCP endpoint to `apps/web` (e.g. `app/api/mcp/route.ts`) with API key auth middleware
4. Build the settings UI panel — key generation + copy-paste config snippet
5. Deploy via Vercel (the MCP endpoint lives inside the Next.js app)

### Do NOT do before this is solved

- Do not add the current local MCP config to the UI
- Do not tell users to set DATABASE_URL
- Do not ship the stdio-only version to production users
