import {
  SiClaude,
  SiCursor,
  SiGithubcopilot,
  SiGooglegemini,
  SiWindsurf,
} from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { AgentAccessNotice } from "#/components/agent-access-notice.tsx";
import { CopyButton } from "#/components/copy-button.tsx";
import { DownloadIcon, PlugIcon, TerminalIcon } from "#/components/icons.ts";
import { Button } from "#/components/ui/button.tsx";
import { MARKETPLACE_NAME, MARKETPLACE_REPO, PLUGIN_NAME, SKILL_ZIP_PATH } from "#/lib/site.ts";
import { cn } from "#/lib/utils.ts";

const AGENT_IDS = [
  "claude-code",
  "claude-apps",
  "cursor",
  "vscode",
  "codex",
  "gemini",
  "windsurf",
  "other",
] as const;
type AgentId = (typeof AGENT_IDS)[number];

export const Route = createFileRoute("/_auth/app/connect")({
  validateSearch: z.object({ agent: z.enum(AGENT_IDS).optional().catch(undefined) }),
  head: () => ({ meta: [{ title: "Connect agents" }] }),
  component: ConnectPage,
});

/** Agent instructions for agents without Claude's skill format; built by `vpr skill:pack`. */
const RULES_PATH = "/downloads/discerns-agent.md";

function Command({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 surface py-1.5 ps-3.5 pe-1.5">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-pre">
        {value}
      </code>
      <CopyButton value={value} size="icon-sm" variant="ghost" label="Copy" />
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium tabular-nums"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5 text-sm">{children}</div>
    </li>
  );
}

function RulesStep({ n, file }: { n: number; file: string }) {
  const origin = import.meta.env.VITE_BASE_URL;
  return (
    <Step n={n}>
      <p>
        Optional: teach the agent when to save, share, and log. Append the instructions to {file}.
      </p>
      <Command value={`curl -fsSL ${origin}${RULES_PATH} >> ${file}`} />
    </Step>
  );
}

