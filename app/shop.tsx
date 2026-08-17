"use client";

import { useMemo, useState } from "react";
import { ItemVisual, accessories, closedLoopCapacityMM, dominantOf, energyScores, itemMM, itemPrice, layoutStrand, parseSpec, pricing, stones, type DesignItem } from "./catalog";
import { SERIES, STYLE_LABEL, bySeries, type Product } from "./series";

// A miniature of the real strand, using the studio's tangent-circle
// placement so a card can never show beads the build doesn't contain.
//
// One deliberate difference from the studio: beads are spread over the
// strand's own length rather than the wrist circumference, closing the loop.
// The studio leaves the unfilled arc visible on purpose — it's the "you have
// room for more" affordance — but the finished piece is strung on elastic and
// is a closed ring, so an open gap here would read as a broken product.
// `k` is solved per product so every thumbnail fills its box to the same 92%.
export function BraceletThumb({ items, wrist }: { items: DesignItem[]; wrist: number }) {
  // Ring size solved so the beads exactly close the loop under the arc
  // model (beads touch along chords) — a raw mm sum left large beads
  // overlapping at the seam.
  const strandMM = items.length ? closedLoopCapacityMM(items.map(itemMM)) : wrist * 10;
  const maxMM = Math.max(...items.map(itemMM), 1);
  const k = 92 / (strandMM / Math.PI + maxMM);
  const r = (strandMM / (Math.PI * 2)) * k;
  const placed = layoutStrand(items, strandMM).map(({ item: it, mm, angle, isCharm }, i) =>
    ({ key: it.uid ?? i, it, angle, sizePct: isCharm ? 11 : mm * k, orbit: isCharm ? r + 5 : r }));
  return <div className="shop-thumb" aria-hidden="true">
    <span className="st-string" style={{ left: `${50 - r}%`, top: `${50 - r}%`, width: `${r * 2}%`, height: `${r * 2}%` }} />
    {placed.map(({ key, it, angle, sizePct, orbit }) => <span
      key={key}
      className="st-bead"
      style={{
        left: `${50 + Math.cos(angle) * orbit}%`,
        top: `${50 + Math.sin(angle) * orbit}%`,
        width: `${sizePct}%`,
        height: `${sizePct}%`,
        transform: `translate(-50%,-50%) rotate(${(angle * 180) / Math.PI + 90}deg)`,
      }}
    ><ItemVisual item={it} /></span>)}
  </div>;
}

type Priced = { product: Product; items: DesignItem[]; price: number; dominant: ReturnType<typeof dominantOf>; beads: number };

// 實景情境照：AI 依每款的實際珠列生成、跟著品牌一致的棚拍語言（女款
// 奶油絲綢＋香檳暖光、男款深色石板＋硬朗側光）。檔名按 seriesId-productId
// 約定，onError 隱藏——後台新增的成品沒照片時卡片自動退回純縮圖。
const lookPhoto = (seriesId: string, productId: string) => `/materials/looks/${seriesId}-${productId}.jpg`;

