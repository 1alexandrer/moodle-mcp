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

async function listResources(client: MoodleClient, courseId: number): Promise<string> {
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
        // External link (not a Moodle-hosted file). Safe to show as-is — it's
        // whatever the professor linked, and moodle_download_file cannot fetch it.
        if (mod.url) {
          lines.push(`- 🔗 [${mod.name}](${mod.url}) *(external)*`);
        } else {
          lines.push(`- 🔗 **${mod.name}** *(external)*`);
        }
        continue;
      }
      if (!mod.contents || mod.contents.length === 0) {
        lines.push(`- 📁 **${mod.name}** *(empty)*`);
        continue;
      }
      for (const file of mod.contents) {
        if (file.type !== "file") continue;
        const mime = file.mimetype ?? "application/octet-stream";
        const fileId = await client.fileIdStore.seal({
          userId: client.userId,
          courseId,
          fileurl: file.fileurl,
          mime,
          filename: file.filename,
          filesize: file.filesize,
        });
        const size = formatSize(file.filesize);
        lines.push(`- 📄 **${file.filename}** *(${size})* — fileId: \`${fileId}\``);
      }
    }
    lines.push("");
  }

  if (!hasFiles) return "No downloadable files found in this course.";
  lines.push(
    "_Call `moodle_download_file` with a fileId above to read the file's contents._",
  );
  return lines.join("\n");
}

export function registerFileTools(server: McpServer, client: MoodleClient): void {
  server.tool(
    "moodle_list_resources",
    "List all downloadable files and links in a course, grouped by the course's own sections (weeks, chapters, topics — as defined by the professor). Each file gets an opaque fileId you pass to moodle_download_file to read contents. External URL-module links are shown as-is.",
    { courseId: z.number().describe("Course ID from moodle_list_courses") },
    async ({ courseId }) => ({
      content: [{ type: "text" as const, text: await listResources(client, courseId) }],
    }),
  );
}
