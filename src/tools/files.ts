import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MoodleClient } from "../moodle-client.js";

interface ModuleContent {
  type: string;
  filename: string;
  fileurl: string;
  filesize: number;
  mimetype?: string;
}

interface CourseModule {
  id: number;
  name: string;
  modname: string;
  url?: string;
  contents?: ModuleContent[];
}

interface CourseSection {
  id: number;
  name: string;
  modules: CourseModule[];
}

const FILE_MODS = new Set(["resource", "url", "folder"]);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function listResources(client: MoodleClient, courseId: number): Promise<string> {
  const sections = await client.call<CourseSection[]>("core_course_get_contents", {
    courseid: courseId,
  });

  const lines: string[] = [`## Files — Course ${courseId}\n`];
  let hasFiles = false;

  for (const section of sections) {
    const fileMods = section.modules.filter((m) => FILE_MODS.has(m.modname));
    if (fileMods.length === 0) continue;

    lines.push(`### ${section.name || "General"}`);
    hasFiles = true;

    for (const mod of fileMods) {
      if (mod.modname === "url") {
        lines.push(`- 🔗 [${mod.name}](${mod.url ?? ""})`);
        continue;
      }
      if (!mod.contents || mod.contents.length === 0) {
        lines.push(`- 📁 **${mod.name}** *(empty)*`);
        continue;
      }
      for (const file of mod.contents) {
        if (file.type === "url") {
          lines.push(`- 🔗 [${file.filename}](${file.fileurl})`);
        } else {
          const url = client.fileUrl(file.fileurl);
          const size = formatSize(file.filesize);
          lines.push(`- 📄 [${file.filename}](${url}) *(${size})*`);
        }
      }
    }
    lines.push("");
  }

  if (!hasFiles) return "No downloadable files found in this course.";
  return lines.join("\n");
}

export function registerFileTools(server: McpServer, client: MoodleClient): void {
  server.tool(
    "moodle_list_resources",
    "List all downloadable files and links in a course, grouped by the course's own sections (weeks, chapters, topics — as defined by the professor). Returns authenticated download URLs.",
    { courseId: z.number().describe("Course ID from moodle_list_courses") },
    async ({ courseId }) => ({
      content: [{ type: "text" as const, text: await listResources(client, courseId) }],
    })
  );
}
