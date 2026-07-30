"use client";

import { useEffect, useRef, useState } from "react";
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

// Women's clip leads, then the second women's, then the men's. Each still is
// the exact frame its clip opens on, so a swap never flashes a different scene.
// `pos` is the landscape crop; bloom centres its bracelet, so it needs to sit
// further right than the other two to clear the bottom-left copy.
const HERO_CLIPS = [
  { id: "bloom", still: "/video/hero-bloom.jpg", stillV: "/video/hero-bloom-v.jpg", pos: "22% 30%" },
  { id: "serene", still: "/banners/serene.jpg", stillV: "/video/hero-serene-v.jpg" },
  { id: "bedrock", still: "/banners/bedrock.jpg", stillV: "/video/hero-bedrock-v.jpg" },
] as const;

// Phones get a 9:10 window cut out of the same landscape footage, centred on
// the bracelet — letting the browser crop a 16:9 clip into a phone-shaped box
// instead would show a quarter of the width and blow it up past 3x. The
// browser downloads only the matching file, so shipping both costs nothing.
const HERO_PORTRAIT_Q = "(max-width:560px)";

// Crossfades through the clips. Only the playing clip and the one after it are
// ever fetched — loading all three up front would pull ~1.4MB before the page
// is usable, for footage the visitor may never scroll past.
function HeroMedia() {
  const [active, setActive] = useState(0);
  // <video> picks its <source> once, at load, and — unlike <picture> — never
  // re-evaluates when the viewport changes. Rotating a phone would otherwise
  // keep serving the portrait cut to a landscape screen, so track the query
  // and re-load on the way through.
  const [portrait, setPortrait] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(HERO_PORTRAIT_Q).matches);
  const [armed, setArmed] = useState<number[]>([0, 1]);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  const advance = () => setActive((n) => (n + 1) % HERO_CLIPS.length);

  useEffect(() => {
    refs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) { v.currentTime = 0; v.play().catch(() => {}); } else v.pause();
    });
    const next = (active + 1) % HERO_CLIPS.length;
    setArmed((a) => (a.includes(next) ? a : [...a, next]));
  }, [active]);

  // Adding <source> children after mount does nothing until load() is called.
  useEffect(() => {
    armed.forEach((i) => { const v = refs.current[i]; if (v && !v.currentSrc) v.load(); });
  }, [armed]);

  useEffect(() => {
    const mq = window.matchMedia(HERO_PORTRAIT_Q);
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Crossing the breakpoint: force every loaded clip to re-pick its source.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    armed.forEach((i) => refs.current[i]?.load());
    refs.current[active]?.play().catch(() => {});
  }, [portrait]);

  // The wrapper is what lets phones give the footage its own band with the copy
  // underneath, instead of stacking type over the bracelet. On wide viewports
  // it just fills the hero, so the overlay layout is unchanged.
  return <div className="landing-hero-media">
    <img src={portrait ? HERO_CLIPS[0].stillV : HERO_CLIPS[0].still} alt="OMA CRYSTAL 水晶手鍊，溪邊自然情境" />
    {HERO_CLIPS.map((c, i) => <video
      key={c.id}
      ref={(el) => { refs.current[i] = el; }}
      className={`landing-hero-video ${i === active ? "on" : ""}`}
      style={"pos" in c ? ({ "--hero-pos": c.pos } as React.CSSProperties) : undefined}
      autoPlay={i === 0}
      muted
      playsInline
      preload={i === 0 ? "metadata" : "none"}
      poster={portrait ? c.stillV : c.still}
      aria-hidden="true"
      onEnded={advance}
      onError={advance}
    >
      {armed.includes(i) && <>
        <source media={HERO_PORTRAIT_Q} src={`/video/hero-${c.id}-v.webm`} type="video/webm" />
        <source media={HERO_PORTRAIT_Q} src={`/video/hero-${c.id}-v.mp4`} type="video/mp4" />
        <source src={`/video/hero-${c.id}.webm`} type="video/webm" />
        <source src={`/video/hero-${c.id}.mp4`} type="video/mp4" />
      </>}
    </video>)}
  </div>;
}

