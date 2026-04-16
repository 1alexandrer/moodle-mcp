import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MoodleClient } from "../moodle-client.js";

export function registerSiteInfoTool(server: McpServer, client: MoodleClient): void {
  server.tool(
    "moodle_get_site_info",
    "Get information about your Moodle server and your account: school name, Moodle version, your name, and which APIs are enabled.",
    {},
    async () => {
      const enabledCount = client.supportedFunctions.size;
      const lines = [
        `## Moodle Site Info`,
        ``,
        `**School:** ${client.siteName}`,
        `**Version:** ${client.release}`,
        `**Your user ID:** ${client.userId}`,
        `**Enabled WS functions:** ${enabledCount > 0 ? enabledCount : "Unknown (server did not report)"}`,
      ];

      if (enabledCount > 0) {
        const toolStatus = [
          { name: "moodle_list_assignments", fn: "mod_assign_get_assignments" },
          { name: "moodle_get_assignment", fn: "mod_assign_get_submission_status" },
          { name: "moodle_get_grades", fn: "gradereport_user_get_grade_items" },
          { name: "moodle_get_calendar_events", fn: "core_calendar_get_action_events_by_timesort" },
          { name: "moodle_list_quizzes", fn: "mod_quiz_get_quizzes_by_courses" },
          { name: "moodle_get_quiz_attempts", fn: "mod_quiz_get_user_attempts" },
          { name: "moodle_get_forum_discussions", fn: "mod_forum_get_forum_discussions" },
          { name: "moodle_get_notifications", fn: "message_popup_get_popup_notifications" },
        ];

        lines.push(``, `**Tool availability on this server:**`);
        for (const { name, fn } of toolStatus) {
          const available = client.supports(fn) ? "✅" : "❌";
          lines.push(`- ${available} \`${name}\``);
        }
        lines.push(`- ✅ \`moodle_list_courses\` (always available)`);
        lines.push(`- ✅ \`moodle_get_course\` (always available)`);
        lines.push(`- ✅ \`moodle_list_resources\` (always available)`);
        lines.push(`- ✅ \`moodle_list_forums\` (always available)`);
        lines.push(`- ✅ \`moodle_list_quizzes\` (always available)`);
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
  );
}
