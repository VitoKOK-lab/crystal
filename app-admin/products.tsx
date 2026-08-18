import { useState } from "react";
import { specTokenMM, splitSpecToken } from "../app/catalog";
import { putJson, runSave, type Catalog, type ProductRow, type TabProps } from "./shared";

// A finished piece has no stock of its own — it's buildable only while every
// component is in stock, which is what the storefront shows as 補貨中.
export function specShortages(spec: string, catalog: Catalog): string[] {
  const short: string[] = [];
  for (const token of spec.split(",").map((t) => t.trim()).filter(Boolean)) {
    const [id, size] = splitSpecToken(token);
    if (size) {
      const mm = specTokenMM(size);
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

export function Products({ catalog, reload, notify }: TabProps) {
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
    const [id, size] = splitSpecToken(token);
    if (size) {
      const stone = catalog.stones.find((s) => s.id === id);
      const mm = specTokenMM(size);
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
  const save = () => runSave(notify, reload, () => putJson(`/api/admin/products/${encodeURIComponent(product.series_id)}/${encodeURIComponent(product.id)}`, form));
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
