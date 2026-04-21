// Sealed opaque file IDs.
//
// Every fileId emitted by MCP tools is an AES-GCM envelope over the tuple
// {userId, courseId, fileurl, mime, filename, filesize, exp}. The encryption
// key is HKDF-derived from the Moodle access token, so:
//   - IDs are unforgeable without the token.
//   - IDs carry no reversible data (no hex-encoded URL).
//   - IDs bound to a specific user — another user's token can't decrypt them.
//   - Token rotation invalidates old IDs, which is what we want.
//
// Identical implementation runs in Node (stdio) and the Cloudflare Worker;
// Web Crypto is available globally in both.

export interface FileRef {
  userId: number;
  courseId: number;
  fileurl: string;
  mime: string;
  filename: string;
  filesize: number;
}

interface SealedPayload extends FileRef {
  exp: number;
}

const KEY_INFO = "moodle-mcp:file-id:v1";
const TTL_MS = 24 * 60 * 60 * 1000;
const ID_PREFIX = "f_";
const IV_BYTES = 12;

function b64u(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64u(s: string): Uint8Array | null {
  try {
    const pad = "=".repeat((4 - (s.length % 4)) % 4);
    const std = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(std);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export class FileIdStore {
  private keyPromise: Promise<CryptoKey>;
  private readonly ttlMs: number;

  constructor(secret: string, ttlMs: number = TTL_MS) {
    this.ttlMs = ttlMs;
    this.keyPromise = this.deriveKey(secret);
  }

  private async deriveKey(secret: string): Promise<CryptoKey> {
    const master = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      "HKDF",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array(),
        info: new TextEncoder().encode(KEY_INFO),
      },
      master,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  async seal(ref: FileRef): Promise<string> {
    const key = await this.keyPromise;
    const payload: SealedPayload = { ...ref, exp: Date.now() + this.ttlMs };
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
    );
    const blob = new Uint8Array(iv.length + ct.length);
    blob.set(iv, 0);
    blob.set(ct, iv.length);
    return ID_PREFIX + b64u(blob);
  }

  async open(id: string, expectedUserId: number): Promise<FileRef | null> {
    if (!id.startsWith(ID_PREFIX)) return null;
    const blob = unb64u(id.slice(ID_PREFIX.length));
    if (!blob || blob.length < IV_BYTES + 16) return null;
    const iv = blob.slice(0, IV_BYTES);
    const ct = blob.slice(IV_BYTES);
    try {
      const key = await this.keyPromise;
      const plaintext = new Uint8Array(
        await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct),
      );
      const payload = JSON.parse(new TextDecoder().decode(plaintext)) as SealedPayload;
      if (payload.exp < Date.now()) return null;
      if (payload.userId !== expectedUserId) return null;
      const { exp: _exp, ...ref } = payload;
      return ref;
    } catch {
      return null;
    }
  }
}
