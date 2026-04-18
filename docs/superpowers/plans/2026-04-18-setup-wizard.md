# Setup Wizard & Obsidian Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `npx moodle-mcp` plug-and-play — new users get an interactive wizard that guides them to their token, generates an Obsidian vault, and prints their Claude Desktop config snippet.

**Architecture:** `server.ts` detects TTY + no config on startup and calls `runWizard()` from `wizard.ts`, which prompts for URL/token, saves `~/.moodle-mcp.json`, then calls `buildVault()` from `vault.ts`. In normal MCP server mode, `getConfig()` reads env vars first, then falls back to the saved config file. The vault builder is also exposed as the `moodle_build_obsidian_vault` MCP tool via `src/tools/vault.ts`.

**Tech Stack:** Node.js built-ins (`readline`, `fs`, `os`, `child_process`), TypeScript, existing `MoodleClient`, `@modelcontextprotocol/sdk`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/config.ts` | Modify | Add `loadConfigFile()` and `saveConfigFile()` — config file read/write |
| `src/wizard.ts` | Create | Interactive terminal wizard (readline prompts, browser open) |
| `src/vault.ts` | Create | Obsidian vault generation — fetch data, write markdown with wikilinks |
| `src/tools/vault.ts` | Create | Register `moodle_build_obsidian_vault` MCP tool |
| `src/server.ts` | Modify | Wizard trigger logic + register vault tool |
| `README.md` | Modify | Onboarding overhaul — leads with one command |
| `package.json` | Modify | `npm pkg fix`, bump to `0.2.0` |

---

## Task 1: Add config file support to `src/config.ts`

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Add file read/write to config.ts**

Replace the entire contents of `src/config.ts` with:

```typescript
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface Config {
  baseUrl: string;
  token?: string;
  username?: string;
  password?: string;
}

const CONFIG_PATH = join(homedir(), ".moodle-mcp.json");

export function loadConfigFile(): Config | null {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Config;
  } catch {
    return null;
  }
}

export function saveConfigFile(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    throw new Error(`Invalid MOODLE_URL: "${raw}" is not a valid URL`);
  }
}

export function getConfig(): Config {
  const rawUrl = process.env.MOODLE_URL;

  if (!rawUrl) {
    const fileConfig = loadConfigFile();
    if (fileConfig) return fileConfig;
    throw new Error("MOODLE_URL environment variable is required");
  }

  const baseUrl = normalizeUrl(rawUrl);
  const token = process.env.MOODLE_TOKEN;
  const username = process.env.MOODLE_USERNAME;
  const password = process.env.MOODLE_PASSWORD;

  if (!token && (!username || !password)) {
    throw new Error(
      "Set either MOODLE_TOKEN or both MOODLE_USERNAME and MOODLE_PASSWORD"
    );
  }

  return { baseUrl, token, username, password };
}
```

- [ ] **Step 2: Build and confirm no TypeScript errors**

```bash
npm run build
```

Expected: no errors, `dist/config.js` updated.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: add config file fallback to getConfig"
```

---

## Task 2: Create `src/wizard.ts`

**Files:**
- Create: `src/wizard.ts`

- [ ] **Step 1: Create the wizard**

Create `src/wizard.ts`:

```typescript
import * as readline from "readline";
import { exec } from "child_process";
import { normalizeUrl, saveConfigFile } from "./config.js";
import type { Config } from "./config.js";

function openBrowser(url: string): void {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function runWizard(): Promise<Config> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nWelcome to moodle-mcp!\n");
  console.log("Let's connect to your Moodle in 2 steps.\n");

  console.log("Step 1 — Your Moodle URL");
  console.log("  Enter the URL your school uses for Moodle");
  const rawUrl = await ask(rl, "  (e.g. https://moodle.myschool.edu): ");
  const baseUrl = normalizeUrl(rawUrl.trim());

  console.log("\nStep 2 — Your API token");
  console.log("  To get your token:");
  console.log("    1. Log into Moodle in your browser");
  console.log("    2. Go to: Profile → Preferences → Security keys");
  console.log("       (opening in browser now...)");
  openBrowser(`${baseUrl}/user/managetoken.php`);
  console.log('    3. Copy the "Moodle mobile web service" token');
  const token = await ask(rl, "  Enter token: ");

  rl.close();

  const config: Config = { baseUrl, token: token.trim() };
  saveConfigFile(config);
  console.log("\n✓ Config saved to ~/.moodle-mcp.json");

  return config;
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: no errors, `dist/wizard.js` created.

- [ ] **Step 3: Commit**

```bash
git add src/wizard.ts
git commit -m "feat: add interactive setup wizard"
```

---

## Task 3: Create `src/vault.ts`

**Files:**
- Create: `src/vault.ts`

- [ ] **Step 1: Create the vault generator**

Create `src/vault.ts`:

```typescript
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { MoodleClient } from "./moodle-client.js";

