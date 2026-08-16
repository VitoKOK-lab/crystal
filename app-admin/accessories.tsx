import { useState } from "react";
import { PhotoUpload, putJson, type AccessoryRow, type TabProps } from "./shared";

export function Accessories({ catalog, reload, notify }: TabProps) {
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
