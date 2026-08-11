



# moodle-mcp

[![npm version](https://img.shields.io/npm/v/moodle-mcp?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/moodle-mcp)
[![npm downloads](https://img.shields.io/npm/dm/moodle-mcp?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/moodle-mcp)
[![GitHub stars](https://img.shields.io/github/stars/1alexandrer/moodle-mcp?style=social)](https://github.com/1alexandrer/moodle-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

> Give your MCP client access to Moodle — courses, files, assignments, grades, quizzes, calendar, and more. Browser login supports SSO and Moodle Workplace sites without manually copying a token.

> 📦 **[moodle-mcp on npm](https://www.npmjs.com/package/moodle-mcp)** — `npx moodle-mcp`

**14 tools · 5 prompts · MCP Resources**



---

## Install

### Step 1 — Sign in through your browser

Run this once before adding the local MCP server:

```bash
npx moodle-mcp login https://moodle.yourschool.edu
```

An isolated Chrome/Edge/Chromium window opens. Complete the normal Moodle or institutional SSO login. The Moodle mobile token is captured internally, validated, and stored in your operating system's credential store. It is never printed or written to the MCP configuration.

For another Moodle site, replace the URL. Running `npx moodle-mcp` with no arguments also starts the first-use wizard.

> **Verified with Moodle Workplace:** This flow has been tested against UNIVESP (`https://ava.univesp.br`) using Microsoft SSO with Authenticator 2FA.

### Step 2 — Pick your delivery mode

**Option A — Local (recommended for browser/SSO login):** Runs `npx moodle-mcp` on your machine each time your MCP client starts. No hosting and no token in the client configuration.

**Option B — Hosted (Cloudflare Worker):** Deploy once, get a permanent URL. Your MCP client connects to the URL — no `npx` on the client side.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/ )

The hosted Worker remains a single-account, token-based deployment. After deploying, set `MOODLE_URL` and `MOODLE_TOKEN` as [secrets in the CF dashboard](https://dash.cloudflare.com/) or via:
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
      "args": ["-y", "moodle-mcp"]
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
claude mcp add --transport stdio moodle -- npx -y moodle-mcp
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
      "args": ["-y", "moodle-mcp"]
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
      "args": ["-y", "moodle-mcp"]
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
      "args": ["-y", "moodle-mcp"]
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
        "args": ["-y", "moodle-mcp"]
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
      "args": ["-y", "moodle-mcp"]
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
    "args": ["-y", "moodle-mcp"]
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

---

## Authentication

### Browser login (recommended)

```bash
npx moodle-mcp login https://moodle.yourschool.edu
```

The browser flow uses Moodle's official `admin/tool/mobile/launch.php` endpoint. It works with regular Moodle login and browser-based identity providers such as SAML, LDAP-backed SSO, Microsoft, and Google when the site's Moodle mobile service is enabled.

The local settings file (`~/.moodle-mcp.json`) contains only the Moodle URL and authentication mode. The token is stored under the `moodle-mcp` service in macOS Keychain, Windows Credential Manager, or Linux Secret Service.

To replace an expired token, run `login` again. To remove the local credential without revoking the server-side Moodle token:

```bash
npx moodle-mcp logout https://moodle.yourschool.edu
```

### Manual token (advanced/CI/hosted Worker)

If browser login is unavailable, existing environment-based authentication is still supported:

1. Log in to your school's Moodle in a browser
2. Go to **Profile → Security keys** (URL: `https://moodle.yourschool.edu/user/managetoken.php`)
3. Find the **Moodle mobile web service** token and copy it
4. Set `MOODLE_URL` and `MOODLE_TOKEN` in the MCP process environment

### Username + password (non-SSO sites only)

If your school uses a regular username/password (not Microsoft/Google/SSO), you can skip the token step entirely:

```json
"env": {
  "MOODLE_URL": "https://moodle.yourschool.edu",
  "MOODLE_USERNAME": "your_username",
  "MOODLE_PASSWORD": "your_password"
}
```

> **SSO sites:** Direct username/password authentication cannot follow SAML, Microsoft, Google, or other browser redirects. Use browser login instead.

---

## Tools

| Tool | Description | Params |
|------|-------------|--------|
| `moodle_get_site_info` | School name, Moodle version, which APIs are enabled | — |
| `moodle_list_courses` | All your enrolled courses | — |
| `moodle_get_course` | Sections and all activities in a course | `courseId` |
| `moodle_list_resources` | Files and links grouped by section — returns opaque `fileId`s | `courseId` |
| `moodle_download_file` | Read a file by its `fileId` — returns text for text/JSON/XML, base64 for PDFs/DOCX/images | `fileId` |
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
| `moodle_list_courses`, `moodle_get_course`, `moodle_list_resources`, `moodle_download_file` | Always available | Core Moodle WS |
| `moodle_list_assignments`, `moodle_get_assignment` | Admin must enable | `mod_assign` service |
| `moodle_get_grades` | Admin must enable | `gradereport_user` service |
| `moodle_get_calendar_events` | Usually available | `core_calendar` service |
| `moodle_list_quizzes`, `moodle_get_quiz_attempts` | Admin may need to enable | `mod_quiz` service |
| `moodle_get_forum_discussions` | Admin may need to enable | `mod_forum` service |
| `moodle_get_notifications` | Admin may need to enable | `message_popup` service |

If a tool isn't available, it returns a helpful message explaining what your admin needs to enable — it won't crash the server.


---

## Security & file access (v0.2)

Browser authentication uses a random, single-use passport. The callback payload is accepted only when its Moodle-generated signature matches the current Moodle URL and login attempt. The captured token is then verified against `core_webservice_get_site_info` before it is written to the operating system credential store. Failed, cancelled, or timed-out logins do not persist a token.

The browser runs with a temporary isolated profile that is deleted after login. Existing personal Chrome sessions and profiles are not reused.

Tool responses never contain raw or authenticated Moodle file URLs. Instead, `moodle_list_resources` returns opaque `fileId`s — AES-GCM-sealed envelopes bound to your Moodle account via the access token. Pass a `fileId` to `moodle_download_file`, and the server:

1. Decrypts the `fileId` and checks it was issued to you (not another user).
2. Re-checks with Moodle that the file is still visible to you (catches unenrolment, hidden modules, removed files).
3. Refuses anything that isn't a `pluginfile.php` URL on your Moodle host (no SSRF relay).
4. Fetches the file server-side with the token attached to the outbound request only — the token never appears in anything returned to the MCP client.
5. Returns text for text/JSON/XML MIMEs, or the bytes as an MCP embedded resource (base64) for PDFs/DOCX/images.

This fixes the "domain not in the list of allowed fetch" error seen with Claude.ai's beta connectors when a chat tried to open a Moodle-hosted PDF: Claude no longer has to fetch anything cross-origin, because the content arrives inside the MCP response.

**Limits:** 25 MB per file by default (override with `MOODLE_MCP_MAX_FILE_MB=<positive number>`). File IDs expire after 24 hours. Rotating your Moodle token invalidates all outstanding IDs.



---

## Contributing

Issues and PRs welcome. Open an issue first for large changes.

MIT License — © 2026 Alexandre Ribeiro
