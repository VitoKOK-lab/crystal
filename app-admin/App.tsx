import { useEffect, useState } from "react";

// 後台管理（Phase 2 第一批）：材質庫（礦石/配件）＋全站設定。
// 成品/系列/訂單管理在第二批。

type StoneRow = { id: string; zh: string; en: string; energy_zh: string; price: number; note: string; energies: string; photo: string; active: number };
type SizeRow = { stone_id: string; mm: number; price_delta: number; stock: number; active: number };
type AccessoryRow = { id: string; zh: string; en: string; type: string; metal: string; price: number; note: string; photo: string; stock: number; active: number };
type SeriesRow = { id: string; name: string; en: string; tone: string; active: number };
type ProductRow = { id: string; series_id: string; name: string; tagline: string; style: string; wrist: number; spec: string; active: number };
type OrderRow = { id: string; created_at: string; status: string; name: string; phone: string; email: string; address: string; items: string; total: number; ref_code: string };
type Catalog = {
  stones: StoneRow[]; stoneSizes: SizeRow[]; accessories: AccessoryRow[];
  series: SeriesRow[]; products: ProductRow[]; settings: Record<string, string>;
};

// The storefront's spec notation: "<id>.<size>" for stones — either a
// legacy letter (x/l/s = 20/10/8 mm) or a plain number for admin-defined
// sizes — and a bare id for accessories. Mirrors catalog.tsx.
const SPEC_MM: Record<string, number> = { x: 20, l: 10, s: 8 };
const tokenMM = (size: string) => (/^\d+(\.\d+)?$/.test(size) ? Number(size) : SPEC_MM[size] ?? 10);

// A finished piece has no stock of its own — it's buildable only while every
// component is in stock, which is what the storefront shows as 補貨中.
function specShortages(spec: string, catalog: Catalog): string[] {
  const short: string[] = [];
  for (const token of spec.split(",").map((t) => t.trim()).filter(Boolean)) {
    const [id, size] = token.split(".");
    if (size) {
      const mm = tokenMM(size);
      const row = catalog.stoneSizes.find((z) => z.stone_id === id && z.mm === mm);
      const stone = catalog.stones.find((s) => s.id === id);
      if (!stone?.active) short.push(`${stone?.zh ?? id}（已下架）`);
      else if (!row || row.stock <= 0) short.push(`${stone.zh} ${mm}mm`);
    } else {
      const acc = catalog.accessories.find((a) => a.id === id);
      if (!acc?.active) short.push(`${acc?.zh ?? id}（已下架）`);
      else if (acc.stock <= 0) short.push(acc.zh);
    }
  }
  return [...new Set(short)];
}

const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
};

