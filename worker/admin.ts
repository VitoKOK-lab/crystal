// Admin API: everything behind the Google-session check. Writes are
// whole-row updates from the admin UI; stone size ladders are replaced as
// a set inside a batch so a half-applied edit can't exist.
import { Env, json, sessionEmail } from "./lib";

const bad = (msg: string, status = 400) => json({ error: msg }, { status });

// Body parsing that can't throw, and field validators that turn a missing or
// mistyped value into a 400 instead of letting a whole-row UPDATE overwrite
// good columns with NULLs. `undefined` from a validator means "reject".
const readJson = async (request: Request): Promise<Record<string, unknown> | null> => {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};
const str = (v: unknown, { max = 500, min = 0 } = {}): string | undefined =>
  typeof v === "string" && v.length >= min && v.length <= max ? v : undefined;
const num = (v: unknown, { min = 0, max = 1_000_000 } = {}): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
const flag = (v: unknown): number => (v === 0 || v === false ? 0 : 1);

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

  // Create a new stone. Photo starts empty — the row stays hidden from the
  // storefront (hydration drops photo-less rows) until a photo is uploaded,
  // so a half-entered material can never render as a blank card.
  if (seg[0] === "stones" && !seg[1] && request.method === "POST") {
    const b = await readJson(request);
    if (!b) return bad("invalid JSON body");
    const id = str(b.id, { min: 2, max: 40 });
    const zh = str(b.zh, { min: 1, max: 100 });
    const en = str(b.en, { min: 1, max: 100 });
    const energyZh = str(b.energy_zh, { max: 50 }) ?? "";
    const price = num(b.price);
    if (!id || !/^[a-z0-9-]+$/.test(id)) return bad("id must be lowercase letters, digits, hyphens");
    if (!zh || !en || price === undefined) return bad("missing or invalid stone fields");
    const energies = b.energies && typeof b.energies === "object" ? b.energies : { wealth: 5, love: 5, healing: 5, protection: 5, focus: 5, power: 5 };
    const exists = await env.DB.prepare("SELECT id FROM stones WHERE id=?").bind(id).first();
    if (exists) return bad("id already exists", 409);
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO stones (id, zh, en, energy_zh, price, note, energies, photo, sort, active) VALUES (?,?,?,?,?,?,?,'', (SELECT COALESCE(MAX(sort),0)+1 FROM stones), 1)"
      ).bind(id, zh, en, energyZh, price, str(b.note) ?? "", JSON.stringify(energies)),
      ...[8, 10, 12].map((mm, i) => env.DB.prepare(
        "INSERT INTO stone_sizes (stone_id, mm, price_delta, stock, active) VALUES (?,?,?,0,1)"
      ).bind(id, mm, i * 80)),
    ]);
    return json({ ok: true, id }, { status: 201 });
  }

  if (seg[0] === "accessories" && !seg[1] && request.method === "POST") {
    const b = await readJson(request);
    if (!b) return bad("invalid JSON body");
    const id = str(b.id, { min: 2, max: 40 });
    const zh = str(b.zh, { min: 1, max: 100 });
    const en = str(b.en, { min: 1, max: 100 });
    const price = num(b.price);
    if (!id || !/^[a-z0-9-]+$/.test(id)) return bad("id must be lowercase letters, digits, hyphens");
    if (!zh || !en || price === undefined) return bad("missing or invalid accessory fields");
    if (b.type !== "spacer" && b.type !== "charm") return bad("type must be spacer|charm");
    if (b.metal !== "gold" && b.metal !== "silver") return bad("metal must be gold|silver");
    const exists = await env.DB.prepare("SELECT id FROM accessories WHERE id=?").bind(id).first();
    if (exists) return bad("id already exists", 409);
    await env.DB.prepare(
      "INSERT INTO accessories (id, zh, en, type, metal, price, note, photo, stock, sort, active) VALUES (?,?,?,?,?,?,?,'', ?, (SELECT COALESCE(MAX(sort),0)+1 FROM accessories), 1)"
    ).bind(id, zh, en, b.type, b.metal, price, str(b.note) ?? "", num(b.stock) ?? 0).run();
    return json({ ok: true, id }, { status: 201 });
  }

  if (seg[0] === "stones" && seg[1]) {
    const id = decodeURIComponent(seg[1]);
    if (request.method === "PUT" && seg[2] === "sizes") {
      let sizes: unknown;
      try { sizes = await request.json(); } catch { return bad("invalid JSON body"); }
      if (!Array.isArray(sizes) || !sizes.length || sizes.length > 30) return bad("sizes must be a non-empty array");
      const rows: { mm: number; price_delta: number; stock: number; active: number }[] = [];
      for (const s of sizes as Record<string, unknown>[]) {
        const mm = num(s.mm, { min: 0.1, max: 40 });
        const delta = num(s.price_delta);
        const stock = num(s.stock);
        if (mm === undefined || delta === undefined || stock === undefined) return bad("invalid size row");
        rows.push({ mm, price_delta: delta, stock, active: flag(s.active) });
      }
      await env.DB.batch([
        env.DB.prepare("DELETE FROM stone_sizes WHERE stone_id=?").bind(id),
        ...rows.map((s) => env.DB.prepare(
          "INSERT INTO stone_sizes (stone_id, mm, price_delta, stock, active) VALUES (?,?,?,?,?)"
        ).bind(id, s.mm, s.price_delta, s.stock, s.active)),
      ]);
      return json({ ok: true });
    }
    if (request.method === "PUT") {
      const b = await readJson(request);
      if (!b) return bad("invalid JSON body");
      const zh = str(b.zh, { min: 1, max: 100 });
      const en = str(b.en, { min: 1, max: 100 });
      const energyZh = str(b.energy_zh, { max: 50 });
      const price = num(b.price);
      const note = str(b.note);
      if (!zh || !en || energyZh === undefined || price === undefined || note === undefined) return bad("missing or invalid stone fields");
      if (!b.energies || typeof b.energies !== "object") return bad("invalid energies");
      await env.DB.prepare(
        "UPDATE stones SET zh=?, en=?, energy_zh=?, price=?, note=?, energies=?, active=? WHERE id=?"
      ).bind(zh, en, energyZh, price, note, JSON.stringify(b.energies), flag(b.active), id).run();
      return json({ ok: true });
    }
  }

  if (seg[0] === "accessories" && seg[1] && request.method === "PUT") {
    const b = await readJson(request);
    if (!b) return bad("invalid JSON body");
    const zh = str(b.zh, { min: 1, max: 100 });
    const en = str(b.en, { min: 1, max: 100 });
    const price = num(b.price);
    const stock = num(b.stock);
    const note = str(b.note);
    if (!zh || !en || price === undefined || stock === undefined || note === undefined) return bad("missing or invalid accessory fields");
    if (b.type !== "spacer" && b.type !== "charm") return bad("type must be spacer|charm");
    if (b.metal !== "gold" && b.metal !== "silver") return bad("metal must be gold|silver");
    await env.DB.prepare(
      "UPDATE accessories SET zh=?, en=?, type=?, metal=?, price=?, note=?, stock=?, active=? WHERE id=?"
    ).bind(zh, en, b.type, b.metal, price, note, stock, flag(b.active), decodeURIComponent(seg[1])).run();
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
    const b = await readJson(request);
    if (!b) return bad("invalid JSON body");
    const name = str(b.name, { min: 1, max: 100 });
    const tagline = str(b.tagline, { max: 200 });
    const style = str(b.style, { min: 1, max: 40 });
    const wrist = num(b.wrist, { min: 10, max: 30 });
    const spec = str(b.spec, { min: 1, max: 2000 });
    if (!name || tagline === undefined || !style || wrist === undefined || !spec) return bad("missing or invalid product fields");
    await env.DB.prepare(
      "UPDATE products SET name=?, tagline=?, style=?, wrist=?, spec=?, active=? WHERE series_id=? AND id=?"
    ).bind(name, tagline, style, wrist, spec, flag(b.active), decodeURIComponent(seg[1]), decodeURIComponent(seg[2])).run();
    return json({ ok: true });
  }

  if (seg[0] === "series" && seg[1] && request.method === "PUT") {
    const b = await readJson(request);
    if (!b) return bad("invalid JSON body");
    const name = str(b.name, { min: 1, max: 100 });
    const en = str(b.en, { min: 1, max: 100 });
    if (!name || !en) return bad("missing or invalid series fields");
    if (!b.tone || typeof b.tone !== "object") return bad("invalid tone");
    await env.DB.prepare("UPDATE series SET name=?, en=?, tone=?, active=? WHERE id=?")
      .bind(name, en, JSON.stringify(b.tone), flag(b.active), decodeURIComponent(seg[1])).run();
    return json({ ok: true });
  }

  if (seg[0] === "orders") {
    if (request.method === "GET" && !seg[1]) {
      const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200").all();
      return json({ orders: results });
    }
    if (request.method === "PUT" && seg[1] && seg[2] === "status") {
      const b = await readJson(request);
      if (!b) return bad("invalid JSON body");
      const status = str(b.status, { min: 1, max: 20 });
      const allowed = ["pending", "paid", "making", "shipped", "done", "cancelled"];
      if (!status || !allowed.includes(status)) return bad("invalid status");
      await env.DB.prepare("UPDATE orders SET status=? WHERE id=?").bind(status, decodeURIComponent(seg[1])).run();
      return json({ ok: true });
    }
  }

  if (seg[0] === "settings" && request.method === "PUT") {
    const b = await readJson(request);
    if (!b) return bad("invalid JSON body");
    const editable = ["base_fee", "shipping_fee", "free_shipping_over"];
    const stmts = editable.filter((k) => k in b && /^\d+$/.test(String(b[k])))
      .map((k) => env.DB.prepare("UPDATE settings SET value=? WHERE key=?").bind(String(b[k]), k));
    if (!stmts.length) return bad("no valid settings");
    await env.DB.batch(stmts);
    return json({ ok: true });
  }

  return bad("not found", 404);
}
