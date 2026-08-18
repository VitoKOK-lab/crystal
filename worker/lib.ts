// Shared worker plumbing: loose structural types (the full workers-types
// package is deliberately not a dependency; wrangler bundles this itself),
// JSON helpers, and the session-cookie crypto.

export type D1Result<T = Record<string, unknown>> = { results: T[] };
export type D1Statement = {
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<unknown>;
  bind: (...args: unknown[]) => D1Statement;
};
export type D1Database = {
  prepare: (sql: string) => D1Statement;
  batch: (stmts: D1Statement[]) => Promise<unknown>;
};
export type R2Bucket = {
  get: (key: string) => Promise<{ body: ReadableStream; httpEtag: string; writeHttpMetadata: (h: Headers) => void } | null>;
  put: (key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
};
export type Fetcher = { fetch: (req: Request) => Promise<Response> };

export interface Env {
  DB: D1Database;
  IMAGES?: R2Bucket;
  ASSETS: Fetcher;
  // Google OAuth for /admin. CLIENT_ID is a plain var; the secret arrives
  // via `wrangler secret put` in CI. ADMIN_EMAILS is a comma-separated
  // whitelist — only these Google accounts may enter the admin.
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ADMIN_EMAILS?: string;
  // Moonshot Kimi API for the personalised birthday reading. The key is a
  // `wrangler secret`; without it /api/quiz-reading answers 503 and the quiz
  // silently keeps its built-in copy. Base URL/model are optional overrides
  // (.cn platform by default).
  KIMI_API_KEY?: string;
  KIMI_BASE_URL?: string;
  KIMI_MODEL?: string;
  // 綠界金流。不設定時用官方公開的測試商店（stage）；正式上線以
  // wrangler secret 覆蓋這四個值。
  ECPAY_MERCHANT_ID?: string;
  ECPAY_HASH_KEY?: string;
  ECPAY_HASH_IV?: string;
  ECPAY_BASE?: string;
  // LINE Pay v3。沒有公開共用測試憑證——Sandbox 商店的 Channel
  // ID/Secret 設成 secrets 後才啟用，未設定時 /api/pay/linepay 回 503。
  LINE_PAY_CHANNEL_ID?: string;
  LINE_PAY_CHANNEL_SECRET?: string;
  LINE_PAY_BASE?: string;
}

export const json = (data: unknown, init: ResponseInit & { headers?: Record<string, string> } = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers ?? {}) },
  });

// --- Shared error + validation vocabulary --------------------------------
// One place for the shapes every module repeats: the {error} envelope and
// the field regexes that must agree between intake points.
export const bad = (msg: string, status = 400) => json({ error: msg }, { status });
export const EMAIL_RE = /^\S+@\S+\.\S+$/;
export const BIRTHDAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const ORDER_ID_RE = /^OMA-[A-Z0-9]{4,20}$/;

// --- Per-IP rate limiting -------------------------------------------------
// Best-effort, in-memory per isolate: enough to stop one abuser from
// draining stock rows, PII inserts, or the shared AI daily caps, without a
// KV/DO dependency. A determined distributed attacker needs Cloudflare's
// own rate-limiting product; this guards the honest-mistake and single-IP
// case, which is the realistic threat at this shop's scale.
const rlHits = new Map<string, number[]>();

export function rateLimited(request: Request, bucket: string, limit: number, windowMs = 60_000): boolean {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const hits = (rlHits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) { rlHits.set(key, hits); return true; }
  hits.push(now);
  // Opportunistic sweep so the map can't grow without bound in a
  // long-lived isolate.
  if (rlHits.size > 5000) {
    for (const [k, v] of rlHits) if (v.every((t) => now - t >= windowMs)) rlHits.delete(k);
  }
  rlHits.set(key, hits);
  return false;
}

// Tests hammer one handler far past any human rate; they reset between cases.
export const __resetRateLimits = () => rlHits.clear();

// --- Session cookie: HMAC-SHA256(email|exp) with a signing key that
// self-bootstraps into the settings table on first use — no manual secret
// management for the owner.
let cachedKey: CryptoKey | null = null;

async function sessionKey(env: Env): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const { results } = await env.DB.prepare("SELECT value FROM settings WHERE key='session_signing_key'").all<{ value: string }>();
  const validKey = (v: string | undefined): v is string => !!v && /^[0-9a-f]{64}$/.test(v);
  let hex = results[0]?.value;
  if (!validKey(hex)) {
    // Missing or corrupted row: a bad key would otherwise crash every
    // admin request on the hex decode below, so self-heal by minting a
    // fresh one (existing sessions die, which is the safe direction).
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const fresh = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('session_signing_key', ?)").bind(fresh).run();
    // Another isolate may have won the race — read back the canonical key.
    const again = await env.DB.prepare("SELECT value FROM settings WHERE key='session_signing_key'").all<{ value: string }>();
    const readBack = again.results[0]?.value;
    hex = validKey(readBack) ? readBack : fresh;
  }
  const raw = new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16)));
  cachedKey = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return cachedKey;
}

const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

export async function makeSessionCookie(env: Env, email: string): Promise<string> {
  const exp = Date.now() + 7 * 24 * 3600 * 1000;
  const payload = `${email}|${exp}`;
  const sig = await crypto.subtle.sign("HMAC", await sessionKey(env), new TextEncoder().encode(payload));
  const value = `${btoa(payload)}.${b64url(sig)}`;
  return `oma_admin=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 3600}`;
}

export async function sessionEmail(env: Env, request: Request): Promise<string | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)oma_admin=([^;]+)/);
  if (!match) return null;
  const [payloadB64, sigB64] = match[1].split(".");
  if (!payloadB64 || !sigB64) return null;
  let payload: string;
  try { payload = atob(payloadB64); } catch { return null; }
  const sig = await crypto.subtle.sign("HMAC", await sessionKey(env), new TextEncoder().encode(payload));
  if (b64url(sig) !== sigB64) return null;
  const [email, expStr] = payload.split("|");
  if (!email || Number(expStr) < Date.now()) return null;
  const allowed = (env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase()) ? email : null;
}
