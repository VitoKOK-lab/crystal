// OMA CRYSTAL Cloudflare Worker (Phase 1).
// Serves the built static site (assets binding), the read-only catalog API
// backed by D1, and images from R2 with a static-asset fallback so the
// photo migration can happen gradually.
//
// Minimal structural types — the full workers-types package is deliberately
// not a dependency; wrangler bundles this file itself.
type D1Database = {
  prepare: (sql: string) => {
    all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
    bind: (...args: unknown[]) => { all: <T = Record<string, unknown>>() => Promise<{ results: T[] }> };
  };
};
type R2Bucket = { get: (key: string) => Promise<{ body: ReadableStream; httpEtag: string; writeHttpMetadata: (h: Headers) => void } | null> };
type Fetcher = { fetch: (req: Request) => Promise<Response> };

export interface Env {
  DB: D1Database;
  // Optional until Phase 2: R2 must be enabled once in the dashboard
  // before the binding can exist (Cloudflare error 10042).
  IMAGES?: R2Bucket;
  ASSETS: Fetcher;
}

const json = (data: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });

async function catalogPayload(env: Env) {
  const [stones, sizes, accessories, series, products, settings] = await Promise.all([
    env.DB.prepare("SELECT * FROM stones WHERE active=1 ORDER BY sort").all(),
    env.DB.prepare("SELECT * FROM stone_sizes WHERE active=1 ORDER BY stone_id, mm").all(),
    env.DB.prepare("SELECT * FROM accessories WHERE active=1 ORDER BY sort").all(),
    env.DB.prepare("SELECT * FROM series WHERE active=1 ORDER BY sort").all(),
    env.DB.prepare("SELECT * FROM products WHERE active=1 ORDER BY series_id, sort").all(),
    env.DB.prepare("SELECT * FROM settings").all(),
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
        return json({ ok: false, error: String(err) }, { "cache-control": "no-store" });
      }
    }

    if (url.pathname === "/api/catalog") {
      // Edge-cached for a minute: product edits in the admin propagate fast
      // while every studio pageview stays a cache hit.
      const cache = (globalThis as { caches?: { default: { match: (r: Request) => Promise<Response | undefined>; put: (r: Request, res: Response) => Promise<void> } } }).caches?.default;
      const cacheKey = new Request(url.origin + "/api/catalog");
      const hit = cache && (await cache.match(cacheKey));
      if (hit) return hit;
      const res = json(await catalogPayload(env), { "cache-control": "public, s-maxage=60, max-age=15" });
      if (cache) await cache.put(cacheKey, res.clone());
      return res;
    }

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
