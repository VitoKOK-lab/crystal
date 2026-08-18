// Worker-side logic: session cookie crypto, admin route guards/validation,
// and the order intake (fees from settings, stock check + deduction).
// Runs against a purpose-built fake D1 that understands exactly the SQL
// these modules issue — if a query changes shape, the fake throws, which is
// the test telling you it no longer matches production SQL.
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { importCompiled } from "./esbuild-import.mjs";

const { lib, admin, orders, quizReading, ai, ecpay, linepay, auth, worker } = await importCompiled("tests/fixtures/worker-entry.ts");

// The per-IP rate limiter would trip across a test file's worth of calls
// from one fake client; each test starts with a clean window.
beforeEach(() => lib.__resetRateLimits());

// --- Fake D1 -------------------------------------------------------------

function fakeDb({ stones = {}, stoneSizes = {}, accessories = {}, settings = {} } = {}) {
  const state = {
    settings: new Map(Object.entries(settings)),
    stones: new Map(Object.entries(stones)),           // id -> price
    stoneSizes: new Map(Object.entries(stoneSizes)),   // "id|mm" -> {stock, delta}
    accessories: new Map(Object.entries(accessories)), // id -> {stock, price}
    orders: [],
    writes: [],
    quizReadings: new Map(),
    aiTexts: new Map(),   // key -> {kind, payload}
    wishStones: [],       // rows for the wish menu query
    orderRow: null,       // ecpay's order lookups
  };
  const exec = (sql, args) => {
    if (sql.includes("FROM settings WHERE key='session_signing_key'")) {
      const v = state.settings.get("session_signing_key");
      return v === undefined ? [] : [{ value: v }];
    }
    if (sql.startsWith("INSERT OR REPLACE INTO settings")) {
      state.settings.set("session_signing_key", args[0]);
      return [];
    }
    if (sql.startsWith("SELECT key, value FROM settings")) {
      return [...state.settings.entries()]
        .filter(([k]) => ["base_fee", "shipping_fee", "free_shipping_over"].includes(k))
        .map(([key, value]) => ({ key, value }));
    }
    if (sql.startsWith("SELECT id, price FROM stones WHERE id IN")) {
      return args.filter((id) => state.stones.has(id)).map((id) => ({ id, price: state.stones.get(id) }));
    }
    if (sql.startsWith("SELECT stone_id, mm, price_delta, stock FROM stone_sizes WHERE stone_id IN")) {
      return [...state.stoneSizes.entries()]
        .filter(([key]) => args.includes(key.split("|")[0]))
        .map(([key, row]) => ({ stone_id: key.split("|")[0], mm: Number(key.split("|")[1]), price_delta: row.delta, stock: row.stock }));
    }
    if (sql.startsWith("SELECT id, price, stock FROM accessories WHERE id IN")) {
      return args.filter((id) => state.accessories.has(id))
        .map((id) => ({ id, price: state.accessories.get(id).price, stock: state.accessories.get(id).stock }));
    }
    if (sql.startsWith("UPDATE stone_sizes SET stock = stock - ?")) {
      const [qty, id, mm, guard] = args;
      const key = `${id}|${mm}`;
      const cur = state.stoneSizes.get(key);
      if (cur !== undefined && cur.stock >= guard) state.stoneSizes.set(key, { ...cur, stock: cur.stock - qty });
      return [];
    }
    if (sql.startsWith("UPDATE accessories SET stock = stock - ?")) {
      const [qty, id, guard] = args;
      const cur = state.accessories.get(id);
      if (cur !== undefined && cur.stock >= guard) state.accessories.set(id, { ...cur, stock: cur.stock - qty });
      return [];
    }
    if (sql.startsWith("INSERT INTO orders")) {
      state.orders.push(args);
      return [];
    }
    if (sql.startsWith("SELECT reading FROM quiz_readings")) {
      const v = state.quizReadings.get(args[0]);
      return v === undefined ? [] : [{ reading: v }];
    }
    if (sql.startsWith("SELECT COUNT(*) AS n FROM quiz_readings")) {
      return [{ n: state.quizReadings.size }];
    }
    if (sql.startsWith("INSERT OR IGNORE INTO quiz_readings")) {
      state.quizReadings.set(args[0], args[1]);
      return [];
    }
    if (sql.startsWith("SELECT payload FROM ai_texts")) {
      const row = state.aiTexts.get(args[0]);
      return row === undefined ? [] : [{ payload: row.payload }];
    }
    if (sql.startsWith("SELECT COUNT(*) AS n FROM ai_texts")) {
      return [{ n: [...state.aiTexts.values()].filter((r) => r.kind === args[0]).length }];
    }
    if (sql.startsWith("INSERT OR IGNORE INTO ai_texts")) {
      state.aiTexts.set(args[0], { kind: args[1], payload: args[2] });
      return [];
    }
    if (sql.startsWith("SELECT id, zh, energies FROM stones")) {
      return state.wishStones;
    }
    if (sql.startsWith("SELECT COUNT(*) AS n FROM stones")) {
      return [{ n: state.stones.size }];
    }
    if (sql.startsWith("SELECT id, total, status FROM orders") || sql.startsWith("SELECT total, status FROM orders")) {
      return state.orderRow ? [state.orderRow] : [];
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
// rose 10mm 的正牌價：base 260 + 尺寸差 80 = 340；gold-hex 150。
const orderDb = (over = {}) => fakeDb({
  stones: { rose: 260 },
  stoneSizes: { "rose|10": { stock: 5, delta: 80 } },
  accessories: { "gold-hex": { stock: 3, price: 150 } },
  settings: { base_fee: "680", shipping_fee: "120", free_shipping_over: "3000" },
  ...over,
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
  assert.equal(db.state.stoneSizes.get("rose|10").stock, 4);
  assert.equal(db.state.accessories.get("gold-hex").stock, 2);
  assert.equal(db.state.orders.length, 1);
});

test("a forged unit price is refused — the catalog rows are the price authority", async () => {
  for (const cheat of [
    { kind: "stone", id: "rose", mm: 10, qty: 1, unit: 1, name: "粉水晶", sub: "10mm 大珠" },
    { kind: "accessory", id: "gold-hex", qty: 1, unit: 0, name: "金色六角框隔珠", sub: "" },
  ]) {
    const db = orderDb();
    const res = await call(orders.handleOrders, jsonReq("http://x/api/orders", orderBody({ lines: [cheat] })), envWith(db));
    assert.equal(res.status, 409, JSON.stringify(cheat));
    const data = await res.json();
    assert.equal(data.error, "price changed");
    assert.equal(db.state.orders.length, 0, "no order stored at a forged price");
    assert.equal(db.state.stoneSizes.get("rose|10").stock, 5, "no stock deducted");
  }
});

test("an unknown item id is refused outright", async () => {
  const db = orderDb();
  const body = orderBody({ lines: [{ kind: "stone", id: "no-such-stone", mm: 10, qty: 1, unit: 100, name: "幽靈石", sub: "" }] });
  const res = await call(orders.handleOrders, jsonReq("http://x/api/orders", body), envWith(db));
  assert.equal(res.status, 400);
  assert.equal(db.state.orders.length, 0);
});

test("a sold-out piece returns 409 with its name and deducts nothing", async () => {
  const db = orderDb({ stoneSizes: { "rose|10": { stock: 0, delta: 80 } } });
  const res = await call(orders.handleOrders, jsonReq("http://x/api/orders", orderBody()), envWith(db));
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.deepEqual(data.shortages, ["粉水晶 10mm"]);
  assert.equal(db.state.accessories.get("gold-hex").stock, 3, "no partial deduction");
  assert.equal(db.state.orders.length, 0);
});

test("an untracked stone size (legacy share link) is not treated as sold out", async () => {
  const db = orderDb();
  // 7mm 不在階梯上：fallback 曲線 260 + round((7-8)*32) = 228。
  const body = orderBody({ spec: "16|rose.7", lines: [{ kind: "stone", id: "rose", mm: 7, qty: 1, unit: 228, name: "粉水晶", sub: "7mm" }] });
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
  // 16 × 150 = 2400；加上 680 串製費過 3000 門檻 → 免運。
  const db = orderDb({ accessories: { "gold-hex": { stock: 20, price: 150 } } });
  const body = orderBody({ lines: [{ kind: "accessory", id: "gold-hex", qty: 16, unit: 150, name: "金色六角框隔珠", sub: "" }] });
  const res = await call(orders.handleOrders, jsonReq("http://x/api/orders", body), envWith(db));
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.shipping, 0);
});

// --- 生日選石 AI 解讀代理 ---------------------------------------------------

const readingBody = {
  name: "Vito", birthday: "1995-08-16", life: 3, persona: "表達者", theme: "財富",
  positions: [
    { role: "主星石", stone: "白水晶", energy: "專注" },
    { role: "內在石", stone: "薔薇輝石", energy: "愛情" },
    { role: "行動石", stone: "圓珠茶晶", energy: "專注" },
    { role: "流年石", stone: "圓珠消光火山岩", energy: "力量" },
    { role: "意圖石", stone: "切面金沙石", energy: "財富" },
  ],
};
const readingReq = (body) => new Request("https://x/api/quiz-reading", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

test("quiz-reading answers 503 when no Kimi key is configured", async () => {
  const res = await call(quizReading.handleQuizReading, readingReq(readingBody), envWith(fakeDb()));
  assert.equal(res.status, 503);
});

test("quiz-reading validates input before spending any tokens", async () => {
  const env = envWith(fakeDb(), { KIMI_API_KEY: "k" });
  for (const bad of [
    { ...readingBody, birthday: "not-a-date" },
    { ...readingBody, name: "" },
    { ...readingBody, life: 99 },
    { ...readingBody, positions: readingBody.positions.slice(0, 2) },
  ]) {
    const res = await call(quizReading.handleQuizReading, readingReq(bad), env);
    assert.equal(res.status, 400);
  }
});

test("quiz-reading proxies Kimi, validates the JSON shape, and caches by identity", async () => {
  const db = fakeDb();
  const env = envWith(db, { KIMI_API_KEY: "k" });
  const reading = {
    overall: "Vito，1995 年夏天出生的你，帶著表達者的節奏走到今天，這五顆石頭排出的正是你此刻的樣子，值得慢慢戴著感受。",
    stones: readingBody.positions.map((p) => ({ role: p.role, line: `${p.stone}陪你把${p.energy}穩穩接住。` })),
    blessing: "願你想說的話，都有人好好聽見。",
  };
  const realFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => { upstreamCalls += 1; return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reading) } }] })); };
  try {
    const res = await call(quizReading.handleQuizReading, readingReq(readingBody), env);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.reading.overall, reading.overall);
    assert.equal(data.reading.stones.length, 5);

    const again = await call(quizReading.handleQuizReading, readingReq(readingBody), env);
    const cached = await again.json();
    assert.equal(cached.cached, true, "same name|birthday|theme is served from D1");
    assert.equal(upstreamCalls, 1, "the model is only paid once per identity");

    globalThis.fetch = async () => new Response("{}", { status: 500 });
    const garbled = await call(quizReading.handleQuizReading, readingReq({ ...readingBody, name: "另一個人" }), env);
    assert.equal(garbled.status, 502, "upstream failure surfaces as 502, never a fake reading");
  } finally {
    globalThis.fetch = realFetch;
  }
});