export default function App() {
  const [me, setMe] = useState<{ authed: boolean; email?: string; oauthReady?: boolean } | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState<"stones" | "accessories" | "products" | "series" | "orders" | "settings">("stones");
  const [toast, setToast] = useState("");

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2600); };
  const reload = () => api("/api/admin/catalog").then(setCatalog).catch((e) => notify(`載入失敗：${e.message}`));

  useEffect(() => {
    fetch("/api/admin/me").then(async (r) => {
      const d = await r.json();
      setMe(d);
      if (d.authed) reload();
    }).catch(() => setMe({ authed: false }));
  }, []);

  if (!me) return <div className="gate"><p>載入中…</p></div>;
  if (!me.authed) {
    return <div className="gate">
      <h1>OMA CRYSTAL 後台</h1>
      {me.oauthReady
        ? <a className="google-btn" href="/api/auth/google/start">使用 Google 帳號登入</a>
        : <p className="dim">Google 登入尚未設定完成（缺 GOOGLE_CLIENT_ID / SECRET）。</p>}
    </div>;
  }

  return <div className="admin">
    <header>
      <b>OMA CRYSTAL 後台</b>
      <nav>
        <button className={tab === "stones" ? "on" : ""} onClick={() => setTab("stones")}>礦石</button>
        <button className={tab === "accessories" ? "on" : ""} onClick={() => setTab("accessories")}>配件</button>
        <button className={tab === "products" ? "on" : ""} onClick={() => setTab("products")}>成品</button>
        <button className={tab === "series" ? "on" : ""} onClick={() => setTab("series")}>系列</button>
        <button className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}>訂單</button>
        <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>設定</button>
      </nav>
      <span className="dim">{me.email}</span>
      <a href="/api/auth/logout">登出</a>
    </header>
    {!catalog ? <p className="pad">載入中…</p> : <>
      {tab === "stones" && <Stones catalog={catalog} reload={reload} notify={notify} />}
      {tab === "accessories" && <Accessories catalog={catalog} reload={reload} notify={notify} />}
      {tab === "products" && <Products catalog={catalog} reload={reload} notify={notify} />}
      {tab === "series" && <SeriesTab catalog={catalog} reload={reload} notify={notify} />}
      {tab === "orders" && <Orders notify={notify} />}
      {tab === "settings" && <Settings catalog={catalog} reload={reload} notify={notify} />}
    </>}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function PhotoUpload({ kind, id, notify, reload }: { kind: "stone" | "accessory"; id: string; notify: (m: string) => void; reload: () => void }) {
  return <label className="upload">
    換照片
    <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        await api(`/api/admin/photo/${kind}/${encodeURIComponent(id)}`, { method: "POST", headers: { "content-type": f.type }, body: f });
        notify("照片已更新，前台一分鐘內生效");
        reload();
      } catch (err) { notify(`上傳失敗：${(err as Error).message}`); }
      e.target.value = "";
    }} />
  </label>;
}

function Stones({ catalog, reload, notify }: { catalog: Catalog; reload: () => void; notify: (m: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return <div className="list">
    {catalog.stones.map((s) => {
      const sizes = catalog.stoneSizes.filter((z) => z.stone_id === s.id);
      const totalStock = sizes.reduce((n, z) => n + z.stock, 0);
      return <div key={s.id} className={`card ${s.active ? "" : "inactive"}`}>
        <button className="row" onClick={() => setOpen(open === s.id ? null : s.id)}>
          <img src={s.photo} alt="" />
          <div><b>{s.zh}</b><small>{s.en}</small></div>
          <div className="meta">NT$ {s.price}<small>庫存 {totalStock} 顆{s.active ? "" : " · 已下架"}</small></div>
        </button>
        {open === s.id && <StoneEditor stone={s} sizes={sizes} reload={reload} notify={notify} />}
      </div>;
    })}
  </div>;
}

function StoneEditor({ stone, sizes, reload, notify }: { stone: StoneRow; sizes: SizeRow[]; reload: () => void; notify: (m: string) => void }) {
  const [form, setForm] = useState({ zh: stone.zh, en: stone.en, energy_zh: stone.energy_zh, price: stone.price, note: stone.note, active: stone.active });
  const [rows, setRows] = useState(sizes.map((z) => ({ mm: z.mm, price_delta: z.price_delta, stock: z.stock })));
  const save = async () => {
    try {
      await api(`/api/admin/stones/${encodeURIComponent(stone.id)}`, {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, energies: JSON.parse(stone.energies) }),
      });
      await api(`/api/admin/stones/${encodeURIComponent(stone.id)}/sizes`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(rows),
      });
      notify("已儲存，前台一分鐘內生效");
      reload();
    } catch (e) { notify(`儲存失敗：${(e as Error).message}`); }
  };
  return <div className="editor">
    <div className="grid">
      <label>名稱<input value={form.zh} onChange={(e) => setForm({ ...form, zh: e.target.value })} /></label>
      <label>英文名<input value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label>
      <label>能量標籤<input value={form.energy_zh} onChange={(e) => setForm({ ...form, energy_zh: e.target.value })} /></label>
      <label>基礎價<input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></label>
    </div>
    <label>文案<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
    <table>
      <thead><tr><th>尺寸 mm</th><th>加價</th><th>庫存（顆）</th><th /></tr></thead>
      <tbody>
        {rows.map((r, i) => <tr key={i}>
          <td><input type="number" min={1} step={0.5} value={r.mm} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, mm: +e.target.value } : x))} /></td>
          <td><input type="number" min={0} value={r.price_delta} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, price_delta: +e.target.value } : x))} /></td>
          <td><input type="number" min={0} value={r.stock} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, stock: +e.target.value } : x))} /></td>
          <td>{rows.length > 1 && <button className="x" onClick={() => setRows(rows.filter((_, j) => j !== i))}>移除</button>}</td>
        </tr>)}
      </tbody>
    </table>
    <div className="actions">
      <button onClick={() => setRows([...rows, { mm: 12, price_delta: 100, stock: 0 }])}>＋新增尺寸</button>
      <PhotoUpload kind="stone" id={stone.id} notify={notify} reload={reload} />
      <label className="chk"><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })} />上架中</label>
      <button className="primary" onClick={save}>儲存</button>
    </div>
  </div>;
}

