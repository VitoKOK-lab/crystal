"use client";

import { useEffect, useRef } from "react";

// The six original men's-line materials have dedicated AI-generated photos
// under /materials/men/; every material merged in from the female library
// reuses the shared photos already published at /materials/ root.
const MEN_ONLY_PHOTO_IDS = new Set(["obsidian", "tiger-eye", "hematite", "smoky", "lava", "goldstone", "gold-hex", "silver-hex", "compass", "arrow"]);
const photoPath = (id: string) => MEN_ONLY_PHOTO_IDS.has(id) ? `/materials/men/${id}.png` : `/materials/${id}.png`;

// Crystal thumbnails used purely for the showcase strip below the fold.
const SHOWCASE = [
  ["obsidian", "切面黑曜石", "守護"],
  ["tiger-eye", "切面虎眼石", "決斷"],
  ["hematite", "切面赤鐵礦", "意志"],
  ["smoky", "圓珠茶晶", "專注"],
  ["lava", "圓珠消光火山岩", "力量"],
  ["goldstone", "切面金沙石", "財富"],
  ["garnet", "石榴石", "力量"],
  ["lapis", "青金石", "決斷"],
  ["labradorite", "拉長石", "守護"],
  ["sunstone", "太陽石", "力量"],
  ["gold-hex", "金色六角框隔珠", "配件"],
  ["compass", "金色羅盤吊飾", "配件"],
] as const;

const FEATURES = [
  { title: "21 款天然礦石", body: "從切面黑曜石到石榴石，圓潤與稜角並存，普通、稀有、傳說三種稀有度任你搭配。" },
  { title: "即時力量矩陣", body: "六維力量雷達即時運算——財富、意志、決斷、守護、專注、力量，設計看得見成效。" },
  { title: "360° 實體手感", body: "自由翻轉、軟繩晃動、珠子碰撞出聲——下單前就能感受戴在手上的真實重量。" },
] as const;

const PRESET_TEASERS = [
  { name: "力量掌控", body: "黑曜石＋消光火山岩，穩定爆發力", swatch: "obsidian" },
  { name: "財富機運", body: "金沙石＋虎眼石，果斷出擊", swatch: "goldstone" },
  { name: "決斷專注", body: "虎眼石＋茶晶，收束心緒", swatch: "tiger-eye" },
] as const;

// Curated build codes in the same `?d=` share-link format the studio already
// reads — clicking one decodes straight into a fully-built bracelet. These
// are hand-picked by us, not a live/ranked leaderboard (this is a static
// site with no backend to track real orders), so the copy below says
// "精選打造" rather than claiming anything is actually trending.
const SHOWCASE_BUILDS = [
  { name: "極夜守護者", tag: "守護 PROTECTION", swatch: "obsidian", code: "16|obsidian.x,obsidian.l,obsidian.l,obsidian.l,obsidian.l,obsidian.l,obsidian.l,hematite.l,hematite.l,hematite.l,silver-hex,silver-hex,obsidian.s,obsidian.s,obsidian.s,obsidian.s,travel-compass" },
  { name: "決斷投資客", tag: "財富 WEALTH", swatch: "goldstone", code: "16.5|goldstone.x,goldstone.l,goldstone.l,goldstone.l,goldstone.l,goldstone.l,tiger-eye.l,tiger-eye.l,tiger-eye.l,tiger-eye.l,citrine.l,citrine.l,gold-hex,gold-hex,citrine.s,citrine.s,compass" },
  { name: "健身狂人", tag: "力量 POWER", swatch: "garnet", code: "17|garnet.x,garnet.l,garnet.l,garnet.l,garnet.l,garnet.l,lava.l,lava.l,lava.l,lava.l,sunstone.l,sunstone.l,sunstone.l,gold-hex,gold-hex,lava.s,lava.s,arrow" },
  { name: "遠征戰士", tag: "決斷 DECISION", swatch: "lapis", code: "16|labradorite.x,lapis.l,lapis.l,lapis.l,lapis.l,lapis.l,moon.l,moon.l,moon.l,moon.l,silver-hex,silver-hex,labradorite.l,labradorite.l,moon.s,moon.s,travel-compass" },
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

export default function Home({ onStart, onLoadBuild }: { onStart: () => void; onLoadBuild: (code: string) => void }) {
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

    <section className="landing-builds" data-reveal>
      <p className="landing-eyebrow">EDITOR'S PICKS</p>
      <h2>精選打造，一鍵直接上手</h2>
      <span className="lb-note">由 OMA team 精選示範搭配，非即時排行——點選即可載入工作室繼續調整。</span>
      <div className="landing-builds-grid">
        {SHOWCASE_BUILDS.map((b) => <button className="lb-card" key={b.name} onClick={() => onLoadBuild(b.code)}>
          <img src={photoPath(b.swatch)} alt="" className="lb-swatch" />
          <b>{b.name}</b>
          <span className="lb-tag">{b.tag}</span>
          <span className="lb-arrow">查看設計 →</span>
        </button>)}
      </div>
    </section>

    <section className="landing-presets" data-reveal>
      <p className="landing-eyebrow">ONE-TAP RECIPES</p>
      <h2>沒有靈感？試試一鍵力量配方</h2>
      <div className="landing-preset-list">
        {PRESET_TEASERS.map((p) => <button className="landing-preset" key={p.name} onClick={onStart}>
          <img src={photoPath(p.swatch)} alt="" className="lp-swatch" />
          <span className="lp-text"><b>{p.name}</b><i>{p.body}</i></span>
          <span className="lp-arrow">前往設計 →</span>
        </button>)}
      </div>
    </section>

    <section className="landing-showcase" data-reveal>
      <p className="landing-eyebrow">THE COLLECTION</p>
      <h2>21 款天然礦石，任你搭配</h2>
      <div className="landing-showcase-grid">
        {SHOWCASE.map(([id, zh, group]) => <div className="ls-item" key={id}>
          <img src={photoPath(id)} alt={zh} />
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
