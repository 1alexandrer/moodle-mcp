import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { normalizeUrl, parseMaxFileMb } from "./config.js";
import { MoodleClient } from "./moodle-client.js";
import { registerAllTools } from "./register-tools.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

interface Env {
  MOODLE_URL: string;
  MOODLE_TOKEN: string;
  MOODLE_MCP_MAX_FILE_MB?: string;
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

    try {
      const maxFileBytes = Math.floor(parseMaxFileMb(env.MOODLE_MCP_MAX_FILE_MB) * 1024 * 1024);
      const config = {
        baseUrl: normalizeUrl(env.MOODLE_URL),
        token: env.MOODLE_TOKEN,
        maxFileBytes,
      };
      const client = await MoodleClient.create(config);

      const server = new McpServer({ name: "moodle-mcp", version: "0.2.0" });

      registerAllTools(server, client);
      registerResources(server, client);
      registerPrompts(server);

      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      return transport.handleRequest(request);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
