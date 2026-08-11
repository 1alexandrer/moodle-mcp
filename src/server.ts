#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseCli, runCli } from "./cli.js";
import { getLocalConfig } from "./local-config.js";
import { MoodleClient } from "./moodle-client.js";
import { registerAllTools } from "./register-tools.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

async function main() {
  const handled = await runCli(parseCli(process.argv.slice(2), Boolean(process.stdin.isTTY)));
  if (handled) return;

  const config = getLocalConfig();
  let client: MoodleClient;
  try {
    client = await MoodleClient.create(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/invalid.*token/i.test(message)) {
      throw new Error(
        `${message} Run \`npx moodle-mcp login ${config.baseUrl}\` to authenticate again.`,
      );
    }
    throw error;
  }

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
