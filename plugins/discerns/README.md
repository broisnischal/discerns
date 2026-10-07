# discerns for Claude Code

A shared clipboard for you, your team, and your coding agents. Claude saves and finds
prompts, memories, snippets, and encrypted env files, organizes them by repository, and
streams live logs your teammates can watch at [discerns.app](https://discerns.app).

## Install

```
/plugin marketplace add broisnischal/discerns
/plugin install discerns@discerns
```

Then run `/mcp`, pick **discerns**, and sign in. The plugin includes the MCP server, so there
is nothing else to install. Agent access is part of discerns Pro.

## Without the plugin

Add the server and, optionally, the skill. Use this instead of the plugin, not as well,
or you will have two copies of the server.

```
claude mcp add --transport http discerns https://discerns.app/mcp
mkdir -p ~/.claude/skills && curl -fsSL https://discerns.app/downloads/discerns-skill.zip -o /tmp/discerns-skill.zip && unzip -oq /tmp/discerns-skill.zip -d ~/.claude/skills
```

## What you get

- **MCP server** at `https://discerns.app/mcp` with tools to save, search, share, version,
  and log.
- **Skill** that teaches Claude when to save, how to pick a kind, and how to keep secrets out
  of logs.
- **Session hook** that tells Claude which project the current repository maps to.
- **Commands**

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `/discerns:context` | Load this repo's memories, prompts, env list, and latest log |
| `/discerns:save`    | Save the last prompt, snippet, or note and return its link   |
| `/discerns:find`    | Search your items and show the best matches                  |
| `/discerns:share`   | Share an item or this repo's project by email                |
| `/discerns:log`     | Start a live log for the current task                        |
| `/discerns:handoff` | Write where you stopped so the next session can continue     |

## Other agents

Cursor, VS Code, Codex, Gemini CLI, and any MCP client can connect to the same server. See
[discerns.app/app/connect](https://discerns.app/app/connect).
