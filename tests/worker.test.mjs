// Worker-side logic: session cookie crypto, admin route guards/validation,
// and the order intake (fees from settings, stock check + deduction).
// Runs against a purpose-built fake D1 that understands exactly the SQL
// these modules issue — if a query changes shape, the fake throws, which is
// the test telling you it no longer matches production SQL.
import assert from "node:assert/strict";
import test from "node:test";
import { importCompiled } from "./esbuild-import.mjs";

const { lib, admin, orders } = await importCompiled("tests/fixtures/worker-entry.ts");

// --- Fake D1 -------------------------------------------------------------

function fakeDb({ stoneSizes = {}, accessories = {}, settings = {} } = {}) {
  const state = {
    settings: new Map(Object.entries(settings)),
    stoneSizes: new Map(Object.entries(stoneSizes)),   // "id|mm" -> stock
    accessories: new Map(Object.entries(accessories)), // id -> stock
    orders: [],
    writes: [],
  };
  const exec = (sql, args) => {
    if (sql.includes("FROM settings WHERE key='session_signing_key'")) {
      const v = state.settings.get("session_signing_key");
      return v === undefined ? [] : [{ value: v }];
    }
    if (sql.startsWith("INSERT OR IGNORE INTO settings")) {
      if (!state.settings.has("session_signing_key")) state.settings.set("session_signing_key", args[0]);
      return [];
    }
    if (sql.startsWith("SELECT key, value FROM settings")) {
      return [...state.settings.entries()]
        .filter(([k]) => ["base_fee", "shipping_fee", "free_shipping_over"].includes(k))
        .map(([key, value]) => ({ key, value }));
    }
    if (sql.startsWith("SELECT stock FROM stone_sizes")) {
      const stock = state.stoneSizes.get(`${args[0]}|${args[1]}`);
      return stock === undefined ? [] : [{ stock }];
    }
    if (sql.startsWith("SELECT stock FROM accessories")) {
      const stock = state.accessories.get(args[0]);
      return stock === undefined ? [] : [{ stock }];
    }
    if (sql.startsWith("UPDATE stone_sizes SET stock = stock - ?")) {
      const [qty, id, mm, guard] = args;
      const key = `${id}|${mm}`;
      const cur = state.stoneSizes.get(key);
      if (cur !== undefined && cur >= guard) state.stoneSizes.set(key, cur - qty);
      return [];
    }
    if (sql.startsWith("UPDATE accessories SET stock = stock - ?")) {
      const [qty, id, guard] = args;
      const cur = state.accessories.get(id);
      if (cur !== undefined && cur >= guard) state.accessories.set(id, cur - qty);
      return [];
    }
    if (sql.startsWith("INSERT INTO orders")) {
      state.orders.push(args);
      return [];
    }
    if (/^(UPDATE|INSERT|DELETE)/.test(sql)) {
      state.writes.push({ sql, args });
      return [];
    }
    throw new Error(`fake D1 has no handler for: ${sql}`);
  };
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    all: async () => ({ results: exec(sql, args) }),
    first: async () => exec(sql, args)[0] ?? null,
    run: async () => exec(sql, args),
  });
  return {
    state,
    prepare: (sql) => stmt(sql),
    batch: async (stmts) => { for (const s of stmts) await s.run(); return []; },
  };
}

