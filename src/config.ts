export interface Config {
  baseUrl: string;
  token?: string;
  username?: string;
  password?: string;
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

  return { baseUrl, token, username, password };
}
