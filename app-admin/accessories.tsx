import { useState } from "react";
import { PhotoUpload, api, putJson, type AccessoryRow, type TabProps } from "./shared";

function NewAccessoryForm({ reload, notify, onDone }: { reload: () => void; notify: (m: string) => void; onDone: () => void }) {
  const [form, setForm] = useState({ id: "", zh: "", en: "", type: "spacer", metal: "gold", price: 120, stock: 20 });
  const create = async () => {
    try {
      await api("/api/admin/accessories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      notify("已建立。上傳照片後才會出現在前台");
      onDone();
      reload();
    } catch (e) { notify(`建立失敗：${(e as Error).message}`); }
  };
  return <div className="card"><div className="editor">
    <div className="grid">
      <label>代號（小寫英數與 -）<input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase() })} placeholder="initial-a" /></label>
      <label>名稱<input value={form.zh} onChange={(e) => setForm({ ...form, zh: e.target.value })} placeholder="字母吊飾 A" /></label>
      <label>英文名<input value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} placeholder="Initial A" /></label>
      <label>種類<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="spacer">隔珠</option><option value="charm">吊飾</option></select></label>
      <label>金屬色<select value={form.metal} onChange={(e) => setForm({ ...form, metal: e.target.value })}><option value="gold">金</option><option value="silver">銀</option></select></label>
      <label>價格<input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></label>
      <label>庫存<input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} /></label>
    </div>
    <div className="actions"><button onClick={onDone}>取消</button><button className="primary" onClick={create}>建立配件</button></div>
  </div></div>;
}

export function Accessories({ catalog, reload, notify }: TabProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  return <div className="list">
    <div className="actions"><button onClick={() => setCreating((v) => !v)}>{creating ? "收起" : "＋ 新增配件"}</button></div>
    {creating && <NewAccessoryForm reload={reload} notify={notify} onDone={() => setCreating(false)} />}
    {catalog.accessories.map((a) => <div key={a.id} className={`card ${a.active ? "" : "inactive"}`}>
      <button className="row" onClick={() => setOpen(open === a.id ? null : a.id)}>
        {a.photo ? <img src={a.photo} alt="" /> : <span className="no-photo">未上傳<br />照片</span>}
        <div><b>{a.zh}</b><small>{a.en} · {a.type === "charm" ? "吊飾" : "隔珠"}{a.photo ? "" : " · 前台隱藏中"}</small></div>
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
      await putJson(`/api/admin/accessories/${encodeURIComponent(acc.id)}`, form);
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