// --- AI 三功能（命名／許願／合盤）------------------------------------------

const aiEnv = (db, over = {}) => envWith(db, { KIMI_API_KEY: "k", ...over });
const aiReq = (path, body) => new Request(`https://x${path}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});
const kimiResponse = (obj) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(obj) } }] }));

test("all three AI endpoints answer 503 without a key", async () => {
  for (const [path, body] of [
    ["/api/design-poem", { dominant: "守護", stones: ["黑曜石"] }],
    ["/api/wish-reading", { name: "V", wish: "想撐過換工作的這半年" }],
    ["/api/pair-reading", { relation: "閨蜜", a: {}, b: {}, bondStone: "白水晶" }],
  ]) {
    const res = await call(ai.handleAi, aiReq(path, body), envWith(fakeDb()));
    assert.equal(res.status, 503, path);
  }
});

test("design-poem caches by stone multiset regardless of order", async () => {
  const db = fakeDb();
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return kimiResponse({ title: "凌晨四點的溫柔", verse: "把想守住的，好好戴在手上。" }); };
  try {
    const first = await call(ai.handleAi, aiReq("/api/design-poem", { dominant: "守護", stones: ["黑曜石", "白水晶"] }), aiEnv(db));
    assert.equal(first.status, 200);
    assert.equal((await first.json()).poem.title, "凌晨四點的溫柔");
    const swapped = await call(ai.handleAi, aiReq("/api/design-poem", { dominant: "守護", stones: ["白水晶", "黑曜石"] }), aiEnv(db));
    assert.equal((await swapped.json()).cached, true, "order must not bust the cache");
    assert.equal(calls, 1);
  } finally { globalThis.fetch = realFetch; }
});

test("wish-reading only accepts stones that exist in the database menu", async () => {
  const db = fakeDb();
  // 15 real stones so the menu builds; Kimi answers with one fake name.
  db.state.wishStones = Array.from({ length: 15 }, (_, i) => ({ id: `s${i}`, zh: `石頭${i}`, energies: JSON.stringify({ wealth: i % 10, love: 5, healing: 5, protection: 5, focus: 5, power: 5 }) }));
  const good = { overall: "a".repeat(30), stones: [0, 1, 2, 3, 4].map((i) => ({ name: `石頭${i}`, role: "主願石", line: "陪你把願望穩穩接住，一步一步慢慢來。" })), blessing: "願你如願。" };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => kimiResponse(good);
  try {
    const ok = await call(ai.handleAi, aiReq("/api/wish-reading", { name: "V", wish: "想撐過換工作的這半年" }), aiEnv(db));
    assert.equal(ok.status, 200);
    const reading = (await ok.json()).reading;
    assert.deepEqual(reading.stones.map((s) => s.id), ["s0", "s1", "s2", "s3", "s4"], "names map back to real ids");

    globalThis.fetch = async () => kimiResponse({ ...good, stones: [{ ...good.stones[0], name: "不存在的石頭" }, ...good.stones.slice(1)] });
    const bad = await call(ai.handleAi, aiReq("/api/wish-reading", { name: "V2", wish: "想撐過換工作的這半年" }), aiEnv(db));
    assert.equal(bad.status, 502, "an invented stone name kills the reading");
  } finally { globalThis.fetch = realFetch; }
});

test("pair-reading validates both persons and returns the Kimi text", async () => {
  const db = fakeDb();
  const person = (n) => ({ name: n, birthday: "1995-08-16", life: 3, persona: "表達者", stone: "白水晶" });
  const text = { overall: "兩個人的節奏剛好互補，一快一慢，正好接住彼此的空拍。", a_line: "白水晶替你把主場戴在手上。", b_line: "白水晶替你把主場戴在手上。", bond_line: "連結石讓你們看見它就想起彼此。", blessing: "願你們一直順手。" };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => kimiResponse(text);
  try {
    const bad = await call(ai.handleAi, aiReq("/api/pair-reading", { relation: "同事", a: person("A"), b: person("B"), bondStone: "白水晶" }), aiEnv(db));
    assert.equal(bad.status, 400, "relation outside the whitelist");
    const ok = await call(ai.handleAi, aiReq("/api/pair-reading", { relation: "情侶", a: person("A"), b: person("B"), bondStone: "白水晶" }), aiEnv(db));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).reading.overall, text.overall);
  } finally { globalThis.fetch = realFetch; }
});

test("a key from the international platform falls through .cn's 401 to .ai", async () => {
  const db = fakeDb();
  const realFetch = globalThis.fetch;
  const hits = [];
  globalThis.fetch = async (url) => {
    hits.push(new URL(url).host);
    if (String(url).includes("moonshot.cn")) return new Response("{}", { status: 401 });
    return kimiResponse({ title: "白日夢的邊界", verse: "把安穩戴在手上，往前走。" });
  };
  try {
    const res = await call(ai.handleAi, aiReq("/api/design-poem", { dominant: "守護", stones: ["黑曜石"] }), aiEnv(db));
    assert.equal(res.status, 200, "the .ai retry must succeed");
    assert.deepEqual(hits, ["api.moonshot.cn", "api.moonshot.ai"]);
  } finally { globalThis.fetch = realFetch; }
});

// --- 綠界金流 ---------------------------------------------------------------

const ecpayReq = (path, body, form = false) => new Request(`https://shop.example${path}`, {
  method: "POST",
  headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json" },
  body: form ? body : JSON.stringify(body),
});

