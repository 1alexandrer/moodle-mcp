# Hosting + README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cloudflare Worker entry point for hosted MCP access, expand the install section to cover 8 MCP clients, and polish the README with badges, npm callout, star history, and Obsidian graph preview.

**Architecture:** Keep `src/server.ts` (stdio) untouched. Add `src/register-tools.ts` to share tool registration logic, then `src/worker.ts` as a CF Worker `fetch` handler using `WebStandardStreamableHTTPServerTransport` (stateless mode, web-standard APIs). `wrangler.toml` points directly at `src/worker.ts`; wrangler bundles via esbuild.

**Tech Stack:** TypeScript 5.5, `@modelcontextprotocol/sdk ^1.12` (`WebStandardStreamableHTTPServerTransport`), Cloudflare Workers (wrangler), shields.io badges, star-history.com.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/register-tools.ts` | **Create** | Single `registerAllTools(server, client)` call shared by server.ts and worker.ts |
| `src/worker.ts` | **Create** | CF Worker `fetch` handler — reads env bindings, wires tools, handles request |
| `wrangler.toml` | **Create** | CF Worker config pointing at `src/worker.ts` |
| `src/server.ts` | **Modify** | Import `registerAllTools` instead of inline registrations |
| `package.json` | **Modify** | Add `wrangler` devDep + `deploy` script |
| `README.md` | **Modify** | Badges, npm callout, 8-tool install section, star history, graph preview |
| `docs/assets/.gitkeep` | **Create** | Placeholder so `docs/assets/` is tracked for `graph-preview.png` |

---

## Task 1: Extract shared tool registration

**Files:**
- Create: `src/register-tools.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Create `src/register-tools.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MoodleClient } from "./moodle-client.js";
import { registerCourseTools } from "./tools/courses.js";
import { registerFileTools } from "./tools/files.js";
import { registerAssignmentTools } from "./tools/assignments.js";
import { registerGradeTools } from "./tools/grades.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerQuizTools } from "./tools/quizzes.js";
import { registerForumTools } from "./tools/forums.js";
import { registerNotificationTools } from "./tools/notifications.js";
import { registerSiteInfoTool } from "./tools/siteinfo.js";

export function registerAllTools(server: McpServer, client: MoodleClient): void {
  registerCourseTools(server, client);
  registerFileTools(server, client);
  registerAssignmentTools(server, client);
  registerGradeTools(server, client);
  registerCalendarTools(server, client);
  registerQuizTools(server, client);
  registerForumTools(server, client);
  registerNotificationTools(server, client);
  registerSiteInfoTool(server, client);
}
```

- [ ] **Step 2: Update `src/server.ts` to use `registerAllTools`**

Replace the block of 9 individual `register*` tool imports and calls with:

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config.js";
import { MoodleClient } from "./moodle-client.js";
import { registerAllTools } from "./register-tools.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

if (process.stdin.isTTY && !process.env.MOODLE_URL) {
  console.log(`
moodle-mcp v0.1.1 — Moodle MCP Server

This tool runs as a background server for Claude — you don't run it directly.
Add it to your Claude config and restart Claude.

━━━ Claude Desktop ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Config file:
  Mac:     ~/Library/Application Support/Claude/claude_desktop_config.json
  Windows: %APPDATA%\\Claude\\claude_desktop_config.json

Paste this into the JSON:
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "moodle-mcp"],
      "env": {
        "MOODLE_URL": "https://moodle.yourschool.edu",
        "MOODLE_TOKEN": "your_token_here"
      }
    }
  }

━━━ Claude Code (CLI) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run once in your project folder:
  claude mcp add moodle npx -- -y moodle-mcp \\
    -e MOODLE_URL=https://moodle.yourschool.edu \\
    -e MOODLE_TOKEN=your_token_here

━━━ Get your Moodle token ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Log in to your school's Moodle in a browser
2. Go to: https://moodle.yourschool.edu/user/managetoken.php
3. Copy the "Moodle mobile web service" token

SSO school (Microsoft/Google login)? Use the Moodle mobile app:
  App settings → About → tap version 5× → Developer options → Copy token

Full guide: https://github.com/1alexandrer/moodle-mcp#getting-your-token
`);
  process.exit(0);
}