interface Course {
  id: number;
  fullname: string;
  shortname: string;
  startdate: number;
}

interface Assignment {
  id: number;
  coursemodule: number;
  name: string;
  duedate: number;
}

interface AssignmentsResponse {
  courses: { id: number; assignments: Assignment[] }[];
}

function safe(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-").trim();
}

function fmtDate(ts: number): string {
  if (!ts) return "No due date";
  return new Date(ts * 1000).toISOString().split("T")[0];
}

const GRAPH_CONFIG = {
  "collapse-filter": false,
  search: "",
  showTags: false,
  showAttachments: false,
  hideUnresolved: false,
  showOrphans: true,
  "collapse-color-groups": false,
  colorGroups: [
    { query: "path:Courses", color: { a: 1, rgb: 4580765 } },
    { query: "path:Assignments", color: { a: 1, rgb: 14680066 } },
  ],
  "collapse-display": false,
  showArrow: false,
  textFadeMultiplier: 0,
  nodeSizeMultiplier: 1.2,
  lineSizeMultiplier: 1,
  "collapse-forces": false,
  centerStrength: 0.518713248970312,
  repelStrength: 10,
  linkStrength: 1,
  linkDistance: 30,
  scale: 1,
  close: false,
};

export async function buildVault(
  client: MoodleClient,
  outputPath?: string
): Promise<string> {
  const root = outputPath ?? join(homedir(), "moodle-vault");
  const coursesDir = join(root, "Courses");
  const assignmentsDir = join(root, "Assignments");
  const obsidianDir = join(root, ".obsidian");

  mkdirSync(coursesDir, { recursive: true });
  mkdirSync(assignmentsDir, { recursive: true });
  mkdirSync(obsidianDir, { recursive: true });

  const courses = await client.call<Course[]>("core_enrol_get_users_courses", {
    userid: client.userId,
  });

  let assignsByCourse = new Map<number, Assignment[]>();

  if (client.supports("mod_assign_get_assignments") && courses.length > 0) {
    const courseParams = Object.fromEntries(
      courses.map((c, i) => [`courseids[${i}]`, c.id])
    );
    const assignData = await client.call<AssignmentsResponse>(
      "mod_assign_get_assignments",
      courseParams
    );
    assignsByCourse = new Map(
      assignData.courses.map((c) => [c.id, c.assignments])
    );
  }

  // Dashboard — central graph node
  const courseLinks = courses
    .map((c) => `- [[${safe(c.fullname)}]]`)
    .join("\n");
  writeFileSync(
    join(root, "Dashboard.md"),
    `# Moodle Dashboard\n\n## Courses\n\n${courseLinks}\n`
  );

  let assignmentCount = 0;

  for (const course of courses) {
    const assigns = assignsByCourse.get(course.id) ?? [];
    assignmentCount += assigns.length;

    const assignLinks = assigns
      .map((a) => `- [[${safe(a.name)}]]`)
      .join("\n");

    const courseNote = [
      `---`,
      `course_id: ${course.id}`,
      `shortname: ${course.shortname}`,
      `start_date: ${fmtDate(course.startdate)}`,
      `---`,
      ``,
      `# ${course.fullname}`,
      ``,
      `**Short name:** ${course.shortname}`,
      `**Started:** ${fmtDate(course.startdate)}`,
      ``,
      assigns.length > 0 ? `## Assignments\n\n${assignLinks}` : "",
    ]
      .join("\n")
      .trimEnd();

    writeFileSync(join(coursesDir, `${safe(course.fullname)}.md`), courseNote);

    for (const assign of assigns) {
      const assignNote = [
        `---`,
        `course: ${course.fullname}`,
        `due_date: ${fmtDate(assign.duedate)}`,
        `assignment_id: ${assign.id}`,
        `---`,
        ``,
        `# ${assign.name}`,
        ``,
        `**Course:** [[${safe(course.fullname)}]]`,
        `**Due:** ${fmtDate(assign.duedate)}`,
      ].join("\n");

      writeFileSync(
        join(assignmentsDir, `${safe(assign.name)}.md`),
        assignNote
      );
    }
  }

  writeFileSync(
    join(obsidianDir, "graph.json"),
    JSON.stringify(GRAPH_CONFIG, null, 2)
  );

  return `✓ Obsidian vault created at ${root} (${courses.length} courses, ${assignmentCount} assignments)`;
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: no errors, `dist/vault.js` created.

- [ ] **Step 3: Commit**

```bash
git add src/vault.ts
git commit -m "feat: add Obsidian vault generator"
```

---

## Task 4: Create `src/tools/vault.ts`

**Files:**
- Create: `src/tools/vault.ts`

- [ ] **Step 1: Create the MCP tool**

Create `src/tools/vault.ts`:

```typescript
import { z } from "zod";
import { homedir } from "os";
import { join } from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MoodleClient } from "../moodle-client.js";
import { buildVault } from "../vault.js";

export function registerVaultTool(server: McpServer, client: MoodleClient): void {
  server.tool(
    "moodle_build_obsidian_vault",
    `Generate or refresh an Obsidian vault with all your Moodle courses and assignments. Notes are wikilinked for graph view. Default output: ${join(homedir(), "moodle-vault")}`,
    {
      outputPath: z
        .string()
        .optional()
        .describe("Folder path for the vault. Defaults to ~/moodle-vault"),
    },
    async ({ outputPath }) => {
      const summary = await buildVault(client, outputPath);
      return { content: [{ type: "text" as const, text: summary }] };
    }
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: no errors, `dist/tools/vault.js` created.

- [ ] **Step 3: Commit**

```bash
git add src/tools/vault.ts
git commit -m "feat: add moodle_build_obsidian_vault MCP tool"
```

---

## Task 5: Update `src/server.ts` — wizard trigger + vault tool

**Files:**
- Modify: `src/server.ts`

- [ ] **Step 1: Replace server.ts**

Replace the entire contents of `src/server.ts` with:

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig, loadConfigFile } from "./config.js";
import { MoodleClient } from "./moodle-client.js";
import { runWizard } from "./wizard.js";
import { buildVault } from "./vault.js";
import { registerCourseTools } from "./tools/courses.js";
import { registerFileTools } from "./tools/files.js";
import { registerAssignmentTools } from "./tools/assignments.js";
import { registerGradeTools } from "./tools/grades.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerQuizTools } from "./tools/quizzes.js";
import { registerForumTools } from "./tools/forums.js";
import { registerNotificationTools } from "./tools/notifications.js";
import { registerSiteInfoTool } from "./tools/siteinfo.js";
import { registerVaultTool } from "./tools/vault.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

async function main() {
  const hasEnvConfig = !!process.env.MOODLE_URL;
  const hasFileConfig = !!loadConfigFile();

  if (!hasEnvConfig && !hasFileConfig && process.stdin.isTTY) {
    const config = await runWizard();
    const client = await MoodleClient.create(config);
    console.log("\n✓ Fetching your courses...");
    const summary = await buildVault(client);
    console.log(summary);
    console.log(
      "\nAdd this to your Claude Desktop config and restart Claude:\n"
    );
    console.log(
      JSON.stringify(
        { mcpServers: { moodle: { command: "npx", args: ["moodle-mcp"] } } },
        null,
        2
      )
    );
    console.log("\nYou're all set!");
    process.exit(0);
  }

  const config = getConfig();
  const client = await MoodleClient.create(config);

  const server = new McpServer({
    name: "moodle-mcp",
    version: "0.2.0",
  });

  registerCourseTools(server, client);
  registerFileTools(server, client);
  registerAssignmentTools(server, client);
  registerGradeTools(server, client);
  registerCalendarTools(server, client);
  registerQuizTools(server, client);
  registerForumTools(server, client);
  registerNotificationTools(server, client);
  registerSiteInfoTool(server, client);
  registerVaultTool(server, client);
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

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Smoke-test the wizard locally**

Delete your saved config first so the wizard triggers:

```bash
# Windows PowerShell:
Remove-Item "$env:USERPROFILE\.moodle-mcp.json" -ErrorAction SilentlyContinue
node dist/server.js
```

Expected: wizard prompt appears — "Welcome to moodle-mcp!"

After completing the wizard, check the vault was created:

```bash
ls "$env:USERPROFILE\moodle-vault"
```

Expected: `Dashboard.md`, `Courses/`, `Assignments/`, `.obsidian/graph.json`

- [ ] **Step 4: Confirm normal MCP mode still works**

```bash
$env:MOODLE_URL="https://moodle.yourschool.edu"; $env:MOODLE_TOKEN="yourtoken"; node dist/server.js
```

Expected: server starts silently (no wizard), waits for MCP messages.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts
git commit -m "feat: wire wizard trigger and vault tool in server.ts"
```

---

## Task 6: README overhaul

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README.md**

Replace the entire contents of `README.md` with:

```markdown
# moodle-mcp

> Give Claude full access to your Moodle. One command to set up.

**13 tools · 5 prompts · Obsidian vault with graph view**

---

## Quick Start

```bash
npx moodle-mcp
```

The wizard walks you through the rest — it'll open your Moodle token page in the browser and generate your Obsidian vault automatically.

---

## What you get

- **Courses** — list all enrolled courses, browse sections and modules
- **Assignments** — see due dates, submission status, and grades
- **Calendar** — upcoming events and deadlines
- **Quizzes** — list quizzes and past attempts
- **Forums** — browse discussions
- **Notifications** — unread alerts from Moodle
- **Files** — access course resources
- **Obsidian vault** — auto-generated on setup, graph view pre-configured

## Refreshing your vault

Just tell Claude: **"refresh my Obsidian vault"**

Claude will call `moodle_build_obsidian_vault` and regenerate all notes with the latest data.

---

## Manual config (advanced / CI)

If you prefer environment variables over the wizard:

| Variable | Required | Description |
|----------|----------|-------------|
| `MOODLE_URL` | Yes | Your school's Moodle URL |
| `MOODLE_TOKEN` | Either/or | API token (preferred) |
| `MOODLE_USERNAME` | Either/or | Username (non-SSO only) |
| `MOODLE_PASSWORD` | Either/or | Password (non-SSO only) |

Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

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

---

## Getting your token manually

1. Log into your school's Moodle
2. Go to **Profile → Preferences → Security keys**
   (URL: `https://moodle.yourschool.edu/user/managetoken.php`)
3. Copy the **Moodle mobile web service** token

### Option B — Username + password (non-SSO schools only)

If your school uses a plain username/password (no Microsoft/Google/SSO):

```json
"env": {
  "MOODLE_URL": "https://moodle.yourschool.edu",
  "MOODLE_USERNAME": "your_username",
  "MOODLE_PASSWORD": "your_password"
}
```

---

## MCP Prompts

| Prompt | What it does |
|--------|-------------|
| `summarize-course` | One-page summary of a course |
| `whats-due` | All upcoming deadlines |
| `build-study-notes` | Study notes from course content |
| `exam-prep` | Exam prep questions |
| `search-notes` | Search across your Moodle content |

---

## Requirements

- Node.js 18+
- Claude Desktop, VS Code with MCP, or any MCP-compatible client
- A Moodle instance with web services enabled

---

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: overhaul README with one-command onboarding"
```

---

## Task 7: Fix package.json, bump version, publish

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Fix package.json and bump version**

```bash
npm pkg fix
npm pkg set version=0.2.0
```

- [ ] **Step 2: Build and publish**

```bash
npm run build
npm publish
```

Expected: `moodle-mcp@0.2.0` published to npm.

- [ ] **Step 3: Verify published version**

```bash
npm info moodle-mcp version
```

Expected: `0.2.0`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: bump to 0.2.0 and fix package.json"
```

---

## Self-Review

**Spec coverage:**
- ✓ Setup wizard with token guidance and browser open
- ✓ Config file saved to `~/.moodle-mcp.json`
- ✓ Env vars take precedence over file (Task 1, `getConfig()`)
- ✓ TTY detection for wizard trigger (Task 5, `server.ts`)
- ✓ Obsidian vault with wikilinks and graph.json (Task 3)
- ✓ `moodle_build_obsidian_vault` MCP tool (Task 4)
- ✓ Claude Desktop snippet printed after setup (Task 5)
- ✓ README overhaul leading with one command (Task 6)
- ✓ npm publish at 0.2.0 (Task 7)

**Types consistent across tasks:**
- `Config` defined in `config.ts`, imported by `wizard.ts`, `vault.ts`, `tools/vault.ts`, `server.ts` ✓
- `buildVault(client: MoodleClient, outputPath?: string): Promise<string>` used identically in Task 3, Task 4, Task 5 ✓
- `runWizard(): Promise<Config>` defined in Task 2, called in Task 5 ✓
- `loadConfigFile(): Config | null` defined in Task 1, called in Task 5 ✓