test("pay/ecpay signs a form for a pending order and refuses non-pending", async () => {
  const db = fakeDb();
  db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "pending" };
  const res = await call(ecpay.handleEcpay, ecpayReq("/api/pay/ecpay", { order: "OMA-TEST01" }), envWith(db));
  assert.equal(res.status, 200);
  const { action, fields } = await res.json();
  assert.ok(action.endsWith("/Cashier/AioCheckOut/V5"));
  assert.equal(fields.TotalAmount, "4890");
  assert.equal(fields.CustomField1, "OMA-TEST01");
  assert.equal(fields.MerchantID, "3362787");
  assert.ok(/^[A-Za-z0-9]{1,20}$/.test(fields.MerchantTradeNo), "trade no must be <=20 alnum");
  const expected = await ecpay.checkMacValue(fields, "5tzn8qyhl9EwzwuT", "iz8YXaAUx60tijdL");
  assert.equal(fields.CheckMacValue, expected, "signature covers exactly the posted fields");

  db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "paid" };
  const again = await call(ecpay.handleEcpay, ecpayReq("/api/pay/ecpay", { order: "OMA-TEST01" }), envWith(db));
  assert.equal(again.status, 409, "already-paid order can't start another payment");
});

async function signedCallback(overrides = {}) {
  const params = {
    MerchantID: "3362787", MerchantTradeNo: "OMATEST01T1", TradeNo: "2508170000001",
    RtnCode: "1", RtnMsg: "交易成功", TradeAmt: "4890", CustomField1: "OMA-TEST01",
    PaymentDate: "2026/08/17 12:00:00", PaymentType: "Credit_CreditCard", ...overrides,
  };
  params.CheckMacValue = await ecpay.checkMacValue(params, "5tzn8qyhl9EwzwuT", "iz8YXaAUx60tijdL");
  return new URLSearchParams(params).toString();
}

