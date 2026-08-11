import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Entry } from "@napi-rs/keyring";
import { getMaxFileBytes, normalizeUrl, type Config } from "./config.js";

export const LOCAL_CONFIG_PATH = join(homedir(), ".moodle-mcp.json");
const KEYRING_SERVICE = "moodle-mcp";

export interface LocalSettings {
  version: 1;
  baseUrl: string;
  auth: "browser";
}

export interface CredentialStore {
  getToken(baseUrl: string): string | null;
  setToken(baseUrl: string, token: string): void;
  deleteToken(baseUrl: string): boolean;
}

export class SystemCredentialStore implements CredentialStore {
  private entry(baseUrl: string): Entry {
    return new Entry(KEYRING_SERVICE, normalizeUrl(baseUrl));
  }

  getToken(baseUrl: string): string | null {
    try {
      return this.entry(baseUrl).getPassword();
    } catch (error) {
      throw keyringError("read", error);
    }
  }

  setToken(baseUrl: string, token: string): void {
    try {
      this.entry(baseUrl).setPassword(token);
    } catch (error) {
      throw keyringError("write", error);
    }
  }

  deleteToken(baseUrl: string): boolean {
    try {
      return this.entry(baseUrl).deleteCredential();
    } catch (error) {
      if (isMissingCredentialError(error)) return false;
      throw keyringError("delete", error);
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissingCredentialError(error: unknown): boolean {
  return /no\s*(entry|credential)|not found/i.test(errorMessage(error));
}

function keyringError(action: string, error: unknown): Error {
  return new Error(
    `Could not ${action} the Moodle token in the system credential store: ${errorMessage(error)}. ` +
      "No plaintext credential was saved.",
  );
}

export function loadLocalSettings(path: string = LOCAL_CONFIG_PATH): LocalSettings | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<LocalSettings>;
    if (parsed.version !== 1 || parsed.auth !== "browser" || typeof parsed.baseUrl !== "string") {
      throw new Error("unsupported settings format");
    }
    return { version: 1, auth: "browser", baseUrl: normalizeUrl(parsed.baseUrl) };
  } catch (error) {
    throw new Error(`Could not read ${path}: ${errorMessage(error)}`);
  }
}

export function saveLocalSettings(
  baseUrl: string,
  path: string = LOCAL_CONFIG_PATH,
): void {
  const settings: LocalSettings = {
    version: 1,
    baseUrl: normalizeUrl(baseUrl),
    auth: "browser",
  };
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, path);
    chmodSync(path, 0o600);
  } catch (error) {
    try {
      unlinkSync(temporaryPath);
    } catch {
      // Nothing to clean up.
    }
    throw new Error(`Could not save ${path}: ${errorMessage(error)}`);
  }
}

export function resolveLocalBaseUrl(path: string = LOCAL_CONFIG_PATH): string | null {
  const envUrl = process.env.MOODLE_URL?.trim();
  if (envUrl) return normalizeUrl(envUrl);
  return loadLocalSettings(path)?.baseUrl ?? null;
}

export function getLocalConfig(
  store: CredentialStore = new SystemCredentialStore(),
  path: string = LOCAL_CONFIG_PATH,
): Config {
  const baseUrl = resolveLocalBaseUrl(path);
  if (!baseUrl) {
    throw new Error(
      "Moodle is not configured. Run `npx moodle-mcp login https://your-moodle.example` first.",
    );
  }

  const token = process.env.MOODLE_TOKEN?.trim() || undefined;
  const username = process.env.MOODLE_USERNAME?.trim() || undefined;
  const password = process.env.MOODLE_PASSWORD || undefined;
  if (token || (username && password)) {
    return { baseUrl, token, username, password, maxFileBytes: getMaxFileBytes() };
  }

  const storedToken = store.getToken(baseUrl);
  if (!storedToken) {
    throw new Error(
      `No Moodle credential is stored for ${baseUrl}. Run \`npx moodle-mcp login ${baseUrl}\`.`,
    );
  }
  return { baseUrl, token: storedToken, maxFileBytes: getMaxFileBytes() };
}
