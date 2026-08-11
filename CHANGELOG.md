# Changelog

## Unreleased

### Added

- Browser-assisted Moodle Mobile authentication for SSO and Moodle Workplace sites
- `moodle-mcp login [url]` first-use flow with token validation
- System credential-store persistence via Keychain, Credential Manager, or Secret Service
- `moodle-mcp logout [url]` for removing local credentials
- Tokenless local MCP client configuration

### Changed

- Local configuration now resolves explicit environment credentials before keychain credentials
- Invalid stored tokens point users back to the browser login command
- Updated the MCP SDK and patched production transitive dependencies

### Security

- Browser tokens are bound to a random single-use passport and never printed or written to the settings file
- Browser sessions use an isolated temporary profile that is deleted after authentication

## [0.1.0] — 2026-04-15

### Added

**Tools (13 total)**
- `moodle_get_site_info` — school name, Moodle version, enabled API status
- `moodle_list_courses` — all enrolled courses
- `moodle_get_course` — sections and activities
- `moodle_list_resources` — files and links grouped by course section
- `moodle_list_assignments` — assignments with due dates, grouped by section
- `moodle_get_assignment` — submission status and grade feedback
- `moodle_get_grades` — full grade report with category grouping
- `moodle_get_calendar_events` — upcoming events with optional course filter
- `moodle_list_quizzes` — quizzes with time limits and open/close dates
- `moodle_get_quiz_attempts` — past attempt history and grades
- `moodle_list_forums` — forum activities grouped by section
- `moodle_get_forum_discussions` — recent discussions with reply counts
- `moodle_get_notifications` — recent notifications with unread indicator

**MCP Resources**
- Course files exposed as MCP resources at `moodle://courses/{courseId}/files/{encodedUrl}`
- PDFs and text files readable directly by Claude
- Enables AI-powered document synthesis

**MCP Prompts**
- `summarize-course` — structured course summary
- `whats-due` — prioritized upcoming deadlines
- `build-study-notes` — builds a linked Obsidian vault from course materials
- `exam-prep` — study guide based on grades and quiz results
- `search-notes` — natural language search across course files

**Infrastructure**
- Token auth + username/password auth
- Graceful degradation: tools return helpful messages instead of crashing when a school's Moodle doesn't expose an API
- `supports()` helper on `MoodleClient` for capability detection
- Natural section grouping in all listing tools (preserves professor's structure)
