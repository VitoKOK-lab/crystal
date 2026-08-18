import { useState } from "react";
import { ENERGY_META } from "../app/catalog";
import { PhotoUpload, postJson, putJson, runSave, type SizeRow, type StoneRow, type TabProps } from "./shared";

function NewStoneForm({ reload, notify, onDone }: { reload: () => void; notify: (m: string) => void; onDone: () => void }) {
  const [form, setForm] = useState({ id: "", zh: "", en: "", energy_zh: "", price: 300 });
  const create = async () => {
    if (await runSave(notify, reload, () => postJson("/api/admin/stones", form),
      { ok: "已建立。上傳照片後才會出現在前台", errPrefix: "建立失敗" })) onDone();
  };
  return <div className="card"><div className="editor">
    <div className="grid">
      <label>代號（小寫英數與 -）<input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase() })} placeholder="green-phantom" /></label>
      <label>名稱<input value={form.zh} onChange={(e) => setForm({ ...form, zh: e.target.value })} placeholder="綠幽靈" /></label>
      <label>英文名<input value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} placeholder="Green Phantom" /></label>
      <label>能量標籤<input value={form.energy_zh} onChange={(e) => setForm({ ...form, energy_zh: e.target.value })} placeholder="財富" /></label>
      <label>基礎價<input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></label>
    </div>
    <p className="dim">建立後預設 8/10/12mm 三個尺寸（庫存 0）與各能量 5/10，點開卡片即可調整、上傳照片。</p>
    <div className="actions"><button onClick={onDone}>取消</button><button className="primary" onClick={create}>建立礦石</button></div>
  </div></div>;
}

export function Stones({ catalog, reload, notify }: TabProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  return <div className="list">
    <div className="actions"><button onClick={() => setCreating((v) => !v)}>{creating ? "收起" : "＋ 新增礦石"}</button></div>
    {creating && <NewStoneForm reload={reload} notify={notify} onDone={() => setCreating(false)} />}
    {catalog.stones.map((s) => {
      const sizes = catalog.stoneSizes.filter((z) => z.stone_id === s.id);
      const totalStock = sizes.reduce((n, z) => n + z.stock, 0);
      return <div key={s.id} className={`card ${s.active ? "" : "inactive"}`}>
        <button className="row" onClick={() => setOpen(open === s.id ? null : s.id)}>
          {s.photo ? <img src={s.photo} alt="" /> : <span className="no-photo">未上傳<br />照片</span>}
          <div><b>{s.zh}</b><small>{s.en}{s.photo ? "" : " · 前台隱藏中"}</small></div>
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
  // 六維能量權重（0–10）：前台的能量分數、缺口推薦、生日測驗全都吃這組數字。
  const [energies, setEnergies] = useState<Record<string, number>>(() => {
    try { return JSON.parse(stone.energies); } catch { return { wealth: 5, love: 5, healing: 5, protection: 5, focus: 5, power: 5 }; }
  });
  const save = () => runSave(notify, reload, async () => {
    await putJson(`/api/admin/stones/${encodeURIComponent(stone.id)}`, { ...form, energies });
    await putJson(`/api/admin/stones/${encodeURIComponent(stone.id)}/sizes`, rows);
  });
  return <div className="editor">
    <div className="grid">
      <label>名稱<input value={form.zh} onChange={(e) => setForm({ ...form, zh: e.target.value })} /></label>
      <label>英文名<input value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label>
      <label>能量標籤<input value={form.energy_zh} onChange={(e) => setForm({ ...form, energy_zh: e.target.value })} /></label>
      <label>基礎價<input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></label>
    </div>
    <label>文案<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
    <div className="energy-grid">
      {ENERGY_META.map((m) => <label key={m.key}>
        <span style={{ color: m.color }}>{m.zh} {m.en}</span>
        <input type="number" min={0} max={10} value={energies[m.key] ?? 0}
          onChange={(e) => setEnergies({ ...energies, [m.key]: Math.max(0, Math.min(10, +e.target.value)) })} />
      </label>)}
    </div>
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