async function main() {
  const config = getConfig();
  const client = await MoodleClient.create(config);

  const server = new McpServer({
    name: "moodle-mcp",
    version: "0.1.1",
  });

  registerAllTools(server, client);
  registerResources(server, client);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start moodle-mcp:", err.message);
  process.exit(1);
});
```

- [ ] **Step 3: Build and verify no TypeScript errors**

```bash
npm run build
```

Expected: exits 0, `dist/` updates with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/register-tools.ts src/server.ts
git commit -m "refactor: extract registerAllTools for shared use"
```

---

## Task 2: Add Cloudflare Worker entry point

**Files:**
- Create: `src/worker.ts`
- Create: `wrangler.toml`
- Modify: `package.json`

- [ ] **Step 1: Create `src/worker.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { normalizeUrl } from "./config.js";
import { MoodleClient } from "./moodle-client.js";
import { registerAllTools } from "./register-tools.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

interface Env {
  MOODLE_URL: string;
  MOODLE_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.MOODLE_URL || !env.MOODLE_TOKEN) {
      return new Response(
        JSON.stringify({
          error: "Set MOODLE_URL and MOODLE_TOKEN as secrets in your Cloudflare Worker dashboard",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const config = { baseUrl: normalizeUrl(env.MOODLE_URL), token: env.MOODLE_TOKEN };
    const client = await MoodleClient.create(config);

    const server = new McpServer({ name: "moodle-mcp", version: "0.1.1" });

    registerAllTools(server, client);
    registerResources(server, client);
    registerPrompts(server);

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
```

- [ ] **Step 2: Create `wrangler.toml`**

```toml
name = "moodle-mcp"
main = "src/worker.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

# Set secrets via: wrangler secret put MOODLE_URL
# Do NOT hardcode credentials here — set them in the CF dashboard or with wrangler secret put
```

- [ ] **Step 3: Add `wrangler` devDependency and `deploy` script to `package.json`**

In `package.json`, add to `"devDependencies"`:
```json
"wrangler": "^3.0.0"
```

Add to `"scripts"`:
```json
"deploy": "wrangler deploy"
```

Full `scripts` block after change:
```json
"scripts": {
  "build": "tsc",
  "deploy": "wrangler deploy",
  "dev": "npx @modelcontextprotocol/inspector node dist/server.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "prepublishOnly": "npm run build && npm test"
}
```

- [ ] **Step 4: Install wrangler**

```bash
npm install
```

Expected: `wrangler` appears in `node_modules/.bin/wrangler`.

- [ ] **Step 5: Type-check the worker**

```bash
npx tsc --noEmit --module ESNext --moduleResolution bundler --target ES2022 src/worker.ts
```

Expected: exits 0. If there are errors about module resolution, they're from the NodeNext tsconfig — wrangler uses its own bundler (esbuild) and ignores tsconfig module settings, so errors here are safe to ignore as long as the imports exist.

- [ ] **Step 6: Commit**

```bash
git add src/worker.ts wrangler.toml package.json package-lock.json
git commit -m "feat: add Cloudflare Worker entry point with StreamableHTTP transport"
```

---

## Task 3: Update README with 8-tool install section

**Files:**
- Modify: `README.md`

Replace the entire `## Quick Start` section (lines 9–48 in current README) with the new Install section below. Keep everything from `---` after the install section onwards unchanged.

- [ ] **Step 1: Replace the Quick Start section in `README.md`**

The new section to replace `## Quick Start` through the second `---`:

````markdown
## Install

### Step 1 — Get your Moodle token

See [Getting Your Token](#getting-your-token) below. You'll need this for any install method.

### Step 2 — Pick your delivery mode

**Option A — Local (zero hosting):** Runs `npx moodle-mcp` on your machine each time your MCP client starts. No server, no cost, nothing to deploy.

**Option B — Hosted (Cloudflare Worker):** Deploy once, get a permanent URL. Your MCP client connects to the URL — no `npx` on the client side.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/1alexandrer/moodle-mcp)

