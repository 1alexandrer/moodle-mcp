



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



---

## Install

### Step 1 — Get your Moodle token

See [Getting Your Token](#getting-your-token) below. You'll need this for any install method.

### Step 2 — Pick your delivery mode

**Option A — Local (zero hosting):** Runs `npx moodle-mcp` on your machine each time your MCP client starts. No server, no cost, nothing to deploy.

**Option B — Hosted (Cloudflare Worker):** Deploy once, get a permanent URL. Your MCP client connects to the URL — no `npx` on the client side.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/1alexandrer/moodle-mcp)

After deploying, set `MOODLE_URL` and `MOODLE_TOKEN` as [secrets in the CF dashboard](https://dash.cloudflare.com/) or via:
```bash
npx wrangler secret put MOODLE_URL
npx wrangler secret put MOODLE_TOKEN
npm run deploy
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

## Getting Your Token

### Option A — Moodle profile page (works everywhere)

1. Log in to your school's Moodle in a browser
2. Go to **Profile → Security keys** (URL: `https://moodle.yourschool.edu/user/managetoken.php`)
3. Find the **Moodle mobile web service** token and copy it
4. Set `MOODLE_TOKEN=<token>` in your MCP config

### Option B — Get the token from https://moodle.yourschool.edu/login/token.php?username=<YOURUSERNAME>&password=<YOURPASSWORD>&service=moodle_mobile_app
### Option C — Username + password (not SSO schools)

If your school uses a regular username/password (not Microsoft/Google/SSO), you can skip the token step entirely:

```json
"env": {
  "MOODLE_URL": "https://moodle.yourschool.edu",
  "MOODLE_USERNAME": "your_username",
  "MOODLE_PASSWORD": "your_password"
}
```

> ⚠️ **SSO schools**: If your school login page redirects to Microsoft, Google, or another identity provider, Option B won't work. Use Option A or C.

### Option D — Extract from Moodle mobile app (SSO schools)

1. Install the **Moodle app** on your phone and log in with SSO
2. Go to **App settings → About**
3. Tap the version number 5 times to enable developer mode
4. Go to **Developer options → Copy token** and copy it
5. Use that token as `MOODLE_TOKEN` in Option A

---

## Tools

| Tool | Description | Params |
|------|-------------|--------|
| `moodle_get_site_info` | School name, Moodle version, which APIs are enabled | — |
| `moodle_list_courses` | All your enrolled courses | — |
| `moodle_get_course` | Sections and all activities in a course | `courseId` |
| `moodle_list_resources` | Files and links, grouped by course section | `courseId` |
| `moodle_list_assignments` | Assignments with due dates, grouped by section | `courseId` |
| `moodle_get_assignment` | Submission status and grade feedback | `assignmentId` |
| `moodle_get_grades` | Full grade report with categories and feedback | `courseId` |
| `moodle_get_calendar_events` | Upcoming events across courses | `courseId?`, `daysAhead?` |
| `moodle_list_quizzes` | Quizzes with time limits and open dates | `courseId` |
| `moodle_get_quiz_attempts` | Your past attempt grades and states | `quizId` |
| `moodle_list_forums` | Forum activities in a course | `courseId` |
| `moodle_get_forum_discussions` | Recent discussions in a forum | `forumId` |
| `moodle_get_notifications` | Recent notifications (grades, feedback, replies) | `limit?` |

---

## Prompts

Use these in any MCP client that supports prompts (Claude Desktop, VS Code with Copilot, etc.):

| Prompt | Use case | Example |
|--------|----------|---------|
| `summarize-course` | Full course overview organized by section | `/summarize-course courseId=42` |
| `whats-due` | Prioritized due dates this week / next week | `/whats-due` or `/whats-due courseId=42` |
| `build-study-notes` | Build a linked Obsidian vault from course materials | `/build-study-notes courseId=42 vaultPath=~/obsidian/finals` |
| `exam-prep` | Topic-by-topic study guide based on grades and quiz results | `/exam-prep courseId=42` |
| `search-notes` | Natural language search across all course files | `/search-notes courseId=42 query="derivatives and limits"` |

---

## Obsidian Finals Prep

> Turn your entire semester into a linked knowledge graph in one command.

### Setup

1. **Install [Obsidian](https://obsidian.md)** (free, works on Mac/Windows/Linux)
2. Create a new vault, e.g. `~/obsidian/finals`
3. Make sure `moodle-mcp` is connected to your MCP client

### Build the vault

Use the `/build-study-notes` prompt in Claude Desktop:

```
/build-study-notes courseId=42 vaultPath=~/obsidian/finals
```

Or paste this directly into Claude:

```
Pull my [Course Name] (course ID 42), read all the lecture notes and slides,
and build a linked Obsidian vault at ~/obsidian/finals — one note per topic,
with [[wikilinks]] between related concepts, a MOC.md index, and tags for each section.
```

Claude will:
1. Pull all your course sections, files, assignments, and grades
2. Read each PDF and document directly via the MCP resources protocol
3. Write one `.md` file per section with key concepts, definitions, and examples
4. Add `[[wikilinks]]` between related terms across notes
5. Create a `MOC.md` (Map of Content) index linking everything

### See the graph

**Option A — Obsidian Graph View** (built-in, free)

1. Open the vault in Obsidian
2. Click **Graph View** (sidebar icon or `Cmd+G`)
3. Your entire course appears as a knowledge graph — linked concepts cluster together, isolated topics stand out as things to review

**Option B — Graphify** (richer visual graph)

1. Install [Graphify](https://graphify.app) — it reads the same `.md` files Obsidian writes
2. Point it at your vault folder (`~/obsidian/finals`)
3. Drag to explore connections; click any node to open the note and ask Claude about it

Both tools read the same Markdown vault — you can use both.

### Knowledge Graph preview

![Obsidian knowledge graph of a university course]
<img width="1565" height="947" alt="image" src="https://github.com/user-attachments/assets/382cf5ed-4806-4d3a-bfdc-6e4eeb15c3ec" />
*Your entire course as a linked knowledge graph — built in one command. Run `/build-study-notes` once to generate this.*

### Query the graph with Claude

Once the vault exists on disk, you can ask Claude Code or Claude Desktop questions like:

```
Explain the relationship between [[topic A]] and [[topic B]] in my course notes at ~/obsidian/finals
```

```
Based on my notes in ~/obsidian/finals, which topics do I need to review most before the exam?
```

Claude reads your `.md` files directly and reasons across the full linked graph.

### Natural language search

Once the vault is built, you can ask Claude to find specific content:

```
/search-notes courseId=42 query="the central limit theorem and when to use it"
```

Claude will look through all your course materials, find the relevant files, read them, and synthesize a direct answer.

---

## Compatibility

Some tools require your Moodle admin to enable specific web services. Run `moodle_get_site_info` to see which tools are available on your school's Moodle.

| Tool | Required | Notes |
|------|----------|-------|
| `moodle_list_courses`, `moodle_get_course`, `moodle_list_resources` | Always available | Core Moodle WS |
| `moodle_list_assignments`, `moodle_get_assignment` | Admin must enable | `mod_assign` service |
| `moodle_get_grades` | Admin must enable | `gradereport_user` service |
| `moodle_get_calendar_events` | Usually available | `core_calendar` service |
| `moodle_list_quizzes`, `moodle_get_quiz_attempts` | Admin may need to enable | `mod_quiz` service |
| `moodle_get_forum_discussions` | Admin may need to enable | `mod_forum` service |
| `moodle_get_notifications` | Admin may need to enable | `message_popup` service |

If a tool isn't available, it returns a helpful message explaining what your admin needs to enable — it won't crash the server.


---

## Contributing

Issues and PRs welcome. Open an issue first for large changes.

MIT License — © 2026 Alexandre Ribeiro
