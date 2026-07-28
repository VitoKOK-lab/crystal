"use client";

import { useEffect, useRef } from "react";

// Crystal thumbnails used purely for the showcase strip below the fold.
const SHOWCASE = [
  ["rose", "粉水晶", "愛與關係"],
  ["citrine", "黃水晶", "豐盛"],
  ["amethyst", "紫水晶", "守護"],
  ["aqua", "海藍寶", "療癒"],
  ["tiger", "虎眼石", "行動"],
  ["labradorite", "拉長石", "守護"],
  ["moon", "月光石", "療癒"],
  ["garnet", "石榴石", "行動"],
] as const;

const FEATURES = [
  { icon: "💎", title: "16 款天然水晶", body: "每一顆晶石都有獨特的能量屬性與紋理，從粉水晶到拉長石，任你自由組合。" },
  { icon: "⚡", title: "即時能量矩陣", body: "六維能量雷達即時運算——豐盛、愛情、療癒、守護、清晰、活力，設計看得見成效。" },
  { icon: "✨", title: "360° 實體手感", body: "自由翻轉、軟繩晃動、珠子碰撞出聲——下單前就能感受戴在手上的真實質地。" },
] as const;

const PRESET_TEASERS = [
  { icon: "💰", name: "金錢豐盛", body: "黃水晶＋虎眼石，招財聚氣" },
  { icon: "💗", name: "愛情桃花", body: "粉水晶＋薔薇輝石，溫柔靠近" },
  { icon: "🚀", name: "事業衝勁", body: "太陽石＋青金石，果斷前行" },
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
      <img src="/hero-banner.png" alt="OMA CRYSTAL 水晶手鍊配戴示意" />
      <div className="landing-hero-copy">
        <p>MAKE YOUR OWN ENERGY JEWELRY</p>
        <h1>WEAR YOUR<br />INTENTION</h1>
        <span>用天然水晶串出屬於你的能量手鍊，一顆一顆，都是自己的選擇。</span>
        <button className="landing-cta" onClick={onStart}>開始設計我的手鍊 <i>→</i></button>
      </div>
      <div className="landing-scroll-hint"><i /></div>
    </section>

    <section className="landing-features" data-reveal>
      <p className="landing-eyebrow">WHY OMA</p>
      <h2>不只是手鍊，是每天的儀式</h2>
      <div className="landing-feature-grid">
        {FEATURES.map((f) => <div className="landing-feature" key={f.title}>
          <span className="lf-icon">{f.icon}</span>
          <b>{f.title}</b>
          <p>{f.body}</p>
        </div>)}
      </div>
    </section>

    <section className="landing-presets" data-reveal>
      <p className="landing-eyebrow">ONE-TAP RECIPES</p>
      <h2>沒有靈感？試試一鍵能量配方</h2>
      <div className="landing-preset-grid">
        {PRESET_TEASERS.map((p) => <button className="landing-preset" key={p.name} onClick={onStart}>
          <span className="lp-icon">{p.icon}</span>
          <b>{p.name}</b>
          <p>{p.body}</p>
          <i>立即嘗試 →</i>
        </button>)}
      </div>
    </section>

    <section className="landing-showcase" data-reveal>
      <p className="landing-eyebrow">THE COLLECTION</p>
      <h2>16 款天然水晶，任你搭配</h2>
      <div className="landing-showcase-grid">
        {SHOWCASE.map(([id, zh, group]) => <div className="ls-item" key={id}>
          <img src={`/materials/${id}.png`} alt={zh} />
          <b>{zh}</b>
          <span>{group}</span>
        </div>)}
      </div>
    </section>

    <section className="landing-quote" data-reveal>
      <p>THE OMA ATELIER</p>
      <h2>多一份用心，<br />讓每天的配戴成為一次自我祝福。</h2>
      <button className="landing-cta light" onClick={onStart}>開始設計我的手鍊 <i>→</i></button>
    </section>

    <footer className="landing-footer">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <span>© {new Date().getFullYear() || 2026} OMA CRYSTAL · MAKE YOUR OWN ENERGY JEWELRY</span>
    </footer>
  </div>;
}
