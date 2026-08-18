// Public order intake: the checkout form posts here. The server is the
// authority on everything money-shaped: unit prices (recomputed from the
// catalog tables), fees (read from settings), stock (checked and deducted
// here), and the order id. The client's numbers are only compared against
// ours — a mismatch means a stale page or a tampered request, and either
// way the order is refused rather than stored wrong. Payment hangs off
// this row via ecpay_trade_no / linepay_txn.
import { bad, EMAIL_RE, Env, json, rateLimited } from "./lib";

type OrderLine = { kind: "stone" | "accessory"; id: string; mm?: number; qty: number; unit: number; name: string; sub: string };
type OrderBody = {
  name?: string; phone?: string; email?: string; address?: string; note?: string;
  wrist?: string; payment?: string; spec?: string; lines?: OrderLine[]; ref?: string;
};

// Mirrors app/catalog.tsx itemPrice(): a size the ladder no longer lists
// (an old share link) still prices via the default 8/10/20 curve.
const fallbackDelta = (mm: number) => (mm === 8 ? 0 : mm === 10 ? 80 : mm === 20 ? 320 : Math.round((mm - 8) * 32));

export async function handleOrders(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname !== "/api/orders" || request.method !== "POST") return null;
  if (rateLimited(request, "orders", 10)) return json({ error: "too many requests" }, { status: 429 });

  let b: OrderBody;
  try {
    b = (await request.json()) as OrderBody;
  } catch {
    return bad("invalid JSON body");
  }

  const name = (b.name ?? "").trim();
  const phone = (b.phone ?? "").trim();
  const email = (b.email ?? "").trim();
  const address = (b.address ?? "").trim();
  if (!name || name.length > 100) return bad("name required");
  if (!/^09\d{8}$/.test(phone)) return bad("invalid phone");
  if (email && !EMAIL_RE.test(email)) return bad("invalid email");
  if (!address || address.length > 300) return bad("address required");
  if (!["card", "linepay", "cod"].includes(b.payment ?? "")) return bad("invalid payment method");
  const spec = (b.spec ?? "").trim();
  if (!spec || spec.length > 2000) return bad("spec required");
  const lines = b.lines;
  if (!Array.isArray(lines) || !lines.length || lines.length > 60) return bad("lines required");
  for (const l of lines) {
    if (l.kind !== "stone" && l.kind !== "accessory") return bad("invalid line kind");
    if (typeof l.id !== "string" || !l.id || l.id.length > 60) return bad("invalid line id");
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 60) return bad("invalid line qty");
    if (typeof l.unit !== "number" || l.unit < 0 || l.unit > 1_000_000) return bad("invalid line unit");
    if (typeof l.name !== "string" || l.name.length > 120) return bad("invalid line name");
    if (typeof l.sub !== "string" || l.sub.length > 160) return bad("invalid line sub");
    if (l.kind === "stone" && !(Number(l.mm) > 0)) return bad("stone line needs mm");
  }
  const wristCm = /^\d+(\.\d+)?$/.test(b.wrist ?? "") ? Number(b.wrist) : null;

  // Price + availability in one batched pass — the catalog rows are the
  // only price authority; the client's unit is compared, never believed.
  // A stone size the ladder no longer lists counts as untracked (old share
  // links): priced via the fallback curve, not treated as sold out.
  const stoneIds = [...new Set(lines.filter((l) => l.kind === "stone").map((l) => l.id))];
  const accIds = [...new Set(lines.filter((l) => l.kind === "accessory").map((l) => l.id))];
  const ph = (n: number) => Array(n).fill("?").join(",");
  const none = { results: [] as never[] };
  const [stoneRes, sizeRes, accRes] = await Promise.all([
    stoneIds.length
      ? env.DB.prepare(`SELECT id, price FROM stones WHERE id IN (${ph(stoneIds.length)})`).bind(...stoneIds).all<{ id: string; price: number }>()
      : Promise.resolve(none),
    stoneIds.length
      ? env.DB.prepare(`SELECT stone_id, mm, price_delta, stock FROM stone_sizes WHERE stone_id IN (${ph(stoneIds.length)})`).bind(...stoneIds).all<{ stone_id: string; mm: number; price_delta: number; stock: number }>()
      : Promise.resolve(none),
    accIds.length
      ? env.DB.prepare(`SELECT id, price, stock FROM accessories WHERE id IN (${ph(accIds.length)})`).bind(...accIds).all<{ id: string; price: number; stock: number }>()
      : Promise.resolve(none),
  ]);
  const stonePrice = new Map(stoneRes.results.map((r) => [r.id, r.price]));
  const sizeRows = new Map(sizeRes.results.map((r) => [`${r.stone_id}|${r.mm}`, r]));
  const accRows = new Map(accRes.results.map((r) => [r.id, r]));

  const shortages: string[] = [];
  const priced: OrderLine[] = [];
  for (const l of lines) {
    if (l.kind === "stone") {
      const base = stonePrice.get(l.id);
      if (base === undefined) return bad(`unknown item: ${l.id}`);
      const row = sizeRows.get(`${l.id}|${l.mm}`);
      if (row && row.stock < l.qty) shortages.push(`${l.name} ${l.mm}mm`);
      priced.push({ ...l, unit: base + (row ? row.price_delta : fallbackDelta(Number(l.mm))) });
    } else {
      const row = accRows.get(l.id);
      if (!row) return bad(`unknown item: ${l.id}`);
      if (row.stock < l.qty) shortages.push(l.name);
      priced.push({ ...l, unit: row.price });
    }
  }
  if (shortages.length) return json({ error: "out of stock", shortages }, { status: 409 });

  // A unit the client shows that disagrees with ours means a stale page or
  // a forged request: refuse with the fresh prices so an honest client can
  // re-render and retry, and a dishonest one gets nothing.
  const stale = priced.filter((p, i) => p.unit !== lines[i].unit);
  if (stale.length) {
    return json({ error: "price changed", items: stale.map((p) => ({ kind: p.kind, id: p.id, mm: p.mm, unit: p.unit })) }, { status: 409 });
  }

  // Fees come from settings — the same numbers the storefront hydrated, but
  // read here at order time so a client with a stale page still gets charged
  // the current configuration.
  const { results: settingRows } = await env.DB.prepare("SELECT key, value FROM settings WHERE key IN ('base_fee','shipping_fee','free_shipping_over')").all<{ key: string; value: string }>();
  const settings = Object.fromEntries(settingRows.map((r) => [r.key, Number(r.value)]));
  const baseFee = settings.base_fee ?? 680;
  const itemsTotal = priced.reduce((s, l) => s + l.unit * l.qty, 0);
  const shipping = itemsTotal + baseFee >= (settings.free_shipping_over ?? 3000) ? 0 : (settings.shipping_fee ?? 120);
  const total = itemsTotal + baseFee + shipping;

  const id = `OMA-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;

  // Stock deduction and the order insert commit together (D1 batches are
  // transactional). Each deduction re-checks stock in its WHERE clause so a
  // race between two buyers can't drive stock negative — the loser's row
  // simply doesn't deduct, which the owner reconciles when confirming.
  await env.DB.batch([
    ...priced.map((l) => l.kind === "stone"
      ? env.DB.prepare("UPDATE stone_sizes SET stock = stock - ? WHERE stone_id=? AND mm=? AND stock >= ?").bind(l.qty, l.id, l.mm, l.qty)
      : env.DB.prepare("UPDATE accessories SET stock = stock - ? WHERE id=? AND stock >= ?").bind(l.qty, l.id, l.qty)),
    env.DB.prepare(
      "INSERT INTO orders (id, name, phone, email, address, wrist_cm, note, items, base_fee, shipping, total, payment_method, ref_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      id, name, phone, email, address, wristCm, (b.note ?? "").trim().slice(0, 500),
      JSON.stringify({ spec, wrist: b.wrist ?? "", lines: priced }),
      baseFee, shipping, total, b.payment, (b.ref ?? "").trim().slice(0, 60),
    ),
  ]);

  return json({ id, total, baseFee, shipping }, { status: 201 });
}