const envWith = (db, over = {}) => ({ DB: db, ASSETS: { fetch: async () => new Response("") }, ADMIN_EMAILS: "owner@example.com", ...over });
const jsonReq = (url, body, headers = {}) => new Request(url, {
  method: url.includes("orders") && !url.includes("admin") ? "POST" : "PUT",
  headers: { "content-type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});
const call = (handler, req, env) => handler(req, env, new URL(req.url));

// --- Session cookie ------------------------------------------------------

test("session cookie round-trips for a whitelisted email", async () => {
  const env = envWith(fakeDb());
  const setCookie = await lib.makeSessionCookie(env, "owner@example.com");
  const cookie = setCookie.split(";")[0];
  const req = new Request("http://x/api/admin/catalog", { headers: { cookie } });
  assert.equal(await lib.sessionEmail(env, req), "owner@example.com");
});

test("a tampered payload or a non-whitelisted email is rejected", async () => {
  const env = envWith(fakeDb());
  const setCookie = await lib.makeSessionCookie(env, "owner@example.com");
  const [, value] = setCookie.split(";")[0].split("=");
  const [, sig] = value.split(".");
  const forgedPayload = btoa(`intruder@example.com|${Date.now() + 3600_000}`);
  const forged = new Request("http://x/", { headers: { cookie: `oma_admin=${forgedPayload}.${sig}` } });
  assert.equal(await lib.sessionEmail(env, forged), null, "signature must not transfer to a new payload");

  const outsider = await lib.makeSessionCookie(env, "stranger@example.com");
  const req = new Request("http://x/", { headers: { cookie: outsider.split(";")[0] } });
  assert.equal(await lib.sessionEmail(env, req), null, "valid signature but not on the whitelist");
});

// --- Admin routes --------------------------------------------------------

const adminCookie = async (env) => (await lib.makeSessionCookie(env, "owner@example.com")).split(";")[0];

test("admin routes demand a session", async () => {
  const env = envWith(fakeDb());
  const res = await call(admin.handleAdmin, jsonReq("http://x/api/admin/stones/rose", { zh: "粉晶" }), env);
  assert.equal(res.status, 401);
});

test("malformed JSON and missing fields return 400, not a NULLed-out row", async () => {
  const env = envWith(fakeDb());
  const cookie = await adminCookie(env);
  const broken = await call(admin.handleAdmin, jsonReq("http://x/api/admin/stones/rose", "{not json", { cookie }), env);
  assert.equal(broken.status, 400);
  const partial = await call(admin.handleAdmin, jsonReq("http://x/api/admin/stones/rose", { zh: "粉晶" }, { cookie }), env);
  assert.equal(partial.status, 400, "a row update without every required field is refused");
  assert.equal(env.DB.state.writes.length, 0, "nothing was written");
});

test("a valid stone update writes exactly the validated fields", async () => {
  const env = envWith(fakeDb());
  const cookie = await adminCookie(env);
  const res = await call(admin.handleAdmin, jsonReq("http://x/api/admin/stones/rose", {
    zh: "粉晶", en: "Rose Quartz", energy_zh: "愛情", price: 260, note: "", energies: { love: 9 },
  }, { cookie }), env);
  assert.equal(res.status, 200);
  assert.equal(env.DB.state.writes.length, 1);
  assert.deepEqual(env.DB.state.writes[0].args.slice(0, 4), ["粉晶", "Rose Quartz", "愛情", 260]);
});

test("order status transitions are whitelisted", async () => {
  const env = envWith(fakeDb());
  const cookie = await adminCookie(env);
  const nope = await call(admin.handleAdmin, jsonReq("http://x/api/admin/orders/OMA-1/status", { status: "refunded" }, { cookie }), env);
  assert.equal(nope.status, 400);
  const ok = await call(admin.handleAdmin, jsonReq("http://x/api/admin/orders/OMA-1/status", { status: "paid" }, { cookie }), env);
  assert.equal(ok.status, 200);
});

// --- Order intake --------------------------------------------------------

const orderBody = (over = {}) => ({
  name: "王小明", phone: "0912345678", email: "", address: "台北市信義區某路 1 號",
  note: "", wrist: "16", payment: "card", spec: "16|rose.10,gold-hex",
  lines: [
    { kind: "stone", id: "rose", mm: 10, qty: 1, unit: 340, name: "粉水晶", sub: "10mm 大珠" },
    { kind: "accessory", id: "gold-hex", qty: 1, unit: 150, name: "金色六角框隔珠", sub: "精緻隔珠" },
  ],
  ...over,
});
const orderDb = () => fakeDb({
  stoneSizes: { "rose|10": 5 },
  accessories: { "gold-hex": 3 },
  settings: { base_fee: "680", shipping_fee: "120", free_shipping_over: "3000" },
});

test("a valid order deducts stock and stores server-computed fees", async () => {
  const db = orderDb();
  const res = await call(orders.handleOrders, jsonReq("http://x/api/orders", orderBody()), envWith(db));
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.match(data.id, /^OMA-/);
  assert.equal(data.baseFee, 680);
  assert.equal(data.shipping, 120, "490 of items + 680 fee is under the 3000 free-shipping bar");
  assert.equal(data.total, 340 + 150 + 680 + 120);
  assert.equal(db.state.stoneSizes.get("rose|10"), 4);
  assert.equal(db.state.accessories.get("gold-hex"), 2);
  assert.equal(db.state.orders.length, 1);
});

test("a sold-out piece returns 409 with its name and deducts nothing", async () => {
  const db = fakeDb({ stoneSizes: { "rose|10": 0 }, accessories: { "gold-hex": 3 }, settings: { base_fee: "680" } });
  const res = await call(orders.handleOrders, jsonReq("http://x/api/orders", orderBody()), envWith(db));
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.deepEqual(data.shortages, ["粉水晶 10mm"]);
  assert.equal(db.state.accessories.get("gold-hex"), 3, "no partial deduction");
  assert.equal(db.state.orders.length, 0);
});

test("an untracked stone size (legacy share link) is not treated as sold out", async () => {
  const db = orderDb();
  const body = orderBody({ spec: "16|rose.7", lines: [{ kind: "stone", id: "rose", mm: 7, qty: 1, unit: 300, name: "粉水晶", sub: "7mm" }] });
  const res = await call(orders.handleOrders, jsonReq("http://x/api/orders", body), envWith(db));
  assert.equal(res.status, 201);
});

test("bad order input is rejected before touching stock", async () => {
  for (const over of [
    { phone: "12345" },
    { name: "" },
    { address: "" },
    { payment: "bitcoin" },
    { lines: [] },
    { lines: [{ kind: "stone", id: "rose", qty: 1, unit: 340, name: "x", sub: "" }] }, // stone without mm
  ]) {
    const db = orderDb();
    const res = await call(orders.handleOrders, jsonReq("http://x/api/orders", orderBody(over)), envWith(db));
    assert.equal(res.status, 400, JSON.stringify(over));
    assert.equal(db.state.orders.length, 0);
  }
});

test("free shipping kicks in past the configured threshold", async () => {
  const db = orderDb();
  const body = orderBody({ lines: [{ kind: "accessory", id: "gold-hex", qty: 1, unit: 2500, name: "貴的", sub: "" }] });
  const res = await call(orders.handleOrders, jsonReq("http://x/api/orders", body), envWith(db));
  const data = await res.json();
  assert.equal(data.shipping, 0);
});