export default function Shop({ seriesId, onSelectSeries, onBuy, onCustomize, onHome, onBlankStudio }: {
  seriesId: string;
  onSelectSeries: (id: string) => void;
  onBuy: (seriesId: string, productId: string) => void;
  onCustomize: (seriesId: string, productId: string) => void;
  onHome: () => void;
  onBlankStudio: () => void;
}) {
  const series = bySeries[seriesId] ?? SERIES[0];
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  // Price and dominant energy are derived from the same spec the buttons
  // build from, so a card can never advertise a figure the studio disagrees
  // with. Recomputed only when the series changes.
  const priced = useMemo<Priced[]>(() => series.products.map((product) => {
    const items = parseSpec(product.spec);
    return {
      product,
      items,
      price: items.reduce((sum, it) => sum + itemPrice(it), pricing.baseFee),
      dominant: dominantOf(energyScores(items)),
      beads: items.filter((x) => x.kind === "stone").length,
    };
  }), [series]);

  return <div className="shop" style={{ "--series-accent": series.accent } as React.CSSProperties}>
    <header className="shop-head">
      <button className="wordmark" onClick={onHome}>OMA <span>CRYSTAL</span></button>
      <div className="head-note">READY TO WEAR</div>
      <div className="head-actions"><button className="quiet" onClick={onBlankStudio}>親手串一條 →</button></div>
    </header>

    <section className="shop-intro">
      <p className="landing-eyebrow">THE COLLECTIONS</p>
      <h1>直接帶走，<br />或調成你的比例</h1>
      <span>八個系列，各四款，皆於工作室配置完成——同一系列之中，沒有兩款共用相同的結構與主石。看上即可下單；或按「微客制」進入工作室，更換礦石、長度與手圍。</span>
    </section>

    <div className="series-tabs" role="tablist" aria-label="Collections">
      {SERIES.map((s) => <button
        key={s.id}
        role="tab"
        aria-selected={s.id === series.id}
        className={`series-tab ${s.id === series.id ? "active" : ""}`}
        style={{ "--tab-accent": s.accent } as React.CSSProperties}
        onClick={() => onSelectSeries(s.id)}
      >
        <b>{s.zh}</b>
        <i>{s.en}</i>
        <em>{s.audience === "men" ? "男款" : "女款"}</em>
      </button>)}
    </div>

    <section className="series-banner" key={series.id}>
      <img src={series.banner} alt={`${series.zh} ${series.en} 系列`} />
      <div className="sb-copy">
        <p className="sb-theme">{series.theme}</p>
        <h2>{series.zh} <i>{series.en}</i></h2>
        <span className="sb-tagline">{series.tagline}</span>
        <span className="sb-craft">{series.craft}</span>
      </div>
    </section>

    <div className="shop-grid">
      {priced.map(({ product, items, price, dominant, beads }) => <article className="shop-card" key={product.id}>
        <div className="sc-visual">
          <button className="sc-look" onClick={() => setLightbox({ url: lookPhoto(series.id, product.id), name: product.name })} aria-label={`看「${product.name}」實景照`}>
            <img src={lookPhoto(series.id, product.id)} alt="" loading="lazy"
              onError={(e) => e.currentTarget.closest(".sc-visual")?.classList.add("no-look")} />
          </button>
          <BraceletThumb items={items} wrist={product.wrist} />
        </div>
        <div className="sc-body">
          <span className="sc-style">{STYLE_LABEL[product.style]}</span>
          <b className="sc-name">{product.name}</b>
          <span className="sc-tagline">{product.tagline}</span>
          <span className="sc-meta">
            <em style={{ color: dominant.color }}>{dominant.zh} {dominant.en}</em>
            <i>{beads} 顆礦石 · 手圍 {product.wrist} cm</i>
          </span>
          <span className="sc-price">NT$ {price.toLocaleString()}</span>
        </div>
        <div className="sc-actions">
          <button className="sc-buy" onClick={() => onBuy(series.id, product.id)}>直接購買</button>
          <button className="sc-custom" onClick={() => onCustomize(series.id, product.id)}>微客制</button>
        </div>
      </article>)}
    </div>

    {lightbox && <div className="look-overlay" role="dialog" aria-label={`${lightbox.name} 實景照`} onClick={() => setLightbox(null)}>
      <div className="look-box" onClick={(e) => e.stopPropagation()}>
        <button className="look-close" onClick={() => setLightbox(null)} aria-label="關閉">✕</button>
        <img src={lightbox.url} alt={`${lightbox.name} 實景照`} />
        <p><b>{lightbox.name}</b>・情境示意照，實際珠列以卡片上的配置圖為準</p>
      </div>
    </div>}

    <section className="shop-foot">
      <h2>都還不夠像你？</h2>
      <span>{stones.length} 種天然礦石、{accessories.length} 款隔珠與吊飾，全數開放。從一顆開始就好，其餘慢慢來。</span>
      <button className="landing-cta" onClick={onBlankStudio}>親手串一條 <i>→</i></button>
    </section>
  </div>;
}
