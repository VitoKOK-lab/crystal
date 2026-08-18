import { useState } from "react";
import { putJson, runSave, type SeriesRow, type TabProps } from "./shared";

export function SeriesTab({ catalog, reload, notify }: TabProps) {
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
  const save = () => runSave(notify, reload, () => putJson(`/api/admin/series/${encodeURIComponent(row.id)}`, {
    name: form.name, en: form.en, active: form.active,
    tone: { ...tone, zh: form.name, en: form.en, tagline: form.tagline, craft: form.craft, theme: form.theme, banner: form.banner },
  }));
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
