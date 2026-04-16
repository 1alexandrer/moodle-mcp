#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config.js";
import { MoodleClient } from "./moodle-client.js";
import { registerCourseTools } from "./tools/courses.js";
import { registerFileTools } from "./tools/files.js";
import { registerAssignmentTools } from "./tools/assignments.js";
import { registerGradeTools } from "./tools/grades.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerQuizTools } from "./tools/quizzes.js";
import { registerForumTools } from "./tools/forums.js";
import { registerNotificationTools } from "./tools/notifications.js";
import { registerSiteInfoTool } from "./tools/siteinfo.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

async function main() {
  const config = getConfig();
  const client = await MoodleClient.create(config);

  const server = new McpServer({
    name: "moodle-mcp",
    version: "0.1.0",
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
  registerResources(server, client);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start moodle-mcp:", err.message);
  process.exit(1);
});