const FEATURES = [
  { en: "CHOSEN FOR YOU", title: "已經替你想過了", body: "八個系列、96 款配置，從 8mm 細繩到 20mm 大顆。不知道從哪裡開始的時候，就從別人替你想過的地方開始。" },
  { en: "MADE BY YOUR HAND", title: "也可以親手為自己串", body: "21 款天然礦石、37 款隔珠與吊飾自由重組。哪一顆貼著手腕內側只有你知道——那是給自己的，不是給別人看的。" },
  { en: "SEEN, NOT GUESSED", title: "心願看得見", body: "財富、愛情、療癒、守護、專注、力量，六個維度即時運算。你在意什麼，戴上之前就看得出來。" },
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
      <HeroMedia />
      <div className="landing-hero-copy">
        <p>RITUALS FOR BECOMING · 成為的儀式</p>
        <h1>WEAR YOUR<br />BECOMING</h1>
        <span className="hero-lede">戴上你正在成為的那個自己</span>
        <span>療癒不是把自己修好，是把本來就在的光重新戴回身上。八個系列、96 款已經配好的能量手鍊，挑一條開始，或親手為自己串一條。</span>
        <div className="landing-hero-actions">
          <button className="landing-cta" onClick={() => onShop()}>探索系列 <i>→</i></button>
          <button className="landing-cta ghost" onClick={onStart}>親手為自己串一條</button>
        </div>
      </div>
      <div className="landing-scroll-hint"><i /></div>
    </section>

    <section className="landing-series" data-reveal>
      <p className="landing-eyebrow">THE COLLECTIONS · 八個系列</p>
      <h2>每個系列，<br />對應你正在經歷的一種狀態</h2>
      <span className="ls-note">有的替你擋掉不屬於你的雜訊，有的陪你把心慢慢軟下來。可以直接帶走一條，也可以進工作室改成只屬於你的比例。</span>
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
          <span className="lsr-badge">{s.audience === "men" ? "FOR HIM 男款" : "FOR HER 女款"}</span>
          <span className="lsr-theme">{s.themeEn} · {s.theme}</span>
          <b>{s.zh}</b>
          <i>{s.en}</i>
          <p>{s.craft}</p>
          <span className="lsr-arrow">12 款配置 →</span>
        </button>)}
      </div>
    </section>

    <section className="landing-features" data-reveal>
      <div className="landing-features-head">
        <p className="landing-eyebrow">WHY OMA · 為什麼是 OMA</p>
        <h2>不只是配飾，<br />是每天對自己的一次確認</h2>
      </div>
      <div className="landing-feature-list">
        {FEATURES.map((f, i) => <div className="landing-feature-row" key={f.title}>
          <span className="lf-index">{String(i + 1).padStart(2, "0")}</span>
          <div className="lf-body"><i className="lf-en">{f.en}</i><b>{f.title}</b><p>{f.body}</p></div>
        </div>)}
      </div>
    </section>

    <section className="landing-showcase" data-reveal>
      <p className="landing-eyebrow">THE MATERIALS · 21 款天然礦石</p>
      <h2>每一顆，<br />都帶著自己的紋理來</h2>
      <div className="landing-showcase-grid">
        {SHOWCASE.map(([id, zh, group]) => <div className="ls-item" key={id}>
          <img src={stonePhotos[id]} alt={zh} />
          <b>{zh}</b>
          <span>{group}</span>
        </div>)}
      </div>
    </section>

    <section className="landing-quote" data-reveal>
      <p>THE OMA ATELIER · 手作工坊</p>
      <h2>慢一點，<br />讓每天的配戴成為一次回到自己。</h2>
      <button className="landing-cta light" onClick={() => onShop()}>探索系列 <i>→</i></button>
    </section>

    <footer className="landing-footer">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <span>© {new Date().getFullYear() || 2026} OMA CRYSTAL</span>
    </footer>
  </div>;
}