function Accessories({ catalog, reload, notify }: { catalog: Catalog; reload: () => void; notify: (m: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return <div className="list">
    {catalog.accessories.map((a) => <div key={a.id} className={`card ${a.active ? "" : "inactive"}`}>
      <button className="row" onClick={() => setOpen(open === a.id ? null : a.id)}>
        <img src={a.photo} alt="" />
        <div><b>{a.zh}</b><small>{a.en} · {a.type === "charm" ? "吊飾" : "隔珠"}</small></div>
        <div className="meta">NT$ {a.price}<small>庫存 {a.stock} 個{a.active ? "" : " · 已下架"}</small></div>
      </button>
      {open === a.id && <AccessoryEditor acc={a} reload={reload} notify={notify} />}
    </div>)}
  </div>;
}

function AccessoryEditor({ acc, reload, notify }: { acc: AccessoryRow; reload: () => void; notify: (m: string) => void }) {
  const [form, setForm] = useState({ zh: acc.zh, en: acc.en, type: acc.type, metal: acc.metal, price: acc.price, note: acc.note, stock: acc.stock, active: acc.active });
  const save = async () => {
    try {
      await api(`/api/admin/accessories/${encodeURIComponent(acc.id)}`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form),
      });
      notify("已儲存，前台一分鐘內生效");
      reload();
    } catch (e) { notify(`儲存失敗：${(e as Error).message}`); }
  };
  return <div className="editor">
    <div className="grid">
      <label>名稱<input value={form.zh} onChange={(e) => setForm({ ...form, zh: e.target.value })} /></label>
      <label>英文名<input value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label>
      <label>價格<input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></label>
      <label>庫存（個）<input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} /></label>
    </div>
    <label>文案<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
    <div className="actions">
      <PhotoUpload kind="accessory" id={acc.id} notify={notify} reload={reload} />
      <label className="chk"><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })} />上架中</label>
      <button className="primary" onClick={save}>儲存</button>
    </div>
  </div>;
}

