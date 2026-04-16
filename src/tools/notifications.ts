import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MoodleClient } from "../moodle-client.js";

interface Notification {
  id: number;
  useridfrom: number;
  subject: string;
  text: string;
  timecreated: number;
  read: boolean;
  fullmessageformat: number;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadcount: number;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export async function getNotifications(client: MoodleClient, limit = 20): Promise<string> {
  if (!client.supports("message_popup_get_popup_notifications")) {
    return "Notifications API is not enabled on your Moodle.";
  }

  const data = await client.call<NotificationsResponse>(
    "message_popup_get_popup_notifications",
    {
      useridto: client.userId,
      newestfirst: true,
      limit,
      offset: 0,
    }
  );

  const notifications = data.notifications ?? [];
  if (notifications.length === 0) return "No notifications found.";

  const lines: string[] = [
    `## Notifications (${data.unreadcount} unread)\n`,
  ];

  for (const n of notifications) {
    const status = n.read ? "" : " 🔵";
    const preview = stripHtml(n.text).slice(0, 120);
    lines.push(`- **${n.subject}**${status}`);
    lines.push(`  ${formatDate(n.timecreated)}`);
    if (preview) lines.push(`  ${preview}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function registerNotificationTools(server: McpServer, client: MoodleClient): void {
  server.tool(
    "moodle_get_notifications",
    "Get your recent Moodle notifications (grade returns, assignment feedback, forum replies, etc.). Unread items are marked with 🔵.",
    { limit: z.number().optional().describe("Number of notifications to fetch (default: 20)") },
    async ({ limit }) => ({
      content: [{ type: "text" as const, text: await getNotifications(client, limit) }],
    })
  );
}