After deploying, set `MOODLE_URL` and `MOODLE_TOKEN` as [secrets in the CF dashboard](https://dash.cloudflare.com/) or via:
```bash
wrangler secret put MOODLE_URL
wrangler secret put MOODLE_TOKEN
```
Your URL will be `https://moodle-mcp.<your-subdomain>.workers.dev`.

### Step 3 — Configure your MCP client

<details>
<summary><strong>Claude Desktop</strong></summary>

Config file:
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Option A — Local:**
```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "moodle-mcp"],
      "env": {
        "MOODLE_URL": "https://moodle.yourschool.edu",
        "MOODLE_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Option B — Hosted:**
```json
{
  "mcpServers": {
    "moodle": {
      "url": "https://moodle-mcp.your-subdomain.workers.dev"
    }
  }
}
```
</details>

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

**Option A — Local:**
```bash
claude mcp add moodle npx -- -y moodle-mcp \
  -e MOODLE_URL=https://moodle.yourschool.edu \
  -e MOODLE_TOKEN=your_token_here
```

**Option B — Hosted:**
```bash
claude mcp add moodle --transport http https://moodle-mcp.your-subdomain.workers.dev
```
</details>

<details>
<summary><strong>Cursor</strong></summary>

Config file: `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project)

**Option A — Local:**
```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "moodle-mcp"],
      "env": {
        "MOODLE_URL": "https://moodle.yourschool.edu",
        "MOODLE_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Option B — Hosted:**
```json
{
  "mcpServers": {
    "moodle": {
      "url": "https://moodle-mcp.your-subdomain.workers.dev"
    }
  }
}
```
</details>

<details>
<summary><strong>VS Code</strong></summary>

Config file: `.vscode/mcp.json` in your project, or `settings.json` globally.

**Option A — Local:**
```json
{
  "servers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "moodle-mcp"],
      "env": {
        "MOODLE_URL": "https://moodle.yourschool.edu",
        "MOODLE_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Option B — Hosted:**
```json
{
  "servers": {
    "moodle": {
      "url": "https://moodle-mcp.your-subdomain.workers.dev"
    }
  }
}
```
</details>

<details>
<summary><strong>Windsurf</strong></summary>

Config file: `~/.codeium/windsurf/mcp_config.json`

**Option A — Local:**
```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "moodle-mcp"],
      "env": {
        "MOODLE_URL": "https://moodle.yourschool.edu",
        "MOODLE_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Option B — Hosted:**
```json
{
  "mcpServers": {
    "moodle": {
      "url": "https://moodle-mcp.your-subdomain.workers.dev"
    }
  }
}
```
</details>

<details>
<summary><strong>Zed</strong></summary>

Config file: `~/.config/zed/settings.json`

**Option A — Local:**
```json
{
  "context_servers": {
    "moodle": {
      "command": {
        "path": "npx",
        "args": ["-y", "moodle-mcp"],
        "env": {
          "MOODLE_URL": "https://moodle.yourschool.edu",
          "MOODLE_TOKEN": "your_token_here"
        }
      }
    }
  }
}
```

**Option B — Hosted:**
```json
{
  "context_servers": {
    "moodle": {
      "url": "https://moodle-mcp.your-subdomain.workers.dev"
    }
  }
}
```
</details>

<details>
<summary><strong>Continue.dev</strong></summary>

Config file: `~/.continue/config.json`

**Option A — Local:**
```json
{
  "mcpServers": [
    {
      "name": "moodle",
      "command": "npx",
      "args": ["-y", "moodle-mcp"],
      "env": {
        "MOODLE_URL": "https://moodle.yourschool.edu",
        "MOODLE_TOKEN": "your_token_here"
      }
    }
  ]
}
```

**Option B — Hosted:**
```json
{
  "mcpServers": [
    {
      "name": "moodle",
      "url": "https://moodle-mcp.your-subdomain.workers.dev"
    }
  ]
}
```
</details>

<details>
<summary><strong>Cline</strong></summary>

Open the Cline sidebar in VS Code → MCP Servers → Add Server → paste the JSON:

**Option A — Local:**
```json
{
  "moodle": {
    "command": "npx",
    "args": ["-y", "moodle-mcp"],
    "env": {
      "MOODLE_URL": "https://moodle.yourschool.edu",
      "MOODLE_TOKEN": "your_token_here"
    }
  }
}
```

**Option B — Hosted:**
```json
{
  "moodle": {
    "url": "https://moodle-mcp.your-subdomain.workers.dev"
  }
}
```
</details>

<details>
<summary><strong>ChatGPT — Coming soon</strong></summary>

OpenAI has announced MCP support for ChatGPT. Check the [OpenAI blog](https://openai.com/blog) for the release date. Once available, the hosted URL option (Option B) will work directly.
</details>

---
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add 8-tool install section with local and hosted options"
```

---

## Task 4: README polish — badges, npm callout, star history, graph preview

**Files:**
- Modify: `README.md`
- Create: `docs/assets/.gitkeep`

- [ ] **Step 1: Add badges row and npm callout to the top of `README.md`**

Replace the current top of the file (lines 1–7):
```markdown
# moodle-mcp

> Give Claude full access to your Moodle — courses, files, assignments, grades, quizzes, calendar, and more. Build Obsidian study vaults from your lecture notes in one command.

**13 tools · 5 prompts · MCP Resources**
```

With:
```markdown
# moodle-mcp

[![npm version](https://img.shields.io/npm/v/moodle-mcp?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/moodle-mcp)
[![npm downloads](https://img.shields.io/npm/dm/moodle-mcp?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/moodle-mcp)
[![GitHub stars](https://img.shields.io/github/stars/1alexandrer/moodle-mcp?style=social)](https://github.com/1alexandrer/moodle-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

> Give Claude full access to your Moodle — courses, files, assignments, grades, quizzes, calendar, and more. Build Obsidian study vaults from your lecture notes in one command.

> 📦 **[moodle-mcp on npm](https://www.npmjs.com/package/moodle-mcp)** — `npx moodle-mcp`

**13 tools · 5 prompts · MCP Resources**
```

- [ ] **Step 2: Add Knowledge Graph subsection inside the Obsidian Finals Prep section**

After the `### See the graph` section and before `### Query the graph with Claude`, add:

```markdown
### Knowledge Graph preview

![Obsidian knowledge graph of a university course](docs/assets/graph-preview.png)
*Your entire course as a linked knowledge graph — built in one command. Run `/build-study-notes` once to generate this.*
```

- [ ] **Step 3: Add Star History section above Contributing**

Before `## Contributing`, add:

```markdown
## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=1alexandrer/moodle-mcp&type=Date)](https://star-history.com/#1alexandrer/moodle-mcp)

---
```

- [ ] **Step 4: Create `docs/assets/.gitkeep`**

Create an empty file at `docs/assets/.gitkeep` so the directory is tracked and `graph-preview.png` can be dropped in later:

```bash
mkdir -p docs/assets && touch docs/assets/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add README.md docs/assets/.gitkeep
git commit -m "docs: add badges, npm callout, star history, and graph preview slot"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| CF Worker transport (Approach B) | Task 2 — `src/worker.ts` + `wrangler.toml` |
| Shared tool registration | Task 1 — `src/register-tools.ts` |
| stdio server unchanged | Task 1 — `src/server.ts` refactored, behavior identical |
| Deploy button | Task 3 — deploy.workers.cloudflare.com button in README |
| 8-tool install section | Task 3 — all 8 tools with `<details>` blocks |
| ChatGPT coming soon | Task 3 — included as collapsed details |
| Badges row | Task 4 — npm version, downloads, stars, TS, Node, CF, MIT |
| npm callout | Task 4 — callout block with npmjs.com link |
| Star history chart | Task 4 — star-history.com embedded SVG |
| Obsidian graph preview | Task 4 — image slot + `docs/assets/.gitkeep` |

**Placeholder scan:** No TBDs. The `graph-preview.png` image slot is intentional — documented as a manual step ("drop in a screenshot after running `/build-study-notes` once").

**Type consistency:** `registerAllTools(server: McpServer, client: MoodleClient)` is defined in Task 1 and used identically in Tasks 1 (server.ts) and 2 (worker.ts).