function Products({ catalog, reload, notify }: { catalog: Catalog; reload: () => void; notify: (m: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return <div className="list">
    {catalog.series.map((s) => <div key={s.id}>
      <h3 className="group">{s.name} <small>{s.en}</small></h3>
      {catalog.products.filter((p) => p.series_id === s.id).map((p) => {
        const key = `${p.series_id}/${p.id}`;
        const short = specShortages(p.spec, catalog);
        return <div key={key} className={`card ${p.active ? "" : "inactive"}`}>
          <button className="row" onClick={() => setOpen(open === key ? null : key)}>
            <div><b>{p.name}</b><small>{p.tagline}</small></div>
            <div className="meta">手圍 {p.wrist} cm
              <small className={short.length ? "warn" : ""}>{short.length ? `補貨中 · 缺 ${short.length} 項` : "可製作"}</small>
            </div>
          </button>
          {open === key && <ProductEditor product={p} shortages={short} catalog={catalog} reload={reload} notify={notify} />}
        </div>;
      })}
    </div>)}
  </div>;
}

// A bracelet's composition is a strand of beads, so the editor shows it as
// one: real photos in order, click to add, ✕ to remove, arrows to move.
// The spec string it produces is unchanged — the storefront and share links
// keep reading exactly what they always did — but nobody has to type
// "rose.x,rose.l,silver-round" by hand any more.
const SPEC_ACCESSORY_MM = { spacer: 5, charm: 3 };

function SpecEditor({ catalog, spec, onChange, wrist }: { catalog: Catalog; spec: string; onChange: (s: string) => void; wrist: number }) {
  const [picking, setPicking] = useState<"stone" | "spacer" | "charm" | null>(null);
  const tokens = spec.split(",").map((t) => t.trim()).filter(Boolean);

  const describe = (token: string) => {
    const [id, size] = token.split(".");
    if (size) {
      const stone = catalog.stones.find((s) => s.id === id);
      const mm = tokenMM(size);
      return { photo: stone?.photo ?? "", name: stone?.zh ?? id, detail: `${mm}mm`, mm, missing: !stone };
    }
    const acc = catalog.accessories.find((a) => a.id === id);
    return {
      photo: acc?.photo ?? "", name: acc?.zh ?? id,
      detail: acc?.type === "charm" ? "吊飾" : "隔珠",
      mm: SPEC_ACCESSORY_MM[(acc?.type as keyof typeof SPEC_ACCESSORY_MM) ?? "spacer"],
      missing: !acc,
      // Charms hang off the cord rather than sitting in the line of beads —
      // the editor mirrors that so the row reads like the finished piece.
      charm: acc?.type === "charm",
    };
  };

  const set = (next: string[]) => onChange(next.join(","));
  const move = (i: number, by: number) => {
    const next = [...tokens];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  const strandMM = tokens.reduce((sum, t) => sum + describe(t).mm, 0);
  const capacity = wrist * 10;
  const fill = capacity ? Math.round((strandMM / capacity) * 100) : 0;

  return <div className="spec">
    <div className="spec-head">
      <span>組成（{tokens.length} 件）</span>
      <b className={fill > 100 ? "warn" : ""}>{(strandMM / 10).toFixed(1)} / {wrist} cm · {fill}%</b>
    </div>
    <div className="strand">
      {tokens.map((t, i) => {
        const d = describe(t);
        return <div key={`${t}-${i}`} className={`bead ${d.missing ? "missing" : ""} ${d.charm ? "charm" : ""}`} title={d.missing ? `找不到素材：${t}` : `${d.name} ${d.detail}`}>
          {d.photo ? <img src={d.photo} alt="" /> : <span className="qmark">?</span>}
          <em>{d.detail}</em>
          <div className="bead-tools">
            <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="往前">‹</button>
            <button onClick={() => set(tokens.filter((_, j) => j !== i))} className="del" aria-label="移除">✕</button>
            <button onClick={() => move(i, 1)} disabled={i === tokens.length - 1} aria-label="往後">›</button>
          </div>
        </div>;
      })}
      <div className="add-slot">
        <button onClick={() => setPicking(picking ? null : "stone")}>＋<span>加素材</span></button>
      </div>
    </div>
    {picking && <div className="picker">
      <div className="picker-tabs">
        {([["stone", "礦石"], ["spacer", "隔珠"], ["charm", "吊飾"]] as const).map(([k, label]) =>
          <button key={k} className={picking === k ? "on" : ""} onClick={() => setPicking(k)}>{label}</button>)}
        <button className="close" onClick={() => setPicking(null)}>收起</button>
      </div>
      <div className="picker-grid">
        {picking === "stone"
          ? catalog.stones.filter((s) => s.active).map((s) => {
            const ladder = catalog.stoneSizes.filter((z) => z.stone_id === s.id && z.active).sort((a, b) => a.mm - b.mm);
            const sizes = ladder.length ? ladder : [{ mm: 8 }, { mm: 10 }, { mm: 20 }].map((z) => ({ ...z, stone_id: s.id, stock: 0, price_delta: 0, active: 1 }));
            return <div className="pick" key={s.id}>
              <img src={s.photo} alt="" /><b>{s.zh}</b>
              <div className="pick-sizes">{sizes.map((z) => {
                const out = "stock" in z && z.stock <= 0;
                return <button key={z.mm} className={out ? "out" : ""} title={out ? "此尺寸目前無庫存" : ""}
                  onClick={() => set([...tokens, `${s.id}.${z.mm}`])}>{z.mm}</button>;
              })}</div>
            </div>;
          })
          : catalog.accessories.filter((a) => a.active && a.type === picking).map((a) => <button className="pick" key={a.id} onClick={() => set([...tokens, a.id])}>
            <img src={a.photo} alt="" /><b>{a.zh}</b><em className={a.stock <= 0 ? "warn" : ""}>{a.stock <= 0 ? "無庫存" : `庫存 ${a.stock}`}</em>
          </button>)}
      </div>
    </div>}
    <details className="raw">
      <summary>進階：直接編輯代碼</summary>
      <textarea className="mono" value={spec} onChange={(e) => onChange(e.target.value)} />
    </details>
  </div>;
}

function ProductEditor({ product, shortages, catalog, reload, notify }: { product: ProductRow; shortages: string[]; catalog: Catalog; reload: () => void; notify: (m: string) => void }) {
  const [form, setForm] = useState({ name: product.name, tagline: product.tagline, style: product.style, wrist: product.wrist, spec: product.spec, active: product.active });
  const save = async () => {
    try {
      await api(`/api/admin/products/${encodeURIComponent(product.series_id)}/${encodeURIComponent(product.id)}`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form),
      });
      notify("已儲存，前台一分鐘內生效");
      reload();
    } catch (e) { notify(`儲存失敗：${(e as Error).message}`); }
  };
  return <div className="editor">
    <div className="grid">
      <label>名稱<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label>手圍 cm<input type="number" min={10} max={22} step={0.5} value={form.wrist} onChange={(e) => setForm({ ...form, wrist: +e.target.value })} /></label>
      <label>版型
        <select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>
          {["focal", "duo", "uniform", "delicate", "chunky", "graduated"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </div>
    <label>文案<textarea value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></label>
    <SpecEditor catalog={catalog} spec={form.spec} onChange={(spec) => setForm({ ...form, spec })} wrist={form.wrist} />
    {shortages.length > 0 && <p className="warn">缺料：{shortages.join("、")} — 前台會顯示補貨中</p>}
    <div className="actions">
      <label className="chk"><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })} />上架中</label>
      <button className="primary" onClick={save}>儲存</button>
    </div>
  </div>;
}

