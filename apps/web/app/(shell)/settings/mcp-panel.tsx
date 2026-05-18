"use client";

import { useState } from "react";
import type { McpApiKeyRecord } from "@jaguar/db";
import { generateMcpKey, revokeMcpKey } from "./actions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.jaguaralpha.xyz";
const MCP_URL = `${APP_URL}/api/mcp`;

type Client = "claude-code" | "claude-desktop" | "other";

function claudeCodeCommand(key: string) {
  return `claude mcp add --transport http jaguar ${MCP_URL} --header "Authorization: Bearer ${key}"`;
}

function claudeDesktopConfig(key: string) {
  return JSON.stringify(
    {
      mcpServers: {
        jaguar: {
          type: "http",
          url: MCP_URL,
          headers: { Authorization: `Bearer ${key}` },
        },
      },
    },
    null,
    2,
  );
}

function otherConfig(key: string) {
  return JSON.stringify(
    {
      mcpServers: {
        jaguar: {
          type: "http",
          url: MCP_URL,
          headers: { Authorization: `Bearer ${key}` },
        },
      },
    },
    null,
    2,
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button type="button" className="settings-copy-btn" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ClientTabs({ active, onChange }: { active: Client; onChange: (c: Client) => void }) {
  const tabs: { id: Client; label: string }[] = [
    { id: "claude-code", label: "Claude Code" },
    { id: "claude-desktop", label: "Claude Desktop" },
    { id: "other", label: "Other / Custom" },
  ];
  return (
    <div className="mcp-client-tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`mcp-client-tab${active === t.id ? " active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ConnectInstructions({ client, apiKey }: { client: Client; apiKey: string }) {
  if (client === "claude-code") {
    return (
      <div className="mcp-instructions">
        <div className="mcp-config-head">
          <span>Run this command in your terminal:</span>
          <CopyButton text={claudeCodeCommand(apiKey)} />
        </div>
        <pre className="mcp-config-block">{claudeCodeCommand(apiKey)}</pre>
        <p className="mcp-instructions-note">
          Then restart Claude Code. You can verify with <code>/mcp</code> — jaguar should show as connected.
        </p>
      </div>
    );
  }

  if (client === "claude-desktop") {
    return (
      <div className="mcp-instructions">
        <div className="mcp-config-head">
          <span>Add this to your <code>claude_desktop_config.json</code>:</span>
          <CopyButton text={claudeDesktopConfig(apiKey)} />
        </div>
        <pre className="mcp-config-block">{claudeDesktopConfig(apiKey)}</pre>
        <p className="mcp-instructions-note">
          File location — macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
          <br />Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code>
        </p>
      </div>
    );
  }

  return (
    <div className="mcp-instructions">
      <div className="mcp-config-head">
        <span>Add this to your MCP client config:</span>
        <CopyButton text={otherConfig(apiKey)} />
      </div>
      <pre className="mcp-config-block">{otherConfig(apiKey)}</pre>
      <p className="mcp-instructions-note">
        Works with any MCP-compatible client that supports HTTP transport and custom headers.
      </p>
    </div>
  );
}

type Props = {
  initialKeys: McpApiKeyRecord[];
};

export function McpPanel({ initialKeys }: Props) {
  const [keys, setKeys] = useState(initialKeys);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activeClient, setActiveClient] = useState<Client>("claude-code");

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await generateMcpKey("Jaguar MCP");
      setNewKey(result.rawKey);
      setKeys((prev) => [
        { id: result.id, label: "Jaguar MCP", createdAt: result.createdAt, lastUsedAt: null },
        ...prev,
      ]);
    } finally {
      setGenerating(false);
    }
  };

  const revoke = async (id: string) => {
    await revokeMcpKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    if (keys.length === 1) setNewKey(null);
  };

  return (
    <section className="card settings-panel settings-panel-wide">
      <div className="settings-panel-head">
        <div>
          <h3>AI agent access</h3>
          <p>Connect Claude Code, Claude Desktop, or any MCP-compatible agent to Jaguar's conviction intelligence.</p>
        </div>
        <span className={keys.length > 0 ? "status-chip connected" : "status-chip"}>
          {keys.length > 0 ? `${keys.length} key${keys.length > 1 ? "s" : ""} active` : "No keys"}
        </span>
      </div>

      <div className="settings-note mcp-explainer">
        Your agent can ask: <em>"What are the top Solana launches right now?"</em> or{" "}
        <em>"Should I enter $SYMBOL?"</em> and get Jaguar's live scores, verdicts, and analyst memos — not raw chain data.
      </div>

      {newKey ? (
        <div className="mcp-key-reveal">
          <div className="mcp-key-reveal-head">
            <strong>API key generated — copy it now, it won't be shown again.</strong>
          </div>
          <div className="mcp-key-row">
            <code className="mcp-key-code">{newKey}</code>
            <CopyButton text={newKey} />
          </div>

          <ClientTabs active={activeClient} onChange={setActiveClient} />
          <ConnectInstructions client={activeClient} apiKey={newKey} />

          <button type="button" className="settings-copy-btn" onClick={() => setNewKey(null)}>
            Done
          </button>
        </div>
      ) : (
        <div className="settings-action-row">
          <span>Generate a new API key to connect your AI agent.</span>
          <button
            type="button"
            className="settings-primary-action"
            onClick={() => void generate()}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate API key"}
          </button>
        </div>
      )}

      {keys.length > 0 && (
        <div className="mcp-keys-list">
          <div className="settings-label">Active keys</div>
          {keys.map((k) => (
            <div key={k.id} className="mcp-key-item">
              <div>
                <span className="mcp-key-label">{k.label ?? "Unnamed key"}</span>
                <span className="mcp-key-meta">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt
                    ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                    : " · Never used"}
                </span>
              </div>
              <button
                type="button"
                className="settings-primary-action settings-danger-action"
                onClick={() => void revoke(k.id)}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
