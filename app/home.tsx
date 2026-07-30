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
    <img src={portrait ? HERO_CLIPS[0].stillV : HERO_CLIPS[0].still} alt="An OMA Crystal bracelet resting in a sunlit stream" />
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
  { en: "Chosen for you", title: "Someone has already thought it through", body: "Eight collections of four, 8mm fine through 20mm bold — no two alike. When you don’t know where to begin, begin somewhere already considered." },
  { en: "Made by your hand", title: "Or compose it yourself", body: "Twenty-one natural stones, thirty-seven spacers and charms, arranged however you like. Which stone sits against the inside of your wrist is yours alone to know." },
  { en: "Seen, not guessed", title: "Intention you can read", body: "Wealth, love, healing, protection, focus, power — six dimensions, computed live. What you care about is legible before you ever put it on." },
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
        <button className="landing-nav-quiet" onClick={() => onShop()}>Collections</button>
        <button className="landing-nav-cta" onClick={onStart}>Atelier</button>
      </div>
    </header>

    <section className="landing-hero" id="landing-top">
      <HeroMedia />
      <div className="landing-hero-copy">
        <p>Rituals for becoming</p>
        <h1>WEAR YOUR<br />BECOMING</h1>
        <span className="hero-lede">Wear the woman you are becoming.</span>
        <span>Healing is not repair. It is putting the light you already carry back where you can see it. Eight collections, thirty-two pieces already composed — or string your own, stone by stone.</span>
        <div className="landing-hero-actions">
          <button className="landing-cta" onClick={() => onShop()}>The collections <i>→</i></button>
          <button className="landing-cta ghost" onClick={onStart}>Make your own</button>
        </div>
      </div>
      <div className="landing-scroll-hint"><i /></div>
    </section>

    <section className="landing-series" data-reveal>
      <p className="landing-eyebrow">The collections</p>
      <h2>Eight collections,<br />each for a state you are in</h2>
      <span className="ls-note">Some turn away what isn’t yours. Some sit with you while you soften. Take one as it is, or carry it into the atelier and change the proportions until it is yours.</span>
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
          <span className="lsr-badge">{s.audience === "men" ? "FOR HIM" : "FOR HER"}</span>
          <span className="lsr-theme">{s.theme}</span>
          <b>{s.en}</b>
          <p>{s.craft}</p>
          <span className="lsr-arrow">4 pieces →</span>
        </button>)}
      </div>
    </section>

    <section className="landing-features" data-reveal>
      <div className="landing-features-head">
        <p className="landing-eyebrow">Why OMA</p>
        <h2>Not an accessory.<br />A daily act of choosing yourself</h2>
      </div>
      <div className="landing-feature-list">
        {FEATURES.map((f, i) => <div className="landing-feature-row" key={f.title}>
          <span className="lf-index">{String(i + 1).padStart(2, "0")}</span>
          <div className="lf-body"><i className="lf-en">{f.en}</i><b>{f.title}</b><p>{f.body}</p></div>
        </div>)}
      </div>
    </section>

    <section className="landing-showcase" data-reveal>
      <p className="landing-eyebrow">The materials</p>
      <h2>Twenty-one stones,<br />each arriving with its own grain</h2>
      <div className="landing-showcase-grid">
        {SHOWCASE.map((id) => <div className="ls-item" key={id}>
          <img src={stonePhotos[id]} alt={byStone[id].en} />
          <b>{byStone[id].en}</b>
          <span>{byStone[id].group}</span>
        </div>)}
      </div>
    </section>

    <section className="landing-quote" data-reveal>
      <p>The OMA atelier</p>
      <h2>Slower.<br />So that wearing it returns you to yourself.</h2>
      <button className="landing-cta light" onClick={() => onShop()}>The collections <i>→</i></button>
    </section>

    <footer className="landing-footer">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <span>© {new Date().getFullYear() || 2026} OMA CRYSTAL</span>
    </footer>
  </div>;
}