function SeriesTab({ catalog, reload, notify }: { catalog: Catalog; reload: () => void; notify: (m: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return <div className="list">
    {catalog.series.map((s) => <div key={s.id} className={`card ${s.active ? "" : "inactive"}`}>
      <button className="row" onClick={() => setOpen(open === s.id ? null : s.id)}>
        <div><b>{s.name}</b><small>{s.en}</small></div>
        <div className="meta">{catalog.products.filter((p) => p.series_id === s.id).length} 款<small>{s.active ? "" : "已下架"}</small></div>
      </button>
      {open === s.id && <SeriesEditor row={s} reload={reload} notify={notify} />}
    </div>)}
  </div>;
}

function SeriesEditor({ row, reload, notify }: { row: SeriesRow; reload: () => void; notify: (m: string) => void }) {
  // The tone blob holds the storefront's copy (tagline, craft note, accent,
  // banner path). Edited as fields, saved back as the same JSON shape.
  const tone = JSON.parse(row.tone) as Record<string, unknown>;
  const [form, setForm] = useState({
    name: row.name, en: row.en, active: row.active,
    tagline: String(tone.tagline ?? ""), craft: String(tone.craft ?? ""),
    theme: String(tone.theme ?? ""), banner: String(tone.banner ?? ""),
  });
  const save = async () => {
    try {
      await api(`/api/admin/series/${encodeURIComponent(row.id)}`, {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name, en: form.en, active: form.active,
          tone: { ...tone, zh: form.name, en: form.en, tagline: form.tagline, craft: form.craft, theme: form.theme, banner: form.banner },
        }),
      });
      notify("已儲存，前台一分鐘內生效");
      reload();
    } catch (e) { notify(`儲存失敗：${(e as Error).message}`); }
  };
  return <div className="editor">
    <div className="grid">
      <label>系列名<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label>英文名<input value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label>
      <label>主題<input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></label>
      <label>Banner 路徑<input value={form.banner} onChange={(e) => setForm({ ...form, banner: e.target.value })} /></label>
    </div>
    <label>標語<textarea value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></label>
    <label>工藝說明<textarea value={form.craft} onChange={(e) => setForm({ ...form, craft: e.target.value })} /></label>
    <div className="actions">
      <label className="chk"><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })} />上架中</label>
      <button className="primary" onClick={save}>儲存</button>
    </div>
  </div>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "待付款", paid: "已付款", making: "製作中", shipped: "已出貨", done: "完成", cancelled: "已取消",
};

