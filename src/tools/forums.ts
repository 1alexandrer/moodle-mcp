import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MoodleClient } from "../moodle-client.js";

interface CourseSection {
  id: number;
  name: string;
  modules: { id: number; name: string; modname: string; url?: string }[];
}

interface Discussion {
  id: number;
  discussion: number;
  name: string;
  firstuserfullname: string;
  numreplies: number;
  timemodified: number;
  pinned: boolean;
}

interface DiscussionsResponse {
  discussions: Discussion[];
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-CA", { dateStyle: "medium" });
}

export async function listForums(client: MoodleClient, courseId: number): Promise<string> {
  const sections = await client.call<CourseSection[]>("core_course_get_contents", {
    courseid: courseId,
  });

  const lines: string[] = [`## Forums — Course ${courseId}\n`];
  let hasAny = false;

  for (const section of sections) {
    const forumMods = section.modules.filter((m) => m.modname === "forum");
    if (forumMods.length === 0) continue;

    lines.push(`### ${section.name || "General"}`);
    hasAny = true;

    for (const mod of forumMods) {
      lines.push(`- **${mod.name}** — ID: \`${mod.id}\` (use with moodle_get_forum_discussions)`);
      if (mod.url) lines.push(`  [Open](${mod.url})`);
    }
    lines.push("");
  }

  if (!hasAny) return "No forums found in this course.";
  return lines.join("\n");
}

export async function getForumDiscussions(client: MoodleClient, forumId: number): Promise<string> {
  if (!client.supports("mod_forum_get_forum_discussions")) {
    return "Forum discussions API is not enabled on your Moodle. Ask your admin to enable mod_forum web services.";
  }

  const data = await client.call<DiscussionsResponse>("mod_forum_get_forum_discussions", {
    forumid: forumId,
    sortby: "timemodified",
    sortdirection: "DESC",
    page: 0,
    perpage: 20,
  });

  const discussions = data.discussions ?? [];
  if (discussions.length === 0) return `No discussions found in forum ${forumId}.`;

  const lines: string[] = [`## Forum ${forumId} — Recent Discussions\n`];

  for (const d of discussions) {
    const pinned = d.pinned ? " 📌" : "";
    lines.push(`- **${d.name}**${pinned}`);
    lines.push(`  By ${d.firstuserfullname} | ${d.numreplies} replies | Last activity: ${formatDate(d.timemodified)}`);
  }

  return lines.join("\n");
}

export function registerForumTools(server: McpServer, client: MoodleClient): void {
  server.tool(
    "moodle_list_forums",
    "List all forum activities in a course, grouped by section. Returns forum IDs for use with moodle_get_forum_discussions.",
    { courseId: z.number().describe("Course ID from moodle_list_courses") },
    async ({ courseId }) => ({
      content: [{ type: "text" as const, text: await listForums(client, courseId) }],
    })
  );

  server.tool(
    "moodle_get_forum_discussions",
    "Get recent discussions in a forum — title, author, reply count, and last activity date.",
    { forumId: z.number().describe("Forum ID from moodle_list_forums") },
    async ({ forumId }) => ({
      content: [{ type: "text" as const, text: await getForumDiscussions(client, forumId) }],
    })
  );
}
