import { useState } from "react";
import { PhotoUpload, putJson, type SizeRow, type StoneRow, type TabProps } from "./shared";

export function Stones({ catalog, reload, notify }: TabProps) {
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
      await putJson(`/api/admin/stones/${encodeURIComponent(stone.id)}`, { ...form, energies: JSON.parse(stone.energies) });
      await putJson(`/api/admin/stones/${encodeURIComponent(stone.id)}/sizes`, rows);
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
