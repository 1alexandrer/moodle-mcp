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
moodle-mcp v0.2.0 — Moodle MCP Server

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
    version: "0.2.0",
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
