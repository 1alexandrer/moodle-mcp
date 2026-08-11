import { describe, expect, it } from "vitest";
import { parseCli } from "../src/cli.js";

describe("CLI parsing", () => {
  it("opens the wizard only for an interactive terminal", () => {
    expect(parseCli([], true)).toEqual({ command: "interactive" });
    expect(parseCli([], false)).toEqual({ command: "server" });
  });

  it("parses login, logout, and help", () => {
    expect(parseCli(["login", "https://ava.univesp.br"], true)).toEqual({
      command: "login",
      url: "https://ava.univesp.br",
    });
    expect(parseCli(["logout"], true)).toEqual({ command: "logout", url: undefined });
    expect(parseCli(["--help"], true)).toEqual({ command: "help" });
  });

  it("rejects unknown or excess arguments", () => {
    expect(() => parseCli(["unknown"], true)).toThrow("Unknown command");
    expect(() => parseCli(["login", "one", "two"], true)).toThrow("Too many");
  });
});
