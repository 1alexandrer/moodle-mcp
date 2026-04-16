import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MoodleClient } from "../moodle-client.js";

interface CalendarEvent {
  id: number;
  name: string;
  courseid: number;
  timestart: number;
  timeduration: number;
  eventtype: string;
  course?: { id: number; shortname: string; fullname: string };
  description?: string;
  url?: string;
}

interface CalendarResponse {
  events: CalendarEvent[];
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function getCalendarEvents(
  client: MoodleClient,
  courseId?: number,
  daysAhead = 30
): Promise<string> {
  if (!client.supports("core_calendar_get_action_events_by_timesort")) {
    return "Calendar API is not enabled on your Moodle. Ask your admin to enable core_calendar web services.";
  }

  const now = Math.floor(Date.now() / 1000);
  const until = now + daysAhead * 86400;

  const data = await client.call<CalendarResponse>(
    "core_calendar_get_action_events_by_timesort",
    {
      timesortfrom: now,
      timesortto: until,
      limitnum: 50,
    }
  );

  let events = data.events ?? [];
  if (courseId) {
    events = events.filter((e) => e.courseid === courseId);
  }

  if (events.length === 0) {
    return courseId
      ? `No upcoming events in the next ${daysAhead} days for course ${courseId}.`
      : `No upcoming events in the next ${daysAhead} days.`;
  }

  // Group by course
  const byCourse = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = event.course?.fullname ?? `Course ${event.courseid}`;
    if (!byCourse.has(key)) byCourse.set(key, []);
    byCourse.get(key)!.push(event);
  }

  const lines: string[] = [`## Upcoming Events (next ${daysAhead} days)\n`];

  for (const [courseName, courseEvents] of byCourse) {
    lines.push(`### ${courseName}`);
    for (const e of courseEvents) {
      const type = e.eventtype ? `\`${e.eventtype}\`` : "";
      lines.push(`- **${e.name}** — ${formatDate(e.timestart)} ${type}`);
      if (e.url) lines.push(`  [Open](${e.url})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function registerCalendarTools(server: McpServer, client: MoodleClient): void {
  server.tool(
    "moodle_get_calendar_events",
    "Get upcoming calendar events (assignments due, quizzes opening, etc.), optionally filtered to one course. Defaults to the next 30 days.",
    {
      courseId: z.number().optional().describe("Filter to a specific course ID (optional)"),
      daysAhead: z.number().optional().describe("How many days ahead to look (default: 30)"),
    },
    async ({ courseId, daysAhead }) => ({
      content: [{ type: "text" as const, text: await getCalendarEvents(client, courseId, daysAhead) }],
    })
  );
}