test("ecpay/return marks the order paid only on a valid, amount-matching callback", async () => {
  const db = fakeDb();
  db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "pending" };
  const ok = await call(ecpay.handleEcpay, ecpayReq("/api/ecpay/return", await signedCallback(), true), envWith(db));
  assert.equal(await ok.text(), "1|OK");
  assert.ok(db.state.writes.some((w) => w.sql.includes("SET status='paid'")), "order flipped to paid");

  db.state.writes.length = 0;
  const badAmount = await call(ecpay.handleEcpay, ecpayReq("/api/ecpay/return", await signedCallback({ TradeAmt: "1" }), true), envWith(db));
  assert.equal(await badAmount.text(), "0|Amount Mismatch");
  assert.equal(db.state.writes.length, 0);

  const tampered = (await signedCallback()).replace("TradeAmt=4890", "TradeAmt=9999");
  const badMac = await call(ecpay.handleEcpay, ecpayReq("/api/ecpay/return", tampered, true), envWith(db));
  assert.equal(await badMac.text(), "0|CheckMacValue Error");
});

test("ecpay/result redirects the browser with the outcome, touching nothing", async () => {
  const db = fakeDb();
  const res = await call(ecpay.handleEcpay, ecpayReq("/api/ecpay/result", await signedCallback(), true), envWith(db));
  assert.equal(res.status, 302);
  const loc = new URL(res.headers.get("location"));
  assert.equal(loc.searchParams.get("pay"), "ok");
  assert.equal(loc.searchParams.get("order"), "OMA-TEST01");
  assert.equal(db.state.writes.length, 0, "result page never writes");
});

