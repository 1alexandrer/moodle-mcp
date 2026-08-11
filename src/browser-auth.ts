import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type BrowserContext } from "playwright-core";
import { DEFAULT_MAX_FILE_MB, normalizeUrl } from "./config.js";
import { MoodleClient } from "./moodle-client.js";

export const BROWSER_LOGIN_TIMEOUT_MS = 15 * 60 * 1000;
const CALLBACK_SCHEME = "moodlemcp";
const MOBILE_SERVICE = "moodle_mobile_app";

export interface BrowserLoginDriver {
  waitForTokenRedirect(loginUrl: string, timeoutMs: number): Promise<string>;
}

export interface BrowserLoginResult {
  token: string;
  baseUrl: string;
  siteName: string;
  userId: number;
}

export function buildBrowserLoginUrl(baseUrl: string, passport: string): string {
  const url = new URL(`${normalizeUrl(baseUrl)}/admin/tool/mobile/launch.php`);
  url.searchParams.set("service", MOBILE_SERVICE);
  url.searchParams.set("passport", passport);
  url.searchParams.set("urlscheme", CALLBACK_SCHEME);
  return url.toString();
}

export function extractTokenRedirect(candidate: string): string | null {
  const match = /^[a-z][a-z0-9+.-]*:\/\/token=(.+)$/i.exec(candidate.trim());
  return match?.[1] ?? null;
}

export function decodeMoodleAppToken(
  encodedPayload: string,
  baseUrl: string,
  passport: string,
): string {
  let decodedUrlValue: string;
  try {
    decodedUrlValue = decodeURIComponent(encodedPayload);
  } catch {
    throw new Error("Moodle returned a malformed browser-login payload.");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(decodedUrlValue)) {
    throw new Error("Moodle returned a malformed browser-login payload.");
  }

  let decoded: string;
  try {
    decoded = Buffer.from(decodedUrlValue, "base64").toString("utf8");
  } catch {
    throw new Error("Moodle returned a malformed browser-login payload.");
  }
  const [signature, token] = decoded.split(":::");
  if (!signature || !token || !/^[a-f0-9]{32}$/i.test(signature)) {
    throw new Error("Moodle returned an incomplete browser-login payload.");
  }

  const expected = createHash("md5")
    .update(`${normalizeUrl(baseUrl)}${passport}`)
    .digest();
  const actual = Buffer.from(signature, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Moodle browser-login signature did not match this login attempt.");
  }
  return token;
}

export async function authenticateViaBrowser(
  rawBaseUrl: string,
  options: {
    driver?: BrowserLoginDriver;
    timeoutMs?: number;
    passport?: string;
    validateToken?: (baseUrl: string, token: string) => Promise<{ siteName: string; userId: number }>;
  } = {},
): Promise<BrowserLoginResult> {
  const baseUrl = normalizeUrl(rawBaseUrl);
  const passport = options.passport ?? randomBytes(32).toString("hex");
  const driver = options.driver ?? new PlaywrightBrowserLoginDriver();
  const candidate = await driver.waitForTokenRedirect(
    buildBrowserLoginUrl(baseUrl, passport),
    options.timeoutMs ?? BROWSER_LOGIN_TIMEOUT_MS,
  );
  const encoded = extractTokenRedirect(candidate);
  if (!encoded) throw new Error("Browser login finished without a Moodle token redirect.");
  const token = decodeMoodleAppToken(encoded, baseUrl, passport);
  const validate = options.validateToken ?? validateMoodleToken;
  const info = await validate(baseUrl, token);
  return { token, baseUrl, ...info };
}

async function validateMoodleToken(
  baseUrl: string,
  token: string,
): Promise<{ siteName: string; userId: number }> {
  try {
    const client = await MoodleClient.create({
      baseUrl,
      token,
      maxFileBytes: DEFAULT_MAX_FILE_MB * 1024 * 1024,
    });
    return { siteName: client.siteName, userId: client.userId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Moodle issued a token, but it could not be validated: ${message}`);
  }
}

export class PlaywrightBrowserLoginDriver implements BrowserLoginDriver {
  async waitForTokenRedirect(loginUrl: string, timeoutMs: number): Promise<string> {
    const profileDir = await mkdtemp(join(tmpdir(), "moodle-mcp-browser-"));
    let context: BrowserContext | undefined;
    try {
      context = await launchInstalledBrowser(profileDir);
      return await captureTokenRedirect(context, loginUrl, timeoutMs);
    } finally {
      await context?.close().catch(() => undefined);
      rmSync(profileDir, { recursive: true, force: true });
    }
  }
}

async function captureTokenRedirect(
  context: BrowserContext,
  loginUrl: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let initialNavigationComplete = false;
    const finish = (candidate: string): void => {
      if (settled || !extractTokenRedirect(candidate)) return;
      settled = true;
      clearTimeout(timer);
      resolve(candidate);
    };
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const timer = setTimeout(() => {
      const minutes = Math.max(1, Math.round(timeoutMs / 60_000));
      fail(new Error(`Browser login timed out after ${minutes} minute${minutes === 1 ? "" : "s"}. Please run the login command again.`));
    }, timeoutMs);

    context.on("request", (request) => finish(request.url()));
    context.on("response", (response) => {
      void response.headerValue("location").then((location) => {
        if (location) finish(location);
      });
    });
    context.on("close", () => {
      if (!settled) fail(new Error("The browser was closed before Moodle login completed."));
    });

    const existingPage = context.pages()[0];
    void (existingPage ? Promise.resolve(existingPage) : context.newPage()).then(async (page) => {
      try {
        await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
        initialNavigationComplete = true;
      } catch (error) {
        if (!settled && !initialNavigationComplete) {
          fail(new Error(`Could not open the Moodle login page: ${errorMessage(error)}`));
        }
      }
    }).catch((error) => fail(new Error(`Could not create a browser page: ${errorMessage(error)}`)));
  });
}

async function launchInstalledBrowser(profileDir: string): Promise<BrowserContext> {
  const attempts: Array<{ label: string; channel?: string; executablePath?: string }> = [
    { label: "Google Chrome", channel: "chrome" },
    { label: "Microsoft Edge", channel: "msedge" },
    ...browserExecutableCandidates().map((executablePath) => ({
      label: executablePath,
      executablePath,
    })),
  ];
  const errors: string[] = [];
  for (const attempt of attempts) {
    if (attempt.executablePath && !existsSync(attempt.executablePath)) continue;
    try {
      return await chromium.launchPersistentContext(profileDir, {
        headless: false,
        channel: attempt.channel,
        executablePath: attempt.executablePath,
        viewport: null,
      });
    } catch (error) {
      errors.push(`${attempt.label}: ${errorMessage(error).split("\n")[0]}`);
    }
  }
  throw new Error(
    "No supported browser could be opened. Install Chrome, Edge, Chromium, or Brave and try again." +
      (errors.length ? ` Attempts: ${errors.join("; ")}` : ""),
  );
}

function browserExecutableCandidates(): string[] {
  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ];
  }
  if (process.platform === "win32") {
    const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
      .filter((value): value is string => Boolean(value));
    return roots.flatMap((root) => [
      join(root, "Google", "Chrome", "Application", "chrome.exe"),
      join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
      join(root, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
    ]);
  }
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/microsoft-edge",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/brave-browser",
  ];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
