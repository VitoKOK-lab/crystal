"use client";

import { useEffect, useRef } from "react";
import { stonePhotos } from "./catalog";
import { SERIES } from "./series";

// Crystal thumbnails used purely for the showcase strip below the fold.
// Paths come from the catalogue so men's-line and shared assets resolve
// correctly without this file tracking which lives where.
const SHOWCASE = [
  ["rose", "粉水晶", "愛情"],
  ["aqua", "海藍寶", "療癒"],
  ["amethyst", "紫水晶", "守護"],
  ["citrine", "黃水晶", "財富"],
  ["moon", "月光石", "療癒"],
  ["labradorite", "拉長石", "守護"],
  ["obsidian", "切面黑曜石", "守護"],
  ["tiger-eye", "切面虎眼石", "財富"],
  ["hematite", "切面赤鐵礦", "守護"],
  ["goldstone", "切面金沙石", "財富"],
  ["garnet", "石榴石", "力量"],
  ["lava", "圓珠消光火山岩", "力量"],
] as const;

const FEATURES = [
  { title: "8 大系列 · 96 款配置", body: "從綻放、澄澈到磐岩、疾行，每個系列 12 款事先配好的規格品，看上就能直接下單。" },
  { title: "細繩、正常、大顆任你選", body: "8mm 細繩款、10mm 正常款到 20mm 大顆款都有，21 款礦石與 37 款配件全系列共用。" },
  { title: "即時能量矩陣", body: "六維雷達即時運算——財富、愛情、療癒、守護、專注、力量，設計看得見成效。" },
] as const;

// Fades + lifts each [data-reveal] section in as it enters the viewport —
// a light touch of polish rather than a heavy animation framework.
function useScrollReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); } });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return rootRef;
}

export default function Home({ onStart, onShop }: { onStart: () => void; onShop: (seriesId?: string) => void }) {
  const rootRef = useScrollReveal();
  return <div className="landing" ref={rootRef}>
    <header className="landing-nav">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <div className="landing-nav-links">
        <button className="landing-nav-quiet" onClick={() => onShop()}>系列商品</button>
        <button className="landing-nav-cta" onClick={onStart}>開始設計</button>
      </div>
    </header>

    <section className="landing-hero" id="landing-top">
      <img src="/hero-banner.png" alt="OMA CRYSTAL 水晶手鍊配戴示意" />
      <div className="landing-hero-copy">
        <p>MAKE YOUR OWN ENERGY JEWELRY</p>
        <h1>WEAR YOUR<br />INTENTION</h1>
        <span>八個系列、96 款配好的規格品，女款男款共用同一個材料庫。挑一條直接帶走，或按「微客制」改成只屬於你的那條。</span>
        <div className="landing-hero-actions">
          <button className="landing-cta" onClick={() => onShop()}>逛系列商品 <i>→</i></button>
          <button className="landing-cta ghost" onClick={onStart}>從空白開始設計</button>
        </div>
      </div>
      <div className="landing-scroll-hint"><i /></div>
    </section>

    <section className="landing-series" data-reveal>
      <p className="landing-eyebrow">THE COLLECTIONS</p>
      <h2>八個系列，各有 12 款配置</h2>
      <span className="ls-note">每個系列有自己的主題與配法——有的全是 8mm 細繩，有的全用 20mm 大顆。可以直接下單，也可以進工作室繼續調整。</span>
      <div className="landing-series-grid">
        {SERIES.map((s) => <button
          className="lsr-card"
          key={s.id}
          style={{ "--series-accent": s.accent } as React.CSSProperties}
          onClick={() => onShop(s.id)}
        >
          <span className="lsr-banner">
            <img src={s.banner} alt="" />
            <img src={stonePhotos[s.swatch]} alt="" className="lsr-swatch" />
          </span>
          <span className="lsr-badge">{s.audience === "men" ? "男款" : "女款"}</span>
          <span className="lsr-theme">{s.theme}</span>
          <b>{s.zh}</b>
          <i>{s.en}</i>
          <p>{s.craft}</p>
          <span className="lsr-arrow">12 款配置 →</span>
        </button>)}
      </div>
    </section>

    <section className="landing-features" data-reveal>
      <div className="landing-features-head">
        <p className="landing-eyebrow">WHY OMA</p>
        <h2>不只是手鍊，<br />是每天的自我校準</h2>
      </div>
      <div className="landing-feature-list">
        {FEATURES.map((f, i) => <div className="landing-feature-row" key={f.title}>
          <span className="lf-index">{String(i + 1).padStart(2, "0")}</span>
          <div className="lf-body"><b>{f.title}</b><p>{f.body}</p></div>
        </div>)}
      </div>
    </section>

    <section className="landing-showcase" data-reveal>
      <p className="landing-eyebrow">THE MATERIALS</p>
      <h2>21 款天然礦石，全系列共用</h2>
      <div className="landing-showcase-grid">
        {SHOWCASE.map(([id, zh, group]) => <div className="ls-item" key={id}>
          <img src={stonePhotos[id]} alt={zh} />
          <b>{zh}</b>
          <span>{group}</span>
        </div>)}
      </div>
    </section>

    <section className="landing-quote" data-reveal>
      <p>THE OMA ATELIER</p>
      <h2>多一份克制，<br />讓每天的配戴成為一次自我校準。</h2>
      <button className="landing-cta light" onClick={() => onShop()}>逛系列商品 <i>→</i></button>
    </section>

    <footer className="landing-footer">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <span>© {new Date().getFullYear() || 2026} OMA CRYSTAL</span>
    </footer>
  </div>;
}
