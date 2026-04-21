import type { Config } from "./config.js";
import { FileIdStore } from "./file-id-store.js";

export interface SiteInfo {
  userid: number;
  username: string;
  sitename: string;
  fullname: string;
  release: string;
  functions?: { name: string; version: string }[];
}

type MoodleErrorResponse = {
  exception: string;
  errorcode?: string;
  message?: string;
};

export interface DownloadedFile {
  mime: string;
  bytes: Uint8Array;
}

export class MoodleClient {
  userId: number = 0;
  siteName: string = "";
  release: string = "";
  supportedFunctions: Set<string> = new Set();
  readonly fileIdStore: FileIdStore;

  private readonly baseHost: string;
  readonly maxFileBytes: number;

  private constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    maxFileBytes: number,
  ) {
    this.baseHost = new URL(baseUrl).host;
    this.fileIdStore = new FileIdStore(token);
    this.maxFileBytes = maxFileBytes;
  }

  /** Returns true if the WS function is available on this Moodle server. */
  supports(wsfunction: string): boolean {
    if (this.supportedFunctions.size === 0) return true;
    return this.supportedFunctions.has(wsfunction);
  }

  static async create(config: Config): Promise<MoodleClient> {
    const token =
      config.token ??
      (await MoodleClient.login(config.baseUrl, config.username!, config.password!));
    const client = new MoodleClient(config.baseUrl, token, config.maxFileBytes);
    const info = await client.call<SiteInfo>("core_webservice_get_site_info");
    client.userId = info.userid;
    client.siteName = info.sitename;
    client.release = info.release ?? "";
    client.supportedFunctions = new Set(info.functions?.map((f) => f.name) ?? []);
    return client;
  }

  private static async login(baseUrl: string, username: string, password: string): Promise<string> {
    const url = `${baseUrl}/login/token.php`;
    const body = new URLSearchParams({ username, password, service: "moodle_mobile_app" });
    const res = await fetch(url, { method: "POST", body });
    const text = await res.text();
    let data: { token?: string; error?: string };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "Moodle login returned an unexpected response — your school likely uses SSO (Microsoft/Google/CAS). " +
        "Use a token instead: log in via browser, then visit " +
        `${baseUrl}/login/token.php?service=moodle_mobile_app and set MOODLE_TOKEN.`
      );
    }
    if (data.error) {
      throw new Error(
        `Moodle login failed: ${data.error}. Check your username, password, and Moodle URL.`
      );
    }
    if (!data.token) {
      throw new Error(
        "Moodle login failed: no token returned. Ensure the Moodle Mobile app service is enabled."
      );
    }
    return data.token;
  }

  async call<T>(wsfunction: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
    const url = `${this.baseUrl}/webservice/rest/server.php`;
    const body = new URLSearchParams({
      wstoken: this.token,
      wsfunction,
      moodlewsrestformat: "json",
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });
    const res = await fetch(url, { method: "POST", body });
    if (!res.ok) throw new Error(`HTTP ${res.status} from Moodle API`);
    const data = (await res.json()) as T & Partial<MoodleErrorResponse>;
    if (data.exception) {
      if (data.errorcode === "webservicesnotenabled") {
        throw new Error(
          "Web services are not enabled on this Moodle server. Contact your IT department to enable them."
        );
      }
      if (data.errorcode === "invalidtoken") {
        throw new Error("Invalid Moodle token. Check your MOODLE_TOKEN value.");
      }
      throw new Error(`Moodle API error (${data.errorcode ?? "unknown"}): ${data.message ?? "No message"}`);
    }
    return data;
  }

  /**
   * Fetch a Moodle-managed file through the server. Only accepts pluginfile.php
   * URLs on this Moodle host — external `url` module targets are refused so we
   * don't become an SSRF relay. Caps the response at MAX_DOWNLOAD_BYTES.
   *
   * The Moodle WS token is attached to the outbound request only; it never
   * reappears in anything returned to the MCP client.
   */
  async downloadFile(fileurl: string): Promise<DownloadedFile> {
    let parsed: URL;
    try {
      parsed = new URL(fileurl);
    } catch {
      throw new Error("Invalid file URL");
    }
    if (parsed.host !== this.baseHost) {
      throw new Error("Refused: file URL is not on this Moodle host");
    }
    if (
      !parsed.pathname.includes("/pluginfile.php") &&
      !parsed.pathname.includes("/webservice/pluginfile.php")
    ) {
      throw new Error("Refused: only Moodle-managed pluginfile.php URLs can be fetched");
    }
    parsed.searchParams.set("token", this.token);

    const res = await fetch(parsed.toString());
    if (!res.ok) throw new Error(`Failed to fetch file: HTTP ${res.status}`);

    const maxMb = Math.round(this.maxFileBytes / 1024 / 1024);
    const lengthHeader = res.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > this.maxFileBytes) {
      throw new Error(
        `File too large (${Math.round(Number(lengthHeader) / 1024 / 1024)} MB); max is ${maxMb} MB. Admins can raise the cap with MOODLE_MCP_MAX_FILE_MB.`,
      );
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > this.maxFileBytes) {
      throw new Error(
        `File too large (${Math.round(buf.byteLength / 1024 / 1024)} MB); max is ${maxMb} MB. Admins can raise the cap with MOODLE_MCP_MAX_FILE_MB.`,
      );
    }

    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
    return { mime, bytes: new Uint8Array(buf) };
  }
}