// --- LINE Pay ---------------------------------------------------------------

const lpEnv = (db) => envWith(db, { LINE_PAY_CHANNEL_ID: "1656000000", LINE_PAY_CHANNEL_SECRET: "lp-secret" });
const lpReq = (order) => new Request("https://shop.example/api/pay/linepay", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order }),
});
const lpConfirmReq = (qs) => new Request(`https://shop.example/api/linepay/confirm?${qs}`, { method: "GET" });

test("pay/linepay answers 503 without credentials and 502 on an upstream refusal", async () => {
  const db = fakeDb();
  db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "pending" };
  const off = await call(linepay.handleLinepay, lpReq("OMA-TEST01"), envWith(db));
  assert.equal(off.status, 503, "unconfigured LINE Pay must refuse politely");

  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ returnCode: "1104", returnMessage: "merchant not found" }));
    const refused = await call(linepay.handleLinepay, lpReq("OMA-TEST01"), lpEnv(db));
    assert.equal(refused.status, 502);
  } finally { globalThis.fetch = realFetch; }
});

test("pay/linepay requests a signed payment and hands back the payment URL", async () => {
  const db = fakeDb();
  db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "pending" };
  const realFetch = globalThis.fetch;
  let captured = null;
  try {
    globalThis.fetch = async (input, init) => {
      captured = { url: String(input), headers: init.headers, body: init.body };
      // 原文字串回應：transactionId 是 19 位整數，真實回應裡就是個
      // 會被 JSON.parse 掉精度的數字——這裡保持原樣以驗證處理方式。
      return new Response('{"returnCode":"0000","info":{"paymentUrl":{"web":"https://sandbox-web-pay.line.me/web/payment/wait?t=abc"},"transactionId":2025081712345678901}}');
    };
    const res = await call(linepay.handleLinepay, lpReq("OMA-TEST01"), lpEnv(db));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).paymentUrl, "https://sandbox-web-pay.line.me/web/payment/wait?t=abc");

    assert.ok(captured.url.endsWith("/v3/payments/request"));
    const body = JSON.parse(captured.body);
    assert.equal(body.amount, 4890);
    assert.equal(body.currency, "TWD");
    assert.equal(body.packages[0].amount, 4890, "package sum must equal the total");
    assert.ok(body.orderId.startsWith("OMA-TEST01-"), "each attempt gets a fresh LINE orderId");
    assert.ok(body.redirectUrls.confirmUrl.includes("order=OMA-TEST01"), "real order id rides the confirm URL");
    assert.equal(captured.headers["X-LINE-ChannelId"], "1656000000");
    const expected = await linepay.lineSign("lp-secret", "/v3/payments/request", captured.body, captured.headers["X-LINE-Authorization-Nonce"]);
    assert.equal(captured.headers["X-LINE-Authorization"], expected, "signature covers secret+path+body+nonce");
    assert.ok(db.state.writes.some((w) => w.sql.startsWith("UPDATE orders SET linepay_txn")), "attempt id recorded");

    db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "paid" };
    const again = await call(linepay.handleLinepay, lpReq("OMA-TEST01"), lpEnv(db));
    assert.equal(again.status, 409, "already-paid order can't start another payment");
  } finally { globalThis.fetch = realFetch; }
});

