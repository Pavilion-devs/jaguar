import { validateMcpApiKey } from "@jaguar/db";
import { type ToolContext, dispatchTool, listToolDefinitions } from "@jaguar/mcp";
import { type NextRequest, NextResponse } from "next/server";

const PROTOCOL_VERSION = "2024-11-05";

function ok(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcErr(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMethod(
  method: string,
  params: Record<string, unknown> | undefined,
  ctx: ToolContext,
) {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "jaguar", version: "0.1.0" },
      };

    case "tools/list":
      return { tools: listToolDefinitions() };

    case "tools/call": {
      const name = params?.name as string;
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      return dispatchTool(name, args, ctx);
    }

    case "ping":
      return {};

    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const rawKey = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!rawKey || !(await validateMcpApiKey(rawKey))) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } },
      { status: 401 },
    );
  }

  // Optional second factor for operator-gated tools (approve/reject). The bearer
  // key lets a caller reach the MCP at all; the operator secret additionally
  // authorizes state-changing approvals.
  const operatorSecretProvided = req.headers.get("x-operator-secret");

  let body: { method: string; id?: unknown; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return rpcErr(null, -32700, "Parse error");
  }

  const { method, id, params } = body;

  // Notifications have no id and expect no response
  if (id === undefined) {
    return new Response(null, { status: 204 });
  }

  try {
    const result = await handleMethod(method, params, { operatorSecretProvided });
    if (result === null) return rpcErr(id, -32601, "Method not found");
    return ok(id, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return rpcErr(id, -32603, message);
  }
}

export async function GET() {
  return NextResponse.json({ name: "jaguar-mcp", version: "0.1.0", status: "ok" });
}
