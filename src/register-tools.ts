import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MoodleClient } from "./moodle-client.js";
import { registerCourseTools } from "./tools/courses.js";
import { registerFileTools } from "./tools/files.js";
import { registerDownloadTool } from "./tools/download.js";
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
  registerDownloadTool(server, client);
  registerAssignmentTools(server, client);
  registerGradeTools(server, client);
  registerCalendarTools(server, client);
  registerQuizTools(server, client);
  registerForumTools(server, client);
  registerNotificationTools(server, client);
  registerSiteInfoTool(server, client);
}