test("linepay/confirm captures via the Confirm API before marking paid", async () => {
  const db = fakeDb();
  db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "pending" };
  const realFetch = globalThis.fetch;
  try {
    let confirmBody = null;
    globalThis.fetch = async (input, init) => {
      assert.ok(String(input).endsWith("/v3/payments/2025081712345678901/confirm"));
      confirmBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ returnCode: "0000", info: {} }));
    };
    const ok = await call(linepay.handleLinepay, lpConfirmReq("order=OMA-TEST01&transactionId=2025081712345678901"), lpEnv(db));
    assert.equal(ok.status, 302);
    assert.equal(new URL(ok.headers.get("location")).searchParams.get("pay"), "ok");
    assert.equal(confirmBody.amount, 4890, "capture amount comes from the order row, not the URL");
    assert.ok(db.state.writes.some((w) => w.sql.includes("SET status='paid'")), "order flipped to paid");

    // LINE 拒絕請款 → fail 導回、不動訂單。
    db.state.writes.length = 0;
    globalThis.fetch = async () => new Response(JSON.stringify({ returnCode: "1155", returnMessage: "wrong txn" }));
    const bad = await call(linepay.handleLinepay, lpConfirmReq("order=OMA-TEST01&transactionId=2025081712345678901"), lpEnv(db));
    assert.equal(new URL(bad.headers.get("location")).searchParams.get("pay"), "fail");
    assert.equal(db.state.writes.length, 0);

    // 已付款的單重整導回頁 → 直接 ok，不再打 Confirm。
    db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "paid" };
    globalThis.fetch = async () => { throw new Error("confirm must not be called twice"); };
    const replay = await call(linepay.handleLinepay, lpConfirmReq("order=OMA-TEST01&transactionId=2025081712345678901"), lpEnv(db));
    assert.equal(new URL(replay.headers.get("location")).searchParams.get("pay"), "ok");
  } finally { globalThis.fetch = realFetch; }
});

test("deep-reading validates the 7-chakra payload and returns Kimi text", async () => {
  const db = fakeDb();
  const positions = ["海底輪", "臍輪", "太陽神經叢", "心輪", "喉輪", "眉心輪", "頂輪"].map((role) => ({ role, stone: "白水晶", note: "維持平衡" }));
  const body = { name: "Mia", birthday: "1996-03-08", life: 9, persona: "完滿者", mbti: "INFJ", concerns: ["海底輪"], positions };
  const reading = {
    overall: "Mia，生命靈數 9 的完滿者，安靜而深的你把大家都接住了——這條七輪手鍊從海底輪開始，替你把自己的地基也顧好，一步一步把能量還給自己。",
    stones: positions.map((p) => ({ role: p.role, line: `${p.role}的守位石，替你把該顧的顧好。` })),
    blessing: "願你的每一個輪，都亮著剛剛好的光。",
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => kimiResponse(reading);
  try {
    const bad = await call(ai.handleAi, aiReq("/api/deep-reading", { ...body, mbti: "ABCD" }), aiEnv(db));
    assert.equal(bad.status, 400, "invalid MBTI rejected");
    const short = await call(ai.handleAi, aiReq("/api/deep-reading", { ...body, positions: positions.slice(0, 5) }), aiEnv(db));
    assert.equal(short.status, 400, "needs exactly 7 chakra positions");
    const ok = await call(ai.handleAi, aiReq("/api/deep-reading", body), aiEnv(db));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).reading.stones.length, 7);
  } finally { globalThis.fetch = realFetch; }
});

// --- Google OAuth 登入流程（後台唯一的門）-----------------------------------

const oauthEnv = (db, over = {}) => envWith(db, {
  GOOGLE_CLIENT_ID: "cid.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "sec",
  ...over,
});
const callbackReq = (qs, cookie) => new Request(`https://shop.example/api/auth/google/callback?${qs}`, {
  headers: cookie ? { cookie } : {},
});
const googleStubs = ({ aud = "cid.apps.googleusercontent.com", email = "owner@example.com", verified = "true" } = {}) =>
  async (url) => {
    const u = String(url);
    if (u.includes("oauth2.googleapis.com/token") && !u.includes("tokeninfo")) {
      return new Response(JSON.stringify({ id_token: "tok" }));
    }
    if (u.includes("tokeninfo")) {
      return new Response(JSON.stringify({ aud, email, email_verified: verified }));
    }
    throw new Error(`unexpected fetch in oauth test: ${u}`);
  };

test("admin/me reports auth state without leaking anything else", async () => {
  const env = envWith(fakeDb());
  const anon = await call(auth.handleAuth, new Request("http://x/api/admin/me"), env);
  assert.equal(anon.status, 401);
  assert.equal((await anon.json()).authed, false);

  const cookie = await adminCookie(env);
  const authed = await call(auth.handleAuth, new Request("http://x/api/admin/me", { headers: { cookie } }), env);
  assert.equal(authed.status, 200);
  assert.deepEqual(await authed.json(), { authed: true, email: "owner@example.com" });
});

