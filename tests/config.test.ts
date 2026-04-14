import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { normalizeUrl, getConfig } from "../src/config.js";

describe("normalizeUrl", () => {
  it("returns the origin of a base URL", () => {
    expect(normalizeUrl("https://moodle.uni.edu")).toBe("https://moodle.uni.edu");
  });

  it("strips trailing slash", () => {
    expect(normalizeUrl("https://moodle.uni.edu/")).toBe("https://moodle.uni.edu");
  });

  it("strips path from a full course URL", () => {
    expect(normalizeUrl("https://moodle.uni.edu/course/view.php?id=5")).toBe("https://moodle.uni.edu");
  });

  it("strips path and query params", () => {
    expect(normalizeUrl("https://moodle.uni.edu/mod/assign/view.php?id=99")).toBe("https://moodle.uni.edu");
  });

  it("throws on invalid URL", () => {
    expect(() => normalizeUrl("not-a-url")).toThrow("Invalid MOODLE_URL");
  });
});

describe("getConfig", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("throws when MOODLE_URL is missing", () => {
    delete process.env.MOODLE_URL;
    expect(() => getConfig()).toThrow("MOODLE_URL");
  });

  it("accepts token-only auth", () => {
    process.env.MOODLE_URL = "https://moodle.uni.edu";
    process.env.MOODLE_TOKEN = "abc123";
    delete process.env.MOODLE_USERNAME;
    delete process.env.MOODLE_PASSWORD;
    const config = getConfig();
    expect(config.baseUrl).toBe("https://moodle.uni.edu");
    expect(config.token).toBe("abc123");
  });

  it("accepts username+password auth", () => {
    process.env.MOODLE_URL = "https://moodle.uni.edu";
    delete process.env.MOODLE_TOKEN;
    process.env.MOODLE_USERNAME = "student@uni.edu";
    process.env.MOODLE_PASSWORD = "secret";
    const config = getConfig();
    expect(config.username).toBe("student@uni.edu");
    expect(config.password).toBe("secret");
  });

  it("throws when neither token nor credentials provided", () => {
    process.env.MOODLE_URL = "https://moodle.uni.edu";
    delete process.env.MOODLE_TOKEN;
    delete process.env.MOODLE_USERNAME;
    delete process.env.MOODLE_PASSWORD;
    expect(() => getConfig()).toThrow("MOODLE_TOKEN");
  });

  it("normalizes a full course URL", () => {
    process.env.MOODLE_URL = "https://moodle.uni.edu/course/view.php?id=5";
    process.env.MOODLE_TOKEN = "abc123";
    const config = getConfig();
    expect(config.baseUrl).toBe("https://moodle.uni.edu");
  });
});
