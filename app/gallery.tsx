"use client";

import { useMemo, useState } from "react";
import {
  ENERGY_META, byAccessory, byStone, dominantOf, energyScores, itemMM, itemPrice, parseSpec,
  pricing, topEnergiesOf, type DesignItem, type EnergyType,
} from "./catalog";
import { SERIES, designUses, type Product, type Series } from "./series";
import { BraceletThumb } from "./shop";

// 靈感藝廊：把八個系列的所有設計攤成一面牆，用我們的六能量當篩選，
// 每張卡帶真實的「被載入次數」。點開看逐顆材料明細（BOM），一鍵買下
// 或載進工作室改 — 靈感到轉換之間不再隔一層。
type Entry = {
  series: Series; product: Product; items: DesignItem[];
  price: number; dominant: (typeof ENERGY_META)[number]; uses: number; key: string;
};

// 每顆珠的小故事：石名（mm）— 最強能量與權重；配件標種類。成品描述
// 從組成資料自動生成，永遠和實際串進去的珠一致。
function bomLines(items: DesignItem[]) {
  const grouped = new Map<string, { item: DesignItem; qty: number }>();
  for (const it of items) {
    const k = `${it.kind}-${it.id}-${itemMM(it)}`;
    const g = grouped.get(k);
    if (g) g.qty += 1; else grouped.set(k, { item: it, qty: 1 });
  }
  return [...grouped.values()].map(({ item, qty }) => {
    if (item.kind === "stone") {
      const stone = byStone[item.id];
      const top = topEnergiesOf(stone, 1)[0];
      return { qty, unit: itemPrice(item), name: `${stone.zh}（${itemMM(item)}mm）`, story: `${top.zh}能量 ${stone.energy[top.key]}/10 · ${stone.note}` };
    }
    const acc = byAccessory[item.id];
    return { qty, unit: itemPrice(item), name: acc.zh, story: `${acc.type === "spacer" ? "精緻隔珠" : "垂墜吊飾"} · ${acc.note}` };
  });
}

export default function Gallery({ onBuy, onCustomize, onHome, onStudio }: {
  onBuy: (seriesId: string, productId: string) => void;
  onCustomize: (seriesId: string, productId: string) => void;
  onHome: () => void;
  onStudio: () => void;
}) {
  const [filter, setFilter] = useState<EnergyType | "all">("all");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const entries = useMemo<Entry[]>(() => SERIES.flatMap((series) => series.products.map((product) => {
    const items = parseSpec(product.spec);
    const key = `${series.id}/${product.id}`;
    return {
      series, product, items, key,
      price: items.reduce((sum, it) => sum + itemPrice(it), pricing.baseFee),
      dominant: dominantOf(energyScores(items)),
      uses: designUses[key] ?? 0,
    };
  })), []);

  const visible = entries
    .filter((e) => filter === "all" || e.dominant.key === filter)
    .sort((a, b) => b.uses - a.uses);
  const open = openKey ? entries.find((e) => e.key === openKey) : null;

  // 追蹤真實載入數：送出後不等待，直接進下一步。
  const track = (key: string) => { fetch("/api/track/use", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) }).catch(() => {}); };

  return <div className="gallery">
    <header className="shop-head">
      <button className="wordmark" onClick={onHome}>OMA <span>CRYSTAL</span></button>
      <div className="head-note">DESIGN GALLERY</div>
      <div className="head-actions"><button className="quiet" onClick={onStudio}>親手串一條 →</button></div>
    </header>

    <section className="shop-intro">
      <p className="landing-eyebrow">靈感藝廊</p>
      <h1>先看別人怎麼串，<br />再串成你的</h1>
      <span>全部設計皆可直接下單，或載入工作室換石、改長度。依你想補的能量挑一條開始。</span>
    </section>

    <div className="gal-filters" role="tablist" aria-label="依能量篩選">
      <button role="tab" aria-selected={filter === "all"} className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>全部</button>
      {ENERGY_META.map((m) => <button key={m.key} role="tab" aria-selected={filter === m.key} className={filter === m.key ? "on" : ""} style={{ "--chip": m.color } as React.CSSProperties} onClick={() => setFilter(m.key)}>{m.zh}</button>)}
    </div>

    <div className="gal-grid">
      {visible.map((e) => <article className="gal-card" key={e.key}>
        <button className="gal-open" onClick={() => setOpenKey(e.key)} aria-label={`看 ${e.product.name} 的材料明細`}>
          <BraceletThumb items={e.items} wrist={e.product.wrist} />
          <b>{e.product.name}</b>
          <small>{e.series.zh} · {e.series.en}</small>
          <span className="gal-meta">
            <em style={{ color: e.dominant.color }}>{e.dominant.zh}</em>
            {e.uses > 0 && <i>已被載入 {e.uses.toLocaleString()} 次</i>}
          </span>
          <span className="gal-price">NT$ {e.price.toLocaleString()}</span>
        </button>
      </article>)}
      {!visible.length && <div className="empty-library"><b>這個能量還沒有作品</b><span>換個篩選，或自己來串第一條。</span></div>}
    </div>

    {open && <div className="gal-modal-overlay" onClick={() => setOpenKey(null)}>
      <div className="gal-modal" onClick={(e) => e.stopPropagation()}>
        <button className="gal-close" onClick={() => setOpenKey(null)} aria-label="關閉">✕</button>
        <div className="gal-modal-vis"><BraceletThumb items={open.items} wrist={open.product.wrist} /></div>
        <div className="gal-modal-body">
          <p className="gal-eyebrow">{open.series.zh} · 手圍 {open.product.wrist} cm · 主能量 <b style={{ color: open.dominant.color }}>{open.dominant.zh}</b></p>
          <h2>{open.product.name}</h2>
          <span className="gal-tagline">{open.product.tagline}</span>
          <div className="gal-bom">
            {bomLines(open.items).map((l, i) => <div className="gal-bom-line" key={i}>
              <span className="gb-name">{l.name}<i>{l.story}</i></span>
              <span className="gb-qty">× {l.qty}</span>
              <b>NT$ {(l.unit * l.qty).toLocaleString()}</b>
            </div>)}
            <div className="gal-bom-line fee"><span className="gb-name">設計串製費</span><span /><b>NT$ {pricing.baseFee.toLocaleString()}</b></div>
            <div className="gal-bom-line total"><span className="gb-name">合計</span><span /><b>NT$ {open.price.toLocaleString()}</b></div>
          </div>
          <div className="gal-ctas">
            <button className="co-primary" onClick={() => { track(open.key); onBuy(open.series.id, open.product.id); }}>直接購買</button>
            <button className="co-secondary" onClick={() => { track(open.key); onCustomize(open.series.id, open.product.id); }}>載入工作室調整</button>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}
