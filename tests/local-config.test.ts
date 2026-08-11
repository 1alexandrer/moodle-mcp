import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getLocalConfig,
  loadLocalSettings,
  saveLocalSettings,
  type CredentialStore,
} from "../src/local-config.js";

class MemoryCredentialStore implements CredentialStore {
  readonly tokens = new Map<string, string>();
  getToken(baseUrl: string): string | null { return this.tokens.get(baseUrl) ?? null; }
  setToken(baseUrl: string, token: string): void { this.tokens.set(baseUrl, token); }
  deleteToken(baseUrl: string): boolean { return this.tokens.delete(baseUrl); }
}

describe("local browser-auth configuration", () => {
  const originalEnv = process.env;
  let configPath: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MOODLE_URL;
    delete process.env.MOODLE_TOKEN;
    delete process.env.MOODLE_USERNAME;
    delete process.env.MOODLE_PASSWORD;
    configPath = join(mkdtempSync(join(tmpdir(), "moodle-mcp-test-")), "settings.json");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("stores only non-secret settings with private file permissions", () => {
    saveLocalSettings("https://ava.univesp.br/course/view.php?id=1", configPath);
    expect(loadLocalSettings(configPath)).toEqual({
      version: 1,
      baseUrl: "https://ava.univesp.br",
      auth: "browser",
    });
    expect(readFileSync(configPath, "utf8")).not.toContain("token");
    expect(statSync(configPath).mode & 0o777).toBe(0o600);
  });

  it("loads the keychain token scoped to the configured Moodle URL", () => {
    saveLocalSettings("https://ava.univesp.br", configPath);
    const store = new MemoryCredentialStore();
    store.setToken("https://ava.univesp.br", "univesp-token");
    store.setToken("https://other.example", "other-token");
    const config = getLocalConfig(store, configPath);
    expect(config.token).toBe("univesp-token");
    expect(config.baseUrl).toBe("https://ava.univesp.br");
  });

  it("gives explicit environment credentials precedence over the keychain", () => {
    saveLocalSettings("https://ava.univesp.br", configPath);
    const store = new MemoryCredentialStore();
    store.setToken("https://ava.univesp.br", "stored-token");
    process.env.MOODLE_TOKEN = "environment-token";
    expect(getLocalConfig(store, configPath).token).toBe("environment-token");
  });

  it("preserves username and password authentication for non-SSO sites", () => {
    saveLocalSettings("https://moodle.example", configPath);
    process.env.MOODLE_USERNAME = "student";
    process.env.MOODLE_PASSWORD = "password";
    const config = getLocalConfig(new MemoryCredentialStore(), configPath);
    expect(config.username).toBe("student");
    expect(config.password).toBe("password");
    expect(config.token).toBeUndefined();
  });

  it("uses an environment URL with a token stored for that exact origin", () => {
    saveLocalSettings("https://other.example", configPath);
    process.env.MOODLE_URL = "https://ava.univesp.br/course/view.php?id=1";
    const store = new MemoryCredentialStore();
    store.setToken("https://ava.univesp.br", "right-token");
    expect(getLocalConfig(store, configPath).token).toBe("right-token");
  });

  it("fails without writing plaintext when the credential store is unavailable", () => {
    saveLocalSettings("https://ava.univesp.br", configPath);
    const failingStore: CredentialStore = {
      getToken: () => { throw new Error("keychain unavailable"); },
      setToken: () => undefined,
      deleteToken: () => false,
    };
    expect(() => getLocalConfig(failingStore, configPath)).toThrow("keychain unavailable");
    expect(readFileSync(configPath, "utf8")).not.toContain("token");
  });

  it("provides an actionable error when no credential exists", () => {
    saveLocalSettings("https://ava.univesp.br", configPath);
    expect(() => getLocalConfig(new MemoryCredentialStore(), configPath))
      .toThrow("npx moodle-mcp login https://ava.univesp.br");
  });
});