function AgentSteps({ agent, mcpUrl }: { agent: AgentId; mcpUrl: string }) {
  const json = (value: unknown) => JSON.stringify(value, null, 2);
  switch (agent) {
    case "claude-code": {
      const skillCommand = `mkdir -p ~/.claude/skills && curl -fsSL ${import.meta.env.VITE_BASE_URL}${SKILL_ZIP_PATH} -o /tmp/discerns-skill.zip && unzip -oq /tmp/discerns-skill.zip -d ~/.claude/skills`;
      return (
        <div className="flex flex-col gap-8">
          {MARKETPLACE_REPO && (
            <section className="flex flex-col gap-4" aria-labelledby="plugin-heading">
              <div className="space-y-1">
                <h2 id="plugin-heading" className="font-medium">
                  Install the plugin <span className="text-muted-foreground">(recommended)</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  One install gives you the MCP server, the skill, six commands, and a hook that
                  tells Claude which project each repo is. You do not need to add the server
                  separately.
                </p>
              </div>
              <ol className="flex flex-col gap-6">
                <Step n={1}>
                  <p>In Claude Code, add the marketplace and install the plugin.</p>
                  <Command value={`/plugin marketplace add ${MARKETPLACE_REPO}`} />
                  <Command value={`/plugin install ${PLUGIN_NAME}@${MARKETPLACE_NAME}`} />
                </Step>
                <Step n={2}>
                  <p>
                    Run <code className="font-mono">/mcp</code>, pick {PLUGIN_NAME}, and sign in.
                  </p>
                </Step>
              </ol>
            </section>
          )}

          <section className="flex flex-col gap-4" aria-labelledby="manual-heading">
            <div className="space-y-1">
              <h2 id="manual-heading" className="font-medium">
                {MARKETPLACE_REPO ? "Or set it up by hand" : "Set it up"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {MARKETPLACE_REPO
                  ? "Use this instead of the plugin, not as well. Adding both gives you two copies of the server."
                  : "Add the server, then optionally the skill."}
              </p>
            </div>
            <ol className="flex flex-col gap-6">
              <Step n={1}>
                <p>Add the MCP server from your terminal.</p>
                <Command value={`claude mcp add --transport http ${PLUGIN_NAME} ${mcpUrl}`} />
              </Step>
              <Step n={2}>
                <p>
                  Optional: install the skill, so Claude knows when to save, share, and log without
                  being asked.
                </p>
                <Command value={skillCommand} />
              </Step>
              <Step n={3}>
                <p>
                  Run <code className="font-mono">/mcp</code>, pick {PLUGIN_NAME}, and sign in.
                </p>
              </Step>
            </ol>
          </section>
        </div>
      );
    }
    case "claude-apps":
      return (
        <ol className="flex flex-col gap-6">
          <Step n={1}>
            <p>
              Open <strong>Settings → Connectors</strong> and choose{" "}
              <strong>Add custom connector</strong>.
            </p>
          </Step>
          <Step n={2}>
            <p>Paste this URL and sign in when asked. It works on web, desktop, and mobile.</p>
            <Command value={mcpUrl} />
          </Step>
          <Step n={3}>
            <p>
              Optional: upload the skill in <strong>Settings → Capabilities → Skills</strong>.
            </p>
            <div>
              <Button
                render={<a href={SKILL_ZIP_PATH} download />}
                nativeButton={false}
                variant="outline"
                size="sm"
              >
                <DownloadIcon aria-hidden="true" />
                Download skill
              </Button>
            </div>
          </Step>
        </ol>
      );
    case "cursor": {
      const deeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${PLUGIN_NAME}&config=${btoa(JSON.stringify({ url: mcpUrl }))}`;
      return (
        <ol className="flex flex-col gap-6">
          <Step n={1}>
            <p>
              Add the server in one click, or paste it into{" "}
              <code className="font-mono">~/.cursor/mcp.json</code>.
            </p>
            <div>
              <Button render={<a href={deeplink} />} nativeButton={false} size="sm">
                <SiCursor aria-hidden="true" />
                Add to Cursor
              </Button>
            </div>
            <Command value={json({ mcpServers: { [PLUGIN_NAME]: { url: mcpUrl } } })} />
          </Step>
          <Step n={2}>
            <p>In Cursor's MCP settings, sign in to {PLUGIN_NAME} when it asks.</p>
          </Step>
          <RulesStep n={3} file=".cursor/rules/discerns.mdc" />
        </ol>
      );
    }
    case "vscode":
      return (
        <ol className="flex flex-col gap-6">
          <Step n={1}>
            <p>
              Add the server from your terminal, or put it in{" "}
              <code className="font-mono">.vscode/mcp.json</code>.
            </p>
            <Command
              value={`code --add-mcp '${JSON.stringify({ name: PLUGIN_NAME, type: "http", url: mcpUrl })}'`}
            />
            <Command value={json({ servers: { [PLUGIN_NAME]: { type: "http", url: mcpUrl } } })} />
          </Step>
          <Step n={2}>
            <p>Start the server from the MCP view and sign in when VS Code asks.</p>
          </Step>
          <RulesStep n={3} file=".github/copilot-instructions.md" />
        </ol>
      );
    case "codex":
      return (
        <ol className="flex flex-col gap-6">
          <Step n={1}>
            <p>Add the server, then sign in.</p>
            <Command value={`codex mcp add ${PLUGIN_NAME} --url ${mcpUrl}`} />
            <Command value={`codex mcp login ${PLUGIN_NAME}`} />
          </Step>
          <RulesStep n={2} file="AGENTS.md" />
        </ol>
      );
    case "gemini":
      return (
        <ol className="flex flex-col gap-6">
          <Step n={1}>
            <p>Add the server for your user.</p>
            <Command
              value={`gemini mcp add --transport http --scope user ${PLUGIN_NAME} ${mcpUrl}`}
            />
          </Step>
          <Step n={2}>
            <p>Inside Gemini CLI, sign in.</p>
            <Command value={`/mcp auth ${PLUGIN_NAME}`} />
          </Step>
          <RulesStep n={3} file="GEMINI.md" />
        </ol>
      );
    case "windsurf":
      return (
        <ol className="flex flex-col gap-6">
          <Step n={1}>
            <p>
              Add this to Windsurf's <code className="font-mono">mcp_config.json</code> from the MCP
              settings.
            </p>
            <Command value={json({ mcpServers: { [PLUGIN_NAME]: { serverUrl: mcpUrl } } })} />
          </Step>
          <Step n={2}>
            <p>Refresh the MCP list and sign in when asked.</p>
          </Step>
        </ol>
      );
    case "other":
      return (
        <ol className="flex flex-col gap-6">
          <Step n={1}>
            <p>
              Any agent that supports remote MCP over Streamable HTTP with OAuth works. Use this
              URL; sign-in and client registration are automatic.
            </p>
            <Command value={mcpUrl} />
          </Step>
          <RulesStep n={2} file="AGENTS.md" />
        </ol>
      );
  }
}

const AGENTS: { id: AgentId; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { id: "claude-code", label: "Claude Code", icon: SiClaude },
    { id: "claude-apps", label: "Claude apps", icon: SiClaude },
    { id: "cursor", label: "Cursor", icon: SiCursor },
    { id: "vscode", label: "VS Code", icon: SiGithubcopilot },
    { id: "codex", label: "Codex", icon: TerminalIcon },
    { id: "gemini", label: "Gemini CLI", icon: SiGooglegemini },
    { id: "windsurf", label: "Windsurf", icon: SiWindsurf },
    { id: "other", label: "Other", icon: PlugIcon },
  ];

function ConnectPage() {
  const { agent = "claude-code" } = Route.useSearch();
  const mcpUrl = `${import.meta.env.VITE_BASE_URL}/mcp`;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Connect your agents</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          Your agent signs in as you and sees exactly what you see here. Then ask it things like
          &ldquo;save this prompt and share it with sam@example.com&rdquo;.
        </p>
      </div>

      <AgentAccessNotice />

      <nav
        aria-label="Agents"
        className="-mx-5 flex gap-1.5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 md:mx-0 md:flex-wrap md:px-0"
      >
        {AGENTS.map((a) => (
          <Link
            key={a.id}
            to="/app/connect"
            search={{ agent: a.id }}
            replace
            aria-current={a.id === agent ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
              a.id === agent
                ? "bg-selected text-selected-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <a.icon className="size-4" />
            {a.label}
          </Link>
        ))}
      </nav>

      <AgentSteps agent={agent} mcpUrl={mcpUrl} />
    </div>
  );
}
