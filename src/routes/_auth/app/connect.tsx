import { createFileRoute } from "@tanstack/react-router";
import { DownloadIcon } from "lucide-react";

import { CopyButton } from "#/components/copy-button.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import { MARKETPLACE_NAME, MARKETPLACE_REPO, PLUGIN_NAME, SKILL_ZIP_PATH } from "#/lib/site.ts";

export const Route = createFileRoute("/_auth/app/connect")({
  head: () => ({ meta: [{ title: "Connect Claude" }] }),
  component: ConnectPage,
});

function Command({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-muted/40 py-1.5 pr-1.5 pl-3">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap">
        {value}
      </code>
      <CopyButton value={value} size="icon-sm" variant="ghost" label="Copy command" />
    </div>
  );
}

function ConnectPage() {
  const mcpUrl = `${import.meta.env.VITE_BASE_URL}/mcp`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connect Claude</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Once connected, ask Claude things like &ldquo;save this prompt and share it with
          sam@example.com&rdquo; or &ldquo;what has Sam shared with me?&rdquo;. Claude signs in as
          you, so it sees exactly what you see here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claude Code</CardTitle>
          <CardDescription>
            The plugin adds the server and a skill that tells Claude when to use it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {MARKETPLACE_REPO ? (
            <>
              <Command value={`/plugin marketplace add ${MARKETPLACE_REPO}`} />
              <Command value={`/plugin install ${PLUGIN_NAME}@${MARKETPLACE_NAME}`} />
              <p className="text-sm text-muted-foreground">Or add only the server:</p>
            </>
          ) : null}
          <Command value={`claude mcp add --transport http ${PLUGIN_NAME} ${mcpUrl}`} />
          <p className="text-sm text-muted-foreground">
            Run <code className="font-mono">/mcp</code> in Claude Code and pick {PLUGIN_NAME} to
            sign in.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Claude apps (web, desktop, mobile)</CardTitle>
          <CardDescription>
            Add the connector once and it works everywhere you use Claude.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <ol className="flex list-decimal flex-col gap-3 pl-5">
            <li>
              Open <strong>Settings → Connectors</strong> and choose{" "}
              <strong>Add custom connector</strong>.
            </li>
            <li className="flex flex-col gap-2">
              Paste this URL and sign in when asked:
              <Command value={mcpUrl} />
            </li>
            <li className="flex flex-col items-start gap-2">
              Optional: upload the skill in <strong>Settings → Capabilities → Skills</strong> so
              Claude knows when to save and share without being told.
              <Button
                render={<a href={SKILL_ZIP_PATH} download />}
                nativeButton={false}
                variant="outline"
                size="sm"
              >
                <DownloadIcon aria-hidden="true" />
                Download skill
              </Button>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
