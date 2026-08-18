// OMA CRYSTAL Cloudflare Worker.
// Serves the built static site (assets binding), the public catalog API
// backed by D1, images from R2 with a static-asset fallback, Google-login
// admin auth, and the admin management API.
import { handleAdmin } from "./admin";
import { handleAuth } from "./auth";
import { catalogTables } from "./catalog-data";
import { handleEcpay } from "./ecpay";
import { handleLinepay } from "./linepay";
import { BIRTHDAY_RE, EMAIL_RE, Env, json, rateLimited } from "./lib";
import { handleOrders } from "./orders";
import { handleAi } from "./ai";
import { handleQuizReading } from "./quiz-reading";

async function catalogPayload(env: Env) {
  return { ...(await catalogTables(env)), generatedAt: new Date().toISOString() };
}

// The structural slice of ExecutionContext we use (workers-types is
// deliberately not a dependency; see lib.ts).
type Ctx = { waitUntil: (p: Promise<unknown>) => void };

export default {
  async fetch(request: Request, env: Env, ctx?: Ctx): Promise<Response> {
    try {
      return await route(request, env, ctx);
    } catch (err) {
      // 任何漏接的 D1/R2/程式錯誤：記進伺服器日誌，回乾淨的 JSON 500 —
      // 不能讓內部錯誤全文（或 1101 神祕頁）流到客人面前。
      console.error("unhandled worker error", request.method, new URL(request.url).pathname, err);
      return json({ error: "internal error" }, { status: 500 });
    }
  },
};

async function route(request: Request, env: Env, ctx?: Ctx): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/health") {
    try {
      const { results } = await env.DB.prepare("SELECT COUNT(*) AS n FROM stones").all<{ n: number }>();
      return json({ ok: true, stones: results[0]?.n ?? 0 });
    } catch (err) {
      // 503（不是 200）讓監控看得見；錯誤細節進日誌、不進公網。
      console.error("health check failed", err);
      return json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
    }
  }

  if (url.pathname === "/api/catalog") {
    // Edge-cached for a minute: admin edits propagate fast while every
    // studio pageview stays a cache hit.
    // Workers expose caches.default, which the DOM CacheStorage type
    // doesn't declare — hence the widening cast.
    const cache = (globalThis as unknown as { caches?: { default: { match: (r: Request) => Promise<Response | undefined>; put: (r: Request, res: Response) => Promise<void> } } }).caches?.default;
    const cacheKey = new Request(url.origin + "/api/catalog");
    const hit = cache && (await cache.match(cacheKey));
    if (hit) return hit;
    const res = json(await catalogPayload(env), { headers: { "cache-control": "public, s-maxage=60, max-age=15" } });
    if (cache) {
      // 快取寫入不該擋住回應：有 ctx 就交給 waitUntil，回應先出門。
      const put = cache.put(cacheKey, res.clone());
      if (ctx) ctx.waitUntil(put); else await put;
    }
    return res;
  }

  // 生日選石測驗 lead intake. Fire-and-forget from the quiz result page.
  if (url.pathname === "/api/quiz-lead" && request.method === "POST") {
    if (rateLimited(request, "quiz-lead", 5)) return json({ error: "too many requests" }, { status: 429 });
    let b: Record<string, unknown> = {};
    try { b = (await request.json()) as Record<string, unknown>; } catch { /* validated below */ }
    const s = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v.trim() : null);
    const name = s(b.name, 100), birthday = s(b.birthday, 10), theme = s(b.theme, 20) ?? "", email = s(b.email, 200) ?? "", stones = s(b.stones, 500) ?? "";
    if (!name || !birthday || !BIRTHDAY_RE.test(birthday)) return json({ error: "invalid lead" }, { status: 400 });
    if (email && !EMAIL_RE.test(email)) return json({ error: "invalid email" }, { status: 400 });
    await env.DB.prepare("INSERT INTO quiz_leads (name, birthday, theme, email, stones) VALUES (?,?,?,?,?)")
      .bind(name, birthday, theme, email, stones).run();
    return json({ ok: true }, { status: 201 });
  }

  const readingRes = await handleQuizReading(request, env, url);
  if (readingRes) return readingRes;

  const aiRes = await handleAi(request, env, url);
  if (aiRes) return aiRes;

  const orderRes = await handleOrders(request, env, url);
  if (orderRes) return orderRes;

  const ecpayRes = await handleEcpay(request, env, url);
  if (ecpayRes) return ecpayRes;

  const linepayRes = await handleLinepay(request, env, url);
  if (linepayRes) return linepayRes;

  const authRes = await handleAuth(request, env, url);
  if (authRes) return authRes;

  const adminRes = await handleAdmin(request, env, url);
  if (adminRes) return adminRes;

  // Images: R2 first (admin uploads land there), static assets as the
  // fallback for everything shipped in the repo today.
  if (url.pathname.startsWith("/img/")) {
    const key = decodeURIComponent(url.pathname.slice(5));
    // R2 keys是扁平命名空間，但 fallback 會把 key 拼回資產路徑——
    // 不讓 ".." 有任何解釋空間。
    if (key.includes("..")) return json({ error: "not found" }, { status: 404 });
    const obj = env.IMAGES ? await env.IMAGES.get(key) : null;
    if (obj) {
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      headers.set("cache-control", "public, max-age=86400, s-maxage=604800");
      return new Response(obj.body, { headers });
    }
    const fallback = new URL(url);
    fallback.pathname = "/" + key;
    return env.ASSETS.fetch(new Request(fallback.toString(), request));
  }

  // 打錯或不存在的 API 路徑回 JSON 404——絕不把 SPA 的 HTML 當 200
  // 塞給一個在等 JSON 的客戶端。
  if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, { status: 404 });

  return env.ASSETS.fetch(request);
}