test("oauth start answers 503 unconfigured, else redirects with a state cookie", async () => {
  const bare = await call(auth.handleAuth, new Request("http://x/api/auth/google/start"), envWith(fakeDb()));
  assert.equal(bare.status, 503);

  const res = await call(auth.handleAuth, new Request("http://x/api/auth/google/start"), oauthEnv(fakeDb()));
  assert.equal(res.status, 302);
  assert.ok(res.headers.get("location").startsWith("https://accounts.google.com/"));
  const state = new URL(res.headers.get("location")).searchParams.get("state");
  assert.ok(res.headers.get("set-cookie").includes(`oma_oauth_state=${state}`), "state rides an HttpOnly cookie for the CSRF check");
});

test("oauth callback rejects a mismatched or missing CSRF state", async () => {
  const env = oauthEnv(fakeDb());
  for (const [qs, cookie] of [
    ["code=abc&state=st", "oma_oauth_state=other"],
    ["code=abc&state=st", undefined],
    ["state=st", "oma_oauth_state=st"], // no code
  ]) {
    const res = await call(auth.handleAuth, callbackReq(qs, cookie), env);
    assert.equal(res.status, 400, `${qs} / ${cookie}`);
  }
});

test("oauth callback rejects an ID token minted for a different app (aud check)", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = googleStubs({ aud: "someone-elses-client-id" });
  try {
    const res = await call(auth.handleAuth, callbackReq("code=abc&state=st", "oma_oauth_state=st"), oauthEnv(fakeDb()));
    assert.equal(res.status, 401, "a valid Google token from another app must not authenticate");
  } finally { globalThis.fetch = realFetch; }
});

test("oauth callback refuses a Google account outside the whitelist", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = googleStubs({ email: "stranger@example.com" });
  try {
    const res = await call(auth.handleAuth, callbackReq("code=abc&state=st", "oma_oauth_state=st"), oauthEnv(fakeDb()));
    assert.equal(res.status, 403);
    const html = await res.text();
    assert.ok(html.includes("stranger@example.com"), "the refusal page names the rejected account");
    assert.ok(!res.headers.get("set-cookie"), "no session for outsiders");
  } finally { globalThis.fetch = realFetch; }
});

test("oauth callback grants a session to a whitelisted, verified account", async () => {
  const db = fakeDb();
  const realFetch = globalThis.fetch;
  globalThis.fetch = googleStubs();
  try {
    const env = oauthEnv(db);
    const res = await call(auth.handleAuth, callbackReq("code=abc&state=st", "oma_oauth_state=st"), env);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/admin/");
    const setCookie = res.headers.get("set-cookie");
    assert.ok(setCookie.startsWith("oma_admin="), "session cookie issued");
    // 這顆 cookie 要真的能過 sessionEmail 驗證。
    const verify = new Request("http://x/", { headers: { cookie: setCookie.split(";")[0] } });
    assert.equal(await lib.sessionEmail(env, verify), "owner@example.com");
  } finally { globalThis.fetch = realFetch; }
});

test("an unverified email is rejected even when whitelisted", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = googleStubs({ verified: "false" });
  try {
    const res = await call(auth.handleAuth, callbackReq("code=abc&state=st", "oma_oauth_state=st"), oauthEnv(fakeDb()));
    assert.equal(res.status, 401);
  } finally { globalThis.fetch = realFetch; }
});

// --- Admin：每一條路由都要吃 401 -------------------------------------------

