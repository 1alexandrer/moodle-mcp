import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { authenticateViaBrowser } from "./browser-auth.js";
import {
  LOCAL_CONFIG_PATH,
  SystemCredentialStore,
  loadLocalSettings,
  resolveLocalBaseUrl,
  saveLocalSettings,
} from "./local-config.js";
import { normalizeUrl } from "./config.js";

export type CliCommand = "login" | "logout" | "help" | "interactive" | "server";

export interface ParsedCli {
  command: CliCommand;
  url?: string;
}

export function parseCli(argv: string[], isTty: boolean): ParsedCli {
  const [command, url, ...extra] = argv;
  if (extra.length) throw new Error("Too many command-line arguments.");
  if (!command) return { command: isTty ? "interactive" : "server" };
  if (command === "login" || command === "logout") return { command, url };
  if (command === "help" || command === "--help" || command === "-h") return { command: "help" };
  throw new Error(`Unknown command: ${command}`);
}

export async function runCli(parsed: ParsedCli): Promise<boolean> {
  switch (parsed.command) {
    case "server":
      return false;
    case "login":
      await runLogin(parsed.url);
      return true;
    case "logout":
      runLogout(parsed.url);
      return true;
    case "interactive":
      await runInteractiveSetup();
      return true;
    case "help":
      printHelp();
      return true;
  }
}

async function runInteractiveSetup(): Promise<void> {
  const baseUrl = resolveLocalBaseUrl();
  if (baseUrl) {
    const token = new SystemCredentialStore().getToken(baseUrl);
    if (token) {
      console.log(`\nMoodle MCP is already connected to ${baseUrl}.`);
      printClientConfiguration();
      console.log(`To authenticate again, run: npx moodle-mcp login ${baseUrl}\n`);
      return;
    }
  }
  await runLogin(baseUrl ?? undefined);
}

async function runLogin(urlArgument?: string): Promise<void> {
  const baseUrl = await resolveLoginUrl(urlArgument);
  console.log(`\nOpening an isolated browser window for ${baseUrl}.`);
  console.log("Sign in normally. The Moodle token will be captured and stored in your system keychain.");
  console.log("The token will not be printed or written to the config file.\n");

  const result = await authenticateViaBrowser(baseUrl);
  const store = new SystemCredentialStore();
  store.setToken(result.baseUrl, result.token);
  try {
    saveLocalSettings(result.baseUrl);
  } catch (error) {
    store.deleteToken(result.baseUrl);
    throw error;
  }

  console.log(`✓ Connected to ${result.siteName} (${result.baseUrl})`);
  console.log(`✓ Token stored in the system credential store`);
  console.log(`✓ Non-secret settings saved to ${LOCAL_CONFIG_PATH}`);
  printClientConfiguration();
}

function runLogout(urlArgument?: string): void {
  const rawUrl = urlArgument?.trim() || resolveLocalBaseUrl();
  if (!rawUrl) throw new Error("Pass the Moodle URL to logout, for example: npx moodle-mcp logout https://moodle.yourschool.edu");
  const baseUrl = normalizeUrl(rawUrl);
  const deleted = new SystemCredentialStore().deleteToken(baseUrl);
  console.log(
    deleted
      ? `Removed the local Moodle credential for ${baseUrl}. The server-side token was not revoked.`
      : `No local Moodle credential was found for ${baseUrl}.`,
  );
}

async function resolveLoginUrl(urlArgument?: string): Promise<string> {
  const candidate = urlArgument?.trim() || process.env.MOODLE_URL?.trim() || loadLocalSettings()?.baseUrl;
  if (candidate) return normalizeUrl(candidate);
  if (!process.stdin.isTTY) {
    throw new Error("Pass the Moodle URL: npx moodle-mcp login https://moodle.yourschool.edu");
  }
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question("Moodle URL (for example, https://moodle.yourschool.edu): ");
    if (!answer.trim()) throw new Error("Moodle URL is required.");
    return normalizeUrl(answer.trim());
  } finally {
    rl.close();
  }
}

function printClientConfiguration(): void {
  console.log(`
Add this MCP server to your client (no token in the configuration):

  "moodle": {
    "command": "npx",
    "args": ["-y", "moodle-mcp"]
  }
`);
}

function printHelp(): void {
  console.log(`
moodle-mcp — Moodle MCP server

Commands:
  npx moodle-mcp                         First-time browser setup
  npx moodle-mcp login [MOODLE_URL]      Sign in through the browser
  npx moodle-mcp logout [MOODLE_URL]     Remove the locally stored token

Environment variables remain available for advanced/CI use:
  MOODLE_URL + MOODLE_TOKEN
  MOODLE_URL + MOODLE_USERNAME + MOODLE_PASSWORD
`);
}
