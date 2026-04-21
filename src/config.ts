export interface Config {
  baseUrl: string;
  token?: string;
  username?: string;
  password?: string;
  /** Per-file download cap in bytes. Default 25 MB. */
  maxFileBytes: number;
}

export const DEFAULT_MAX_FILE_MB = 25;

export function parseMaxFileMb(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_MAX_FILE_MB;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      `MOODLE_MCP_MAX_FILE_MB must be a positive number; got "${raw}"`,
    );
  }
  return n;
}

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    throw new Error(`Invalid MOODLE_URL: "${raw}" is not a valid URL`);
  }
}

export function getConfig(): Config {
  const rawUrl = process.env.MOODLE_URL;
  if (!rawUrl) throw new Error("MOODLE_URL environment variable is required");

  const baseUrl = normalizeUrl(rawUrl);
  const token = process.env.MOODLE_TOKEN;
  const username = process.env.MOODLE_USERNAME;
  const password = process.env.MOODLE_PASSWORD;

  if (!token && (!username || !password)) {
    throw new Error(
      "Set either MOODLE_TOKEN or both MOODLE_USERNAME and MOODLE_PASSWORD"
    );
  }

  const maxFileBytes = Math.floor(parseMaxFileMb(process.env.MOODLE_MCP_MAX_FILE_MB) * 1024 * 1024);

  return { baseUrl, token, username, password, maxFileBytes };
}
