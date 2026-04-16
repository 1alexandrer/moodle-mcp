import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
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
  contents?: ModuleContent[];
}

interface CourseSection {
  id: number;
  name: string;
  modules: CourseModule[];
}

interface Course {
  id: number;
  fullname: string;
  shortname: string;
}

function encodeFileUrl(url: string): string {
  return Buffer.from(url).toString("hex");
}

function decodeFileUrl(hex: string): string {
  return Buffer.from(hex, "hex").toString();
}

function isTextMime(mime: string): boolean {
  return mime.startsWith("text/") || mime === "application/json" || mime === "application/xml";
}

export function registerResources(server: McpServer, client: MoodleClient): void {
  server.resource(
    "moodle-course-files",
    new ResourceTemplate("moodle://courses/{courseId}/files/{encodedUrl}", {
      list: async () => {
        const courses = await client.call<Course[]>("core_enrol_get_users_courses", {
          userid: client.userId,
        });

        const resources: { uri: string; name: string; mimeType?: string; description?: string }[] = [];

        await Promise.all(
          courses.map(async (course) => {
            try {
              const sections = await client.call<CourseSection[]>("core_course_get_contents", {
                courseid: course.id,
              });
              for (const section of sections) {
                for (const mod of section.modules) {
                  if (!["resource", "folder"].includes(mod.modname)) continue;
                  for (const file of mod.contents ?? []) {
                    if (file.type !== "file") continue;
                    const encodedUrl = encodeFileUrl(file.fileurl);
                    resources.push({
                      uri: `moodle://courses/${course.id}/files/${encodedUrl}`,
                      name: `${course.shortname} / ${section.name || "General"} / ${file.filename}`,
                      mimeType: file.mimetype,
                      description: `${course.fullname} — ${section.name || "General"}`,
                    });
                  }
                }
              }
            } catch {
              // Skip courses that fail (permission issues etc.)
            }
          })
        );

        return { resources };
      },
    }),
    async (uri, { courseId: _courseId, encodedUrl }) => {
      const fileUrl = decodeFileUrl(encodedUrl as string);
      const authenticatedUrl = client.fileUrl(fileUrl);

      const response = await fetch(authenticatedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: HTTP ${response.status}`);
      }

      const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";

      if (isTextMime(mimeType)) {
        const text = await response.text();
        return { contents: [{ uri: uri.href, mimeType, text }] };
      }

      // PDF and other binary formats — return as base64 blob
      const buffer = await response.arrayBuffer();
      const blob = Buffer.from(buffer).toString("base64");
      return { contents: [{ uri: uri.href, mimeType, blob }] };
    }
  );
}
