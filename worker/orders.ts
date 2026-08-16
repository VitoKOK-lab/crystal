// Public order intake: the checkout form posts here. The server is the
// authority on fees (read from settings, never trusted from the client),
// on stock (checked and deducted here), and on the order id. Payment stays
// out of band for now — the owner confirms each order personally; ECPay
// integration will hang off this same row via ecpay_trade_no.
import { Env, json } from "./lib";

type OrderLine = { kind: "stone" | "accessory"; id: string; mm?: number; qty: number; unit: number; name: string; sub: string };
type OrderBody = {
  name?: string; phone?: string; email?: string; address?: string; note?: string;
  wrist?: string; payment?: string; spec?: string; lines?: OrderLine[]; ref?: string;
};

const bad = (msg: string, status = 400) => json({ error: msg }, { status });

export async function handleOrders(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname !== "/api/orders" || request.method !== "POST") return null;

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
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return bad("invalid email");
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
    if (l.kind === "stone" && !(Number(l.mm) > 0)) return bad("stone line needs mm");
  }
  const wristCm = /^\d+(\.\d+)?$/.test(b.wrist ?? "") ? Number(b.wrist) : null;

  // Availability first, so a sold-out material comes back as a friendly 409
  // naming the pieces, not as a half-placed order. A stone size the ladder
  // no longer lists counts as untracked (old share links), not sold out.
  const shortages: string[] = [];
  for (const l of lines) {
    if (l.kind === "stone") {
      const row = await env.DB.prepare("SELECT stock FROM stone_sizes WHERE stone_id=? AND mm=?").bind(l.id, l.mm).first<{ stock: number }>();
      if (row && row.stock < l.qty) shortages.push(`${l.name} ${l.mm}mm`);
    } else {
      const row = await env.DB.prepare("SELECT stock FROM accessories WHERE id=?").bind(l.id).first<{ stock: number }>();
      if (row && row.stock < l.qty) shortages.push(l.name);
    }
  }
  if (shortages.length) return json({ error: "out of stock", shortages }, { status: 409 });

  // Fees come from settings — the same numbers the storefront hydrated, but
  // read here at order time so a client with a stale page still gets charged
  // the current configuration.
  const { results: settingRows } = await env.DB.prepare("SELECT key, value FROM settings WHERE key IN ('base_fee','shipping_fee','free_shipping_over')").all<{ key: string; value: string }>();
  const settings = Object.fromEntries(settingRows.map((r) => [r.key, Number(r.value)]));
  const baseFee = settings.base_fee ?? 680;
  const itemsTotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const shipping = itemsTotal + baseFee >= (settings.free_shipping_over ?? 3000) ? 0 : (settings.shipping_fee ?? 120);
  const total = itemsTotal + baseFee + shipping;

  const id = `OMA-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;

  // Stock deduction and the order insert commit together (D1 batches are
  // transactional). Each deduction re-checks stock in its WHERE clause so a
  // race between two buyers can't drive stock negative — the loser's row
  // simply doesn't deduct, which the owner reconciles when confirming.
  await env.DB.batch([
    ...lines.map((l) => l.kind === "stone"
      ? env.DB.prepare("UPDATE stone_sizes SET stock = stock - ? WHERE stone_id=? AND mm=? AND stock >= ?").bind(l.qty, l.id, l.mm, l.qty)
      : env.DB.prepare("UPDATE accessories SET stock = stock - ? WHERE id=? AND stock >= ?").bind(l.qty, l.id, l.qty)),
    env.DB.prepare(
      "INSERT INTO orders (id, name, phone, email, address, wrist_cm, note, items, base_fee, shipping, total, payment_method, ref_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      id, name, phone, email, address, wristCm, (b.note ?? "").trim().slice(0, 500),
      JSON.stringify({ spec, wrist: b.wrist ?? "", lines }),
      baseFee, shipping, total, b.payment, (b.ref ?? "").trim().slice(0, 60),
    ),
  ]);

  return json({ id, total, baseFee, shipping }, { status: 201 });
}
