// Admin API: everything behind the Google-session check. Writes are
// whole-row updates from the admin UI; stone size ladders are replaced as
// a set inside a batch so a half-applied edit can't exist.
import { Env, json, sessionEmail } from "./lib";

const bad = (msg: string, status = 400) => json({ error: msg }, { status });

export async function handleAdmin(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/admin/")) return null;
  if (url.pathname === "/api/admin/me") return null; // auth.ts owns it
  const email = await sessionEmail(env, request);
  if (!email) return json({ error: "unauthorized" }, { status: 401 });

  const seg = url.pathname.slice("/api/admin/".length).split("/").filter(Boolean);

  // Full catalog including inactive rows, for the management screens.
  if (request.method === "GET" && seg[0] === "catalog") {
    const [stones, sizes, accessories, series, products, settings] = await Promise.all([
      env.DB.prepare("SELECT * FROM stones ORDER BY sort").all(),
      env.DB.prepare("SELECT * FROM stone_sizes ORDER BY stone_id, mm").all(),
      env.DB.prepare("SELECT * FROM accessories ORDER BY sort").all(),
      env.DB.prepare("SELECT * FROM series ORDER BY sort").all(),
      env.DB.prepare("SELECT * FROM products ORDER BY series_id, sort").all(),
      env.DB.prepare("SELECT * FROM settings").all(),
    ]);
    return json({
      stones: stones.results, stoneSizes: sizes.results, accessories: accessories.results,
      series: series.results, products: products.results,
      settings: Object.fromEntries(settings.results.map((r) => [r.key as string, r.value as string])),
    });
  }

  if (seg[0] === "stones" && seg[1]) {
    const id = decodeURIComponent(seg[1]);
    if (request.method === "PUT" && seg[2] === "sizes") {
      const sizes = (await request.json()) as { mm: number; price_delta: number; stock: number; active?: number }[];
      if (!Array.isArray(sizes) || !sizes.length) return bad("sizes must be a non-empty array");
      for (const s of sizes) if (!(s.mm > 0) || s.price_delta < 0 || s.stock < 0) return bad("invalid size row");
      await env.DB.batch([
        env.DB.prepare("DELETE FROM stone_sizes WHERE stone_id=?").bind(id),
        ...sizes.map((s) => env.DB.prepare(
          "INSERT INTO stone_sizes (stone_id, mm, price_delta, stock, active) VALUES (?,?,?,?,?)"
        ).bind(id, s.mm, s.price_delta, s.stock, s.active ?? 1)),
      ]);
      return json({ ok: true });
    }
    if (request.method === "PUT") {
      const b = (await request.json()) as Record<string, unknown>;
      await env.DB.prepare(
        "UPDATE stones SET zh=?, en=?, energy_zh=?, price=?, note=?, energies=?, active=? WHERE id=?"
      ).bind(b.zh, b.en, b.energy_zh, b.price, b.note, JSON.stringify(b.energies ?? {}), b.active ?? 1, id).run();
      return json({ ok: true });
    }
  }

  if (seg[0] === "accessories" && seg[1] && request.method === "PUT") {
    const b = (await request.json()) as Record<string, unknown>;
    await env.DB.prepare(
      "UPDATE accessories SET zh=?, en=?, type=?, metal=?, price=?, note=?, stock=?, active=? WHERE id=?"
    ).bind(b.zh, b.en, b.type, b.metal, b.price, b.note, b.stock ?? 0, b.active ?? 1, decodeURIComponent(seg[1])).run();
    return json({ ok: true });
  }

  // Photo upload: raw image body → R2 → point the row's photo path at the
  // /img/ route. Versioned keys so CDN caches never serve a stale photo.
  if (seg[0] === "photo" && seg[1] && seg[2] && request.method === "POST") {
    if (!env.IMAGES) return bad("R2 not configured", 503);
    const kind = seg[1];
    if (kind !== "stone" && kind !== "accessory") return bad("kind must be stone|accessory");
    const id = decodeURIComponent(seg[2]);
    const contentType = request.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpeg|webp)$/.test(contentType)) return bad("content-type must be image/png|jpeg|webp");
    const body = await request.arrayBuffer();
    if (body.byteLength > 8 * 1024 * 1024) return bad("image too large (max 8MB)");
    const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
    const key = `uploads/${kind}/${id}-${Date.now()}.${ext}`;
    await env.IMAGES.put(key, body, { httpMetadata: { contentType } });
    const photoPath = `/img/${key}`;
    await env.DB.prepare(`UPDATE ${kind === "stone" ? "stones" : "accessories"} SET photo=? WHERE id=?`).bind(photoPath, id).run();
    return json({ ok: true, photo: photoPath });
  }

  // Products carry no price column: a product's price is derived from its
  // composition spec, exactly as the storefront computes it, so the two can
  // never drift.
  if (seg[0] === "products" && seg[1] && seg[2] && request.method === "PUT") {
    const b = (await request.json()) as Record<string, unknown>;
    await env.DB.prepare(
      "UPDATE products SET name=?, tagline=?, style=?, wrist=?, spec=?, active=? WHERE series_id=? AND id=?"
    ).bind(b.name, b.tagline, b.style, b.wrist, b.spec, b.active ?? 1, decodeURIComponent(seg[1]), decodeURIComponent(seg[2])).run();
    return json({ ok: true });
  }

  if (seg[0] === "series" && seg[1] && request.method === "PUT") {
    const b = (await request.json()) as { name?: string; en?: string; tone?: unknown; active?: number };
    await env.DB.prepare("UPDATE series SET name=?, en=?, tone=?, active=? WHERE id=?")
      .bind(b.name, b.en, JSON.stringify(b.tone ?? {}), b.active ?? 1, decodeURIComponent(seg[1])).run();
    return json({ ok: true });
  }

  if (seg[0] === "orders") {
    if (request.method === "GET" && !seg[1]) {
      const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200").all();
      return json({ orders: results });
    }
    if (request.method === "PUT" && seg[1] && seg[2] === "status") {
      const { status } = (await request.json()) as { status?: string };
      const allowed = ["pending", "paid", "making", "shipped", "done", "cancelled"];
      if (!status || !allowed.includes(status)) return bad("invalid status");
      await env.DB.prepare("UPDATE orders SET status=? WHERE id=?").bind(status, decodeURIComponent(seg[1])).run();
      return json({ ok: true });
    }
  }

  if (seg[0] === "settings" && request.method === "PUT") {
    const b = (await request.json()) as Record<string, string>;
    const editable = ["base_fee", "shipping_fee", "free_shipping_over"];
    const stmts = editable.filter((k) => k in b && /^\d+$/.test(String(b[k])))
      .map((k) => env.DB.prepare("UPDATE settings SET value=? WHERE key=?").bind(String(b[k]), k));
    if (!stmts.length) return bad("no valid settings");
    await env.DB.batch(stmts);
    return json({ ok: true });
  }

  return bad("not found", 404);
}
