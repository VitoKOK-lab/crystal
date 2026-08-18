"use client";

import { useEffect, useRef, useState } from "react";
import { byStone, stonePhotos } from "./catalog";
import { SERIES } from "./series";

// Crystal thumbnails used purely for the showcase strip below the fold.
// Paths come from the catalogue so men's-line and shared assets resolve
// correctly without this file tracking which lives where.
const SHOWCASE = ["rose", "aqua", "amethyst", "citrine", "moon", "labradorite",
  "obsidian", "tiger-eye", "hematite", "goldstone", "garnet", "lava"] as const;

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
    <img src={portrait ? HERO_CLIPS[0].stillV : HERO_CLIPS[0].still} alt="OMA CRYSTAL 水晶手鍊，溪畔自然情境" />
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

import AnnounceBar from "./announce";

const FEATURES = [
  { en: "CHOSEN FOR YOU", title: "已為你設想過", body: "八個系列、各四款，從 8mm 細繩到 20mm 大顆，無一重複。不知從何開始時，就從已經被想過的地方開始。" },
  { en: "MADE BY YOUR HAND", title: "或親手完成", body: "二十一種天然礦石、三十七款隔珠與吊飾，任你排列。哪一顆貼著腕內側，只有你知道。" },
  { en: "SEEN, NOT GUESSED", title: "心之所向，看得見", body: "財富、愛情、療癒、守護、專注、力量——六個維度即時運算。戴上之前，就已經看見。" },
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

export default function Home({ onStart, onShop, onQuiz }: { onStart: () => void; onShop: (seriesId?: string) => void; onQuiz: () => void }) {
  const rootRef = useScrollReveal();
  return <div className="landing" ref={rootRef}>
    <AnnounceBar onQuiz={onQuiz} />
    <header className="landing-nav">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <div className="landing-nav-links">
        <button className="landing-nav-quiet" onClick={onQuiz}>選石測驗</button>
        <button className="landing-nav-quiet" onClick={() => onShop()}>系列</button>
        <button className="landing-nav-cta" onClick={onStart}>工作室</button>
      </div>
    </header>

    <section className="landing-hero" id="landing-top">
      <HeroMedia />
      <div className="landing-hero-copy">
        <p>OMA CRYSTAL ATELIER</p>
        <h1>挑自己的石頭，<br />串自己的手鍊</h1>
        <span className="hero-lede">Pick your stones, we string them</span>
        <span>一百多種天然水晶，一顆一顆挑、當場看它在手圍上成形；挑好我們替你串好寄到家。沒靈感的話，八個系列、三十二款都先配好了，直接帶走也行。</span>
        <div className="landing-hero-actions">
          <button className="landing-cta" onClick={() => onShop()}>探索系列 <i>→</i></button>
          <button className="landing-cta ghost" onClick={onStart}>親手串一條</button>
        </div>
      </div>
      <div className="landing-scroll-hint"><i /></div>
    </section>

    <section className="landing-series" data-reveal>
      <p className="landing-eyebrow">THE COLLECTIONS</p>
      <h2>八個系列，<br />各自對應一種狀態</h2>
      <span className="ls-note">有的替你擋下雜訊，有的陪你緩緩落地。可以直接帶走，也可以進工作室，改成只屬於你的比例。</span>
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
          <span className="lsr-arrow">四款配置 →</span>
        </button>)}
      </div>
    </section>

    <section className="landing-features" data-reveal>
      <div className="landing-features-head">
        <p className="landing-eyebrow">WHY OMA</p>
        <h2>不是配飾，<br />是每日對自己的確認</h2>
      </div>
      <div className="landing-feature-list">
        {FEATURES.map((f, i) => <div className="landing-feature-row" key={f.title}>
          <span className="lf-index">{String(i + 1).padStart(2, "0")}</span>
          <div className="lf-body"><i className="lf-en">{f.en}</i><b>{f.title}</b><p>{f.body}</p></div>
        </div>)}
      </div>
    </section>

    <section className="landing-showcase" data-reveal>
      <p className="landing-eyebrow">THE MATERIALS</p>
      <h2>二十一種礦石，<br />各自帶著紋理而來</h2>
      <div className="landing-showcase-grid">
        {SHOWCASE.map((id) => <div className="ls-item" key={id}>
          <img src={stonePhotos[id]} alt={byStone[id].zh} />
          <b>{byStone[id].zh}</b>
          <span>{byStone[id].group}</span>
        </div>)}
      </div>
    </section>

    <section className="landing-quote" data-reveal>
      <p>THE OMA ATELIER</p>
      <h2>慢一點。<br />讓每日的配戴，成為回到自己的途徑。</h2>
      <button className="landing-cta light" onClick={() => onShop()}>探索系列 <i>→</i></button>
    </section>

    <footer className="landing-footer">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <span>© {new Date().getFullYear() || 2026} OMA CRYSTAL</span>
    </footer>
  </div>;
}