function Orders({ notify }: { notify: (m: string) => void }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = () => api("/api/admin/orders").then((d) => setOrders(d.orders)).catch((e) => notify(`載入失敗：${e.message}`));
  useEffect(() => { load(); }, []);
  if (!orders) return <p className="pad">載入中…</p>;
  if (!orders.length) return <p className="pad dim">目前沒有訂單。（訂單系統與金流會在下一階段上線，屆時客人下單就會出現在這裡）</p>;
  return <div className="list">
    {orders.map((o) => <div key={o.id} className="card">
      <button className="row" onClick={() => setOpen(open === o.id ? null : o.id)}>
        <div><b>{o.id}</b><small>{o.created_at} · {o.name}</small></div>
        <div className="meta">NT$ {o.total.toLocaleString()}<small>{STATUS_LABEL[o.status] ?? o.status}</small></div>
      </button>
      {open === o.id && <div className="editor">
        <p>{o.name}．{o.phone}．{o.email}</p>
        <p>{o.address}</p>
        {o.ref_code && <p className="dim">推薦碼：{o.ref_code}</p>}
        <pre className="mono small">{o.items}</pre>
        <div className="actions">
          <label>狀態
            <select value={o.status} onChange={async (e) => {
              try {
                await api(`/api/admin/orders/${encodeURIComponent(o.id)}/status`, {
                  method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: e.target.value }),
                });
                notify("狀態已更新");
                load();
              } catch (err) { notify(`更新失敗：${(err as Error).message}`); }
            }}>
              {Object.entries(STATUS_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>}
    </div>)}
  </div>;
}

function Settings({ catalog, reload, notify }: { catalog: Catalog; reload: () => void; notify: (m: string) => void }) {
  const [form, setForm] = useState({
    base_fee: catalog.settings.base_fee ?? "680",
    shipping_fee: catalog.settings.shipping_fee ?? "120",
    free_shipping_over: catalog.settings.free_shipping_over ?? "3000",
  });
  const save = async () => {
    try {
      await api("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      notify("已儲存");
      reload();
    } catch (e) { notify(`儲存失敗：${(e as Error).message}`); }
  };
  return <div className="editor pad">
    <div className="grid">
      <label>基本工費 NT$<input type="number" min={0} value={form.base_fee} onChange={(e) => setForm({ ...form, base_fee: e.target.value })} /></label>
      <label>運費 NT$<input type="number" min={0} value={form.shipping_fee} onChange={(e) => setForm({ ...form, shipping_fee: e.target.value })} /></label>
      <label>免運門檻 NT$<input type="number" min={0} value={form.free_shipping_over} onChange={(e) => setForm({ ...form, free_shipping_over: e.target.value })} /></label>
    </div>
    <p className="dim">（提醒：結帳頁採用這些設定的功能會在訂單系統上線時一起生效）</p>
    <div className="actions"><button className="primary" onClick={save}>儲存</button></div>
  </div>;
}
