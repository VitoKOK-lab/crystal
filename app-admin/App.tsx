import { useEffect, useState } from "react";

// 後台管理（Phase 2 第一批）：材質庫（礦石/配件）＋全站設定。
// 成品/系列/訂單管理在第二批。

type StoneRow = { id: string; zh: string; en: string; energy_zh: string; price: number; note: string; energies: string; photo: string; active: number };
type SizeRow = { stone_id: string; mm: number; price_delta: number; stock: number; active: number };
type AccessoryRow = { id: string; zh: string; en: string; type: string; metal: string; price: number; note: string; photo: string; stock: number; active: number };
type Catalog = { stones: StoneRow[]; stoneSizes: SizeRow[]; accessories: AccessoryRow[]; settings: Record<string, string> };

const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
};

export default function App() {
  const [me, setMe] = useState<{ authed: boolean; email?: string; oauthReady?: boolean } | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState<"stones" | "accessories" | "settings">("stones");
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
        <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>設定</button>
      </nav>
      <span className="dim">{me.email}</span>
      <a href="/api/auth/logout">登出</a>
    </header>
    {!catalog ? <p className="pad">載入中…</p> : <>
      {tab === "stones" && <Stones catalog={catalog} reload={reload} notify={notify} />}
      {tab === "accessories" && <Accessories catalog={catalog} reload={reload} notify={notify} />}
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
