// OMA CRYSTAL Cloudflare Worker.
// Serves the built static site (assets binding), the public catalog API
// backed by D1, images from R2 with a static-asset fallback, Google-login
// admin auth, and the admin management API.
import { handleAdmin } from "./admin";
import { handleAuth } from "./auth";
import { Env, json } from "./lib";
import { handleOrders } from "./orders";
import { handleAi } from "./ai";
import { handleQuizReading } from "./quiz-reading";

async function catalogPayload(env: Env) {
  const [stones, sizes, accessories, series, products, settings] = await Promise.all([
    env.DB.prepare("SELECT * FROM stones WHERE active=1 ORDER BY sort").all(),
    env.DB.prepare("SELECT * FROM stone_sizes WHERE active=1 ORDER BY stone_id, mm").all(),
    env.DB.prepare("SELECT * FROM accessories WHERE active=1 ORDER BY sort").all(),
    env.DB.prepare("SELECT * FROM series WHERE active=1 ORDER BY sort").all(),
    env.DB.prepare("SELECT * FROM products WHERE active=1 ORDER BY series_id, sort").all(),
    env.DB.prepare("SELECT * FROM settings WHERE key NOT LIKE 'session_%'").all(),
  ]);
  return {
    stones: stones.results,
    stoneSizes: sizes.results,
    accessories: accessories.results,
    series: series.results,
    products: products.results,
    settings: Object.fromEntries(settings.results.map((r) => [r.key as string, r.value as string])),
    generatedAt: new Date().toISOString(),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      try {
        const { results } = await env.DB.prepare("SELECT COUNT(*) AS n FROM stones").all<{ n: number }>();
        return json({ ok: true, stones: results[0]?.n ?? 0 });
      } catch (err) {
        return json({ ok: false, error: String(err) }, { headers: { "cache-control": "no-store" } });
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
      if (cache) await cache.put(cacheKey, res.clone());
      return res;
    }

    // 生日選石測驗 lead intake. Fire-and-forget from the quiz result page.
    if (url.pathname === "/api/quiz-lead" && request.method === "POST") {
      let b: Record<string, unknown> = {};
      try { b = (await request.json()) as Record<string, unknown>; } catch { /* validated below */ }
      const s = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v.trim() : null);
      const name = s(b.name, 100), birthday = s(b.birthday, 10), theme = s(b.theme, 20) ?? "", email = s(b.email, 200) ?? "", stones = s(b.stones, 500) ?? "";
      if (!name || !birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return json({ error: "invalid lead" }, { status: 400 });
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return json({ error: "invalid email" }, { status: 400 });
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

    const authRes = await handleAuth(request, env, url);
    if (authRes) return authRes;

    const adminRes = await handleAdmin(request, env, url);
    if (adminRes) return adminRes;

    // Images: R2 first (admin uploads land there), static assets as the
    // fallback for everything shipped in the repo today.
    if (url.pathname.startsWith("/img/")) {
      const key = decodeURIComponent(url.pathname.slice(5));
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

    return env.ASSETS.fetch(request);
  },
};
