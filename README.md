# moodle-mcp

> Give Claude full access to your Moodle — courses, files, assignments, grades, quizzes, calendar, and more. Build Obsidian study vaults from your lecture notes in one command.

**13 tools · 5 prompts · MCP Resources**

---

## Quick Start

**1. Get your token** → [see below](#getting-your-token)

> **Tip:** Run `npx moodle-mcp` in your terminal at any time to see setup instructions printed for your platform.

**2. Add to your MCP client**

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):
```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["moodle-mcp"],
      "env": {
        "MOODLE_URL": "https://moodle.yourschool.edu",
        "MOODLE_TOKEN": "your_token_here"
      }
    }
  }
}
```

**VS Code** (add to `.vscode/mcp.json`):
```json
{
  "servers": {
    "moodle": {
      "command": "npx",
      "args": ["moodle-mcp"],
      "env": {
        "MOODLE_URL": "https://moodle.yourschool.edu",
        "MOODLE_TOKEN": "your_token_here"
      }
    }
  }
}
```

---

## Getting Your Token

### Option A — Moodle profile page (works everywhere)

1. Log in to your school's Moodle in a browser
2. Go to **Profile → Security keys** (URL: `https://moodle.yourschool.edu/user/managetoken.php`)
3. Find the **Moodle mobile web service** token and copy it
4. Set `MOODLE_TOKEN=<token>` in your MCP config

### Option B — Username + password (not SSO schools)

If your school uses a regular username/password (not Microsoft/Google/SSO), you can skip the token step entirely:

```json
"env": {
  "MOODLE_URL": "https://moodle.yourschool.edu",
  "MOODLE_USERNAME": "your_username",
  "MOODLE_PASSWORD": "your_password"
}
```

> ⚠️ **SSO schools**: If your school login page redirects to Microsoft, Google, or another identity provider, Option B won't work. Use Option A or C.

### Option C — Extract from Moodle mobile app (SSO schools)

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