test("every admin route demands a session — table-driven", async () => {
  const routes = [
    ["GET", "/api/admin/catalog"],
    ["POST", "/api/admin/stones"],
    ["PUT", "/api/admin/stones/rose"],
    ["PUT", "/api/admin/stones/rose/sizes"],
    ["POST", "/api/admin/accessories"],
    ["PUT", "/api/admin/accessories/gold-hex"],
    ["POST", "/api/admin/photo/stone/rose"],
    ["PUT", "/api/admin/products/serene/p1"],
    ["PUT", "/api/admin/series/serene"],
    ["GET", "/api/admin/orders"],
    ["PUT", "/api/admin/orders/OMA-1/status"],
    ["PUT", "/api/admin/settings"],
  ];
  const env = envWith(fakeDb());
  for (const [method, path] of routes) {
    const req = new Request(`http://x${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "GET" ? undefined : "{}",
    });
    const res = await call(admin.handleAdmin, req, env);
    assert.equal(res?.status, 401, `${method} ${path} must 401 without a session`);
    assert.equal(env.DB.state.writes.length, 0, `${method} ${path} wrote without auth`);
  }
});

// --- 綠界：設定錯誤與重播 ---------------------------------------------------

test("a partially configured ECPay refuses to serve rather than fall back to test keys", async () => {
  const db = fakeDb();
  db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "pending" };
  const env = envWith(db, { ECPAY_MERCHANT_ID: "2000132" }); // 缺 HASH_KEY/IV
  const pay = await call(ecpay.handleEcpay, ecpayReq("/api/pay/ecpay", { order: "OMA-TEST01" }), env);
  assert.equal(pay.status, 503, "partial secrets = misconfigured, not silently test keys");
  const cb = await call(ecpay.handleEcpay, ecpayReq("/api/ecpay/return", await signedCallback(), true), env);
  assert.equal(await cb.text(), "0|CheckMacValue Error", "callbacks can't verify without a trusted key");
  assert.equal(db.state.writes.length, 0);
});

test("ecpay/return rejects a wrong merchant or a trade no from another order", async () => {
  const db = fakeDb();
  db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "pending" };
  const wrongMerchant = await call(ecpay.handleEcpay, ecpayReq("/api/ecpay/return", await signedCallback({ MerchantID: "9999999" }), true), envWith(db));
  assert.equal(await wrongMerchant.text(), "0|Unknown Merchant");
  const wrongTrade = await call(ecpay.handleEcpay, ecpayReq("/api/ecpay/return", await signedCallback({ MerchantTradeNo: "OMAOTHER99T1" }), true), envWith(db));
  assert.equal(await wrongTrade.text(), "0|Unknown Trade");
  assert.equal(db.state.writes.length, 0);
});

test("replaying a paid callback acks politely and the paid-flip stays guarded", async () => {
  const db = fakeDb();
  db.state.orderRow = { id: "OMA-TEST01", total: 4890, status: "paid" };
  const res = await call(ecpay.handleEcpay, ecpayReq("/api/ecpay/return", await signedCallback(), true), envWith(db));
  assert.equal(await res.text(), "1|OK", "ECPay must get an ack or it retries forever");
  for (const w of db.state.writes) {
    assert.ok(!w.sql.includes("SET status='paid'") || w.sql.includes("status='pending'"),
      "any paid-flip must carry the pending guard");
  }
});

// --- Worker 入口：health／quiz-lead／API 404 --------------------------------

const workerReq = (path, init) => worker.fetch(new Request(`https://shop.example${path}`, init), envWith(fakeDb({ stones: { rose: 260 } })));

test("health reports ok with a working DB and 503 (not 200) when it breaks", async () => {
  const ok = await workerReq("/api/health");
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).ok, true);

  const broken = await worker.fetch(new Request("https://x/api/health"), envWith({ prepare: () => { throw new Error("D1 exploded: secret detail"); } }));
  assert.equal(broken.status, 503, "monitors must see the failure");
  const body = await broken.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, undefined, "no internal error text on the public wire");
});

test("quiz-lead validates, stores, and rate-limits", async () => {
  const db = fakeDb();
  const env = envWith(db);
  const lead = (over = {}) => worker.fetch(new Request("https://x/api/quiz-lead", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "V", birthday: "1995-08-16", theme: "財富", email: "", stones: "白水晶", ...over }),
  }), env);
  assert.equal((await lead()).status, 201);
  assert.equal(db.state.writes.filter((w) => w.sql.startsWith("INSERT INTO quiz_leads")).length, 1);
  assert.equal((await lead({ birthday: "8月16日" })).status, 400);
  assert.equal((await lead({ email: "not-an-email" })).status, 400);
  // 每分鐘 5 次：前面已打 3 次，再 2 次後第 6 次要被擋。
  await lead(); await lead();
  assert.equal((await lead()).status, 429);
});

test("an unknown /api/ path answers JSON 404, never the SPA's HTML", async () => {
  const res = await workerReq("/api/no-such-thing");
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("content-type"), "application/json; charset=utf-8");
});

test("the /img route refuses path traversal", async () => {
  const res = await workerReq("/img/..%2F..%2Fsecrets.txt");
  assert.equal(res.status, 404);
});

// --- 限流器本體 -------------------------------------------------------------

test("the per-IP limiter counts per bucket+IP and frees other IPs", async () => {
  const reqFrom = (ip) => new Request("http://x/", { headers: { "cf-connecting-ip": ip } });
  for (let i = 0; i < 5; i++) assert.equal(lib.rateLimited(reqFrom("1.1.1.1"), "t", 5), false);
  assert.equal(lib.rateLimited(reqFrom("1.1.1.1"), "t", 5), true, "6th call inside the window is blocked");
  assert.equal(lib.rateLimited(reqFrom("2.2.2.2"), "t", 5), false, "another IP is unaffected");
  assert.equal(lib.rateLimited(reqFrom("1.1.1.1"), "other", 5), false, "another bucket is unaffected");
});
