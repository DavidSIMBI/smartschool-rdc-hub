// Server-only: short-lived HMAC tokens granting access to one private storage object.
const encoder = new TextEncoder();

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string) {
  const pad = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function key() {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Missing signing secret");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export type FilePayload = {
  /** storage bucket */
  b: string;
  /** storage path */
  p: string;
  /** file name shown to the user */
  n: string;
  /** mime type */
  t?: string | null;
  /** expiry (epoch seconds) */
  exp: number;
};

export async function signFileToken(payload: Omit<FilePayload, "exp">, ttlSeconds = 300) {
  const body: FilePayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = b64url(encoder.encode(JSON.stringify(body)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), encoder.encode(data)));
  return `${data}.${b64url(sig)}`;
}

export async function verifyFileToken(token: string): Promise<FilePayload | null> {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), encoder.encode(data));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(data))) as FilePayload;
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
