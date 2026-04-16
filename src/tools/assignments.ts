import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MoodleClient } from "../moodle-client.js";

interface AssignmentDetail {
  id: number;
  coursemodule: number;
  name: string;
  intro: string;
  duedate: number;
  allowsubmissionsfromdate: number;
  grade: number;
  nosubmissions: number;
}

interface AssignmentsResponse {
  courses: { id: number; assignments: AssignmentDetail[] }[];
}

interface CourseSection {
  id: number;
  name: string;
  modules: { id: number; name: string; modname: string }[];
}

interface SubmissionStatus {
  lastattempt?: {
    submission?: { status: string; timemodified: number };
    graded: boolean;
  };
  feedback?: {
    gradefordisplay: string;
    gradeddate: number;
    grade?: { grade: string };
  };
}

function formatDate(ts: number): string {
  if (!ts) return "No due date";
  return new Date(ts * 1000).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function listAssignments(client: MoodleClient, courseId: number): Promise<string> {
  if (!client.supports("mod_assign_get_assignments")) {
    return "Assignments API is not enabled on your Moodle. Ask your admin to enable the mod_assign web service.";
  }

  const [sections, assignData] = await Promise.all([
    client.call<CourseSection[]>("core_course_get_contents", { courseid: courseId }),
    client.call<AssignmentsResponse>("mod_assign_get_assignments", {
      "courseids[0]": courseId,
    }),
  ]);

  const assignments = assignData.courses[0]?.assignments ?? [];
  const byModule = new Map(assignments.map((a) => [a.coursemodule, a]));

  const lines: string[] = [`## Assignments — Course ${courseId}\n`];
  let hasAny = false;

  for (const section of sections) {
    const assignMods = section.modules.filter((m) => m.modname === "assign");
    if (assignMods.length === 0) continue;

    lines.push(`### ${section.name || "General"}`);
    hasAny = true;

    for (const mod of assignMods) {
      const detail = byModule.get(mod.id);
      if (!detail) {
        lines.push(`- **${mod.name}** *(details unavailable)*`);
        continue;
      }
      const due = detail.duedate ? `Due: ${formatDate(detail.duedate)}` : "No due date";
      const maxGrade = detail.grade > 0 ? ` | Max grade: ${detail.grade}` : "";
      lines.push(`- **${detail.name}** — ${due}${maxGrade}`);
      lines.push(`  ID: \`${detail.id}\` (use with moodle_get_assignment)`);
    }
    lines.push("");
  }

  if (!hasAny) return "No assignments found in this course.";
  return lines.join("\n");
}

export async function getAssignment(client: MoodleClient, assignmentId: number): Promise<string> {
  if (!client.supports("mod_assign_get_submission_status")) {
    return "Assignment submission status API is not enabled on your Moodle.";
  }

  const status = await client.call<SubmissionStatus>("mod_assign_get_submission_status", {
    assignid: assignmentId,
  });

  const lines: string[] = [`## Assignment ${assignmentId} — Submission Status\n`];

  const submission = status.lastattempt?.submission;
  if (submission) {
    lines.push(`**Status:** ${submission.status}`);
    if (submission.timemodified) {
      lines.push(`**Last modified:** ${formatDate(submission.timemodified)}`);
    }
  } else {
    lines.push("**Status:** Not submitted");
  }

  const graded = status.lastattempt?.graded;
  lines.push(`**Graded:** ${graded ? "Yes" : "No"}`);

  if (status.feedback) {
    lines.push(`\n**Grade:** ${status.feedback.gradefordisplay}`);
  }

  return lines.join("\n");
}

export function registerAssignmentTools(server: McpServer, client: MoodleClient): void {
  server.tool(
    "moodle_list_assignments",
    "List all assignments in a course, grouped by the course's sections, with due dates and grade info. Returns assignment IDs for use with moodle_get_assignment.",
    { courseId: z.number().describe("Course ID from moodle_list_courses") },
    async ({ courseId }) => ({
      content: [{ type: "text" as const, text: await listAssignments(client, courseId) }],
    })
  );

  server.tool(
    "moodle_get_assignment",
    "Get submission status and grade feedback for a specific assignment.",
    { assignmentId: z.number().describe("Assignment ID from moodle_list_assignments") },
    async ({ assignmentId }) => ({
      content: [{ type: "text" as const, text: await getAssignment(client, assignmentId) }],
    })
  );
}
