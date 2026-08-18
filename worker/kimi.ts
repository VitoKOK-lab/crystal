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

// 每個 AI 端點共用的家規——單一出處，改一次全端點生效。各端點在這
// 之上加自己的任務指示與輸出格式。
export const GUARDRAILS = `你是 OMA CRYSTAL 水晶工作室的資深顧問，說話溫暖、具體、有畫面感，絕不浮誇或裝神弄鬼。
規則：
- 一律使用繁體中文（台灣用語）。
- 內容屬趣味與陪伴性質：不得做任何醫療、財務、感情結果的保證或斷言，不使用「一定」「保證」等字眼。
- 不提及你是 AI 或任何模型名稱。
- 只回傳 JSON。`;

// --- D1 cache + daily caps (table: ai_texts, migration 0008) -------------

export async function cacheGet(env: Env, kind: string, key: string): Promise<unknown | null> {
  const row = await env.DB.prepare("SELECT payload FROM ai_texts WHERE key=?").bind(`${kind}:${key}`).first<{ payload: string }>();
  if (!row) return null;
  // 一列壞資料只該是一次 cache miss，不是整個端點 500。
  try { return JSON.parse(row.payload) as unknown; } catch { return null; }
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

// 五個 AI 端點共用的整條管線：快取查詢 → 每日上限 → 模型呼叫 → 驗形
// →（可選）加工 → 寫快取 → 回應。各 handler 只剩輸入驗證、提示詞與
// 輸出形狀——這條管線曾在 ai.ts 與 quiz-reading.ts 各抄一份，規則改
// 一邊漏一邊。
export async function aiPipeline(env: Env, opts: {
  kind: string;          // 快取分類＋每日上限的計數單位
  cacheKey: string;      // sha256 過的請求識別
  cap: number;           // 每日全站生成上限
  system: string;
  user: string;
  maxTokens?: number;
  validate: (r: unknown) => boolean;
  // 把驗過形的模型輸出轉成要快取／回傳的 payload；回 null 表示內容
  // 不合格（例如許願選石點了菜單外的石頭）→ 502。
  finalize?: (data: unknown) => unknown | null;
  field?: string;        // 回應信封的欄位名，預設 "reading"
}): Promise<Response> {
  const field = opts.field ?? "reading";
  const cached = await cacheGet(env, opts.kind, opts.cacheKey);
  if (cached) return json({ [field]: cached, cached: true });
  if (await overDailyCap(env, opts.kind, opts.cap)) return json({ error: "daily cap reached" }, { status: 429 });
  const result = await kimiJson(env, opts.system, opts.user, opts.maxTokens ?? 1000);
  if (!result.ok) return result.res;
  if (!opts.validate(result.data)) return json({ error: "malformed reading" }, { status: 502 });
  const payload = opts.finalize ? opts.finalize(result.data) : result.data;
  if (payload === null) return json({ error: "reading picked unknown stones" }, { status: 502 });
  await cachePut(env, opts.kind, opts.cacheKey, payload);
  return json({ [field]: payload });
}

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
