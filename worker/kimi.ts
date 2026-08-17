// Shared Moonshot Kimi plumbing for every AI feature (生日解讀、許願選石、
// 合盤、手鍊命名). One place owns: the key check, the JSON-mode chat call
// with timeout, the D1 response cache, and the per-kind daily generation
// caps that protect the API budget. Handlers own only their prompt, their
// input validation and their output shape-check.
import { Env, json } from "./lib";

export const kimiConfigured = (env: Env) => !!env.KIMI_API_KEY;

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

// --- D1 cache + daily caps (table: ai_texts, migration 0008) -------------

export async function cacheGet(env: Env, kind: string, key: string): Promise<unknown | null> {
  const row = await env.DB.prepare("SELECT payload FROM ai_texts WHERE key=?").bind(`${kind}:${key}`).first<{ payload: string }>();
  return row ? (JSON.parse(row.payload) as unknown) : null;
}

export async function cachePut(env: Env, kind: string, key: string, payload: unknown): Promise<void> {
  await env.DB.prepare("INSERT OR IGNORE INTO ai_texts (key, kind, payload) VALUES (?,?,?)")
    .bind(`${kind}:${key}`, kind, JSON.stringify(payload)).run();
}

export async function overDailyCap(env: Env, kind: string, cap: number): Promise<boolean> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM ai_texts WHERE kind=? AND created_at > datetime('now','-1 day')")
    .bind(kind).first<{ n: number }>();
  return (row?.n ?? 0) >= cap;
}

// --- The chat call --------------------------------------------------------

// Moonshot serves two disjoint platforms with incompatible keys: the
// mainland platform (api.moonshot.cn) and the international one
// (api.moonshot.ai). A key from one gets 401 from the other, and there's
// no way to tell from the key which platform issued it — so unless the
// owner pinned KIMI_BASE_URL, try .cn first and fall through to .ai on a
// 401. The winning base is remembered for the isolate's lifetime.
let knownGoodBase: string | null = null;
const DEFAULT_BASES = ["https://api.moonshot.cn/v1", "https://api.moonshot.ai/v1"];

// JSON-mode chat completion. Returns the parsed object, or a Response the
// handler should pass straight through (503/502/504 — never a fake result).
export async function kimiJson(env: Env, system: string, user: string, maxTokens = 1000): Promise<{ ok: true; data: unknown } | { ok: false; res: Response }> {
  if (!env.KIMI_API_KEY) return { ok: false, res: json({ error: "not configured" }, { status: 503 }) };
  const bases = env.KIMI_BASE_URL
    ? [env.KIMI_BASE_URL.replace(/\/$/, "")]
    : knownGoodBase ? [knownGoodBase, ...DEFAULT_BASES.filter((b) => b !== knownGoodBase)] : DEFAULT_BASES;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    let lastStatus = 0;
    for (const base of bases) {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${env.KIMI_API_KEY}` },
        body: JSON.stringify({
          model: env.KIMI_MODEL ?? "moonshot-v1-8k",
          temperature: 0.7,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      lastStatus = res.status;
      if (res.status === 401 && base !== bases[bases.length - 1]) continue; // wrong platform — try the next one
      if (!res.ok) return { ok: false, res: json({ error: `upstream ${res.status}` }, { status: 502 }) };
      knownGoodBase = base;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      try {
        return { ok: true, data: JSON.parse(data.choices?.[0]?.message?.content ?? "") as unknown };
      } catch {
        return { ok: false, res: json({ error: "unparseable reading" }, { status: 502 }) };
      }
    }
    return { ok: false, res: json({ error: `upstream ${lastStatus}` }, { status: 502 }) };
  } catch {
    return { ok: false, res: json({ error: "upstream timeout" }, { status: 504 }) };
  } finally {
    clearTimeout(timer);
  }
}
