"use client";

import { useEffect, useRef } from "react";

// Crystal thumbnails used purely for the showcase strip below the fold.
const SHOWCASE = [
  ["obsidian", "切面黑曜石", "守護"],
  ["tiger-eye", "切面虎眼石", "決斷"],
  ["hematite", "切面赤鐵礦", "意志"],
  ["smoky", "圓珠茶晶", "專注"],
  ["lava", "圓珠消光火山岩", "力量"],
  ["goldstone", "切面金沙石", "財富"],
  ["gold-hex", "金色六角框隔珠", "配件"],
  ["compass", "金色羅盤吊飾", "配件"],
] as const;

const FEATURES = [
  { title: "6 款硬核礦石", body: "從切面黑曜石到金沙石，圓潤與稜角並存，每一顆都禁得起近看。" },
  { title: "即時力量矩陣", body: "六維力量雷達即時運算——財富、意志、決斷、守護、專注、力量，設計看得見成效。" },
  { title: "360° 實體手感", body: "自由翻轉、軟繩晃動、珠子碰撞出聲——下單前就能感受戴在手上的真實重量。" },
] as const;

const PRESET_TEASERS = [
  { name: "力量掌控", body: "黑曜石＋消光火山岩，穩定爆發力", swatch: "obsidian" },
  { name: "財富機運", body: "金沙石＋虎眼石，果斷出擊", swatch: "goldstone" },
  { name: "決斷專注", body: "虎眼石＋茶晶，收束心緒", swatch: "tiger-eye" },
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

export default function Home({ onStart }: { onStart: () => void }) {
  const rootRef = useScrollReveal();
  return <div className="landing" ref={rootRef}>
    <header className="landing-nav">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <button className="landing-nav-cta" onClick={onStart}>開始設計</button>
    </header>

    <section className="landing-hero" id="landing-top">
      <img src="/men-hero.jpg" alt="OMA CRYSTAL 男性礦石手鍊配戴示意" />
      <div className="landing-hero-copy">
        <p>MEN'S COLLECTION</p>
        <h1>WEAR YOUR<br />DISCIPLINE</h1>
        <span>用礦石的重量與稜角，串出屬於你的沉靜力量。一顆一顆，都是自己的決定。</span>
        <button className="landing-cta" onClick={onStart}>開始設計我的手鍊 <i>→</i></button>
      </div>
      <div className="landing-scroll-hint"><i /></div>
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

    <section className="landing-presets" data-reveal>
      <p className="landing-eyebrow">ONE-TAP RECIPES</p>
      <h2>沒有靈感？試試一鍵力量配方</h2>
      <div className="landing-preset-list">
        {PRESET_TEASERS.map((p) => <button className="landing-preset" key={p.name} onClick={onStart}>
          <img src={`/materials/men/${p.swatch}.png`} alt="" className="lp-swatch" />
          <span className="lp-text"><b>{p.name}</b><i>{p.body}</i></span>
          <span className="lp-arrow">前往設計 →</span>
        </button>)}
      </div>
    </section>

    <section className="landing-showcase" data-reveal>
      <p className="landing-eyebrow">THE COLLECTION</p>
      <h2>6 款硬核礦石，任你搭配</h2>
      <div className="landing-showcase-grid">
        {SHOWCASE.map(([id, zh, group]) => <div className="ls-item" key={id}>
          <img src={`/materials/men/${id}.png`} alt={zh} />
          <b>{zh}</b>
          <span>{group}</span>
        </div>)}
      </div>
    </section>

    <section className="landing-quote" data-reveal>
      <p>THE OMA ATELIER</p>
      <h2>多一份克制，<br />讓每天的配戴成為一次自我校準。</h2>
      <button className="landing-cta light" onClick={onStart}>開始設計我的手鍊 <i>→</i></button>
    </section>

    <footer className="landing-footer">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <span>© {new Date().getFullYear() || 2026} OMA CRYSTAL · MEN'S COLLECTION</span>
    </footer>
  </div>;
}
