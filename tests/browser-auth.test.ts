import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  authenticateViaBrowser,
  buildBrowserLoginUrl,
  decodeMoodleAppToken,
  extractTokenRedirect,
  type BrowserLoginDriver,
} from "../src/browser-auth.js";

function tokenRedirect(
  baseUrl: string,
  passport: string,
  token = "secret-token",
  scheme = "moodlemcp",
): string {
  const signature = createHash("md5").update(`${baseUrl}${passport}`).digest("hex");
  const payload = Buffer.from(`${signature}:::${token}:::private-token`).toString("base64");
  return `${scheme}://token=${encodeURIComponent(payload)}`;
}

describe("Moodle browser authentication payload", () => {
  it("builds the official mobile launch URL", () => {
    const url = new URL(buildBrowserLoginUrl("https://ava.univesp.br/course/view.php?id=1", "passport-1"));
    expect(url.origin + url.pathname).toBe("https://ava.univesp.br/admin/tool/mobile/launch.php");
    expect(url.searchParams.get("service")).toBe("moodle_mobile_app");
    expect(url.searchParams.get("passport")).toBe("passport-1");
    expect(url.searchParams.get("urlscheme")).toBe("moodlemcp");
  });

  it("accepts the configured or a Moodle-forced callback scheme", () => {
    expect(extractTokenRedirect("moodlemcp://token=abc==")).toBe("abc==");
    expect(extractTokenRedirect("avamobile://token=def==")).toBe("def==");
    expect(extractTokenRedirect("https://ava.univesp.br/login")) .toBeNull();
  });

  it("decodes a token only when the passport signature matches", () => {
    const redirect = tokenRedirect("https://ava.univesp.br", "one-use", "ws-token");
    const encoded = extractTokenRedirect(redirect)!;
    expect(decodeMoodleAppToken(encoded, "https://ava.univesp.br", "one-use")).toBe("ws-token");
    expect(() => decodeMoodleAppToken(encoded, "https://ava.univesp.br", "reused"))
      .toThrow("did not match");
  });

  it("rejects malformed and incomplete payloads", () => {
    expect(() => decodeMoodleAppToken("%%%", "https://ava.univesp.br", "p"))
      .toThrow("malformed");
    const incomplete = Buffer.from("not-a-signature:::token").toString("base64");
    expect(() => decodeMoodleAppToken(incomplete, "https://ava.univesp.br", "p"))
      .toThrow("incomplete");
  });
});

describe("authenticateViaBrowser", () => {
  it("captures, validates, and returns a token without exposing it in the launch URL", async () => {
    const passport = "fixed-passport";
    let openedUrl = "";
    const driver: BrowserLoginDriver = {
      waitForTokenRedirect: vi.fn(async (url) => {
        openedUrl = url;
        return tokenRedirect("https://ava.univesp.br", passport, "captured-token", "forcedapp");
      }),
    };
    const validateToken = vi.fn(async () => ({ siteName: "AVA UNIVESP", userId: 42 }));

    const result = await authenticateViaBrowser("https://ava.univesp.br", {
      passport,
      driver,
      validateToken,
    });

    expect(openedUrl).not.toContain("captured-token");
    expect(validateToken).toHaveBeenCalledWith("https://ava.univesp.br", "captured-token");
    expect(result).toEqual({
      token: "captured-token",
      baseUrl: "https://ava.univesp.br",
      siteName: "AVA UNIVESP",
      userId: 42,
    });
  });

  it("does not accept a token that validation rejects", async () => {
    const passport = "fixed-passport";
    const driver: BrowserLoginDriver = {
      waitForTokenRedirect: async () => tokenRedirect("https://ava.univesp.br", passport),
    };
    await expect(authenticateViaBrowser("https://ava.univesp.br", {
      passport,
      driver,
      validateToken: async () => { throw new Error("permission denied"); },
    })).rejects.toThrow("permission denied");
  });

  it("propagates browser cancellation and timeout failures", async () => {
    const driver: BrowserLoginDriver = {
      waitForTokenRedirect: async () => { throw new Error("browser closed"); },
    };
    await expect(authenticateViaBrowser("https://ava.univesp.br", { driver }))
      .rejects.toThrow("browser closed");
  });
});
