"use client";

import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import BraceletStage from "./bracelet-stage";
import Checkout, { type OrderLine } from "./checkout";
import DesignGuide from "./design-guide";
import EnergyPanel from "./energy-panel";
// Aliased: this file's own default export below is also named `Home` (the
// long-standing name of the whole builder component) — importing the
// landing page under the same identifier let the bundler's scope
// resolution collapse the JSX reference back onto this very component,
// so `<Home>` silently rendered itself recursively (infinite mount depth,
// hard browser-tab crash) instead of the intended landing page.
import Gallery from "./gallery";
import LandingHome from "./home";
import Quiz from "./quiz";
import MaterialLibrary from "./material-library";
import type { PreviewPiece } from "./preview-3d";
import { PRESETS } from "./presets";
import { generateShareCard } from "./share-card";
import { playClaspClick } from "./ui-sound";

import Shop from "./shop";
import {
  ENERGY_META, ItemVisual, WRIST_CHOICES, accessories, accessoryPhotos,
  buildSpec, byAccessory, byStone, colorGroupOf, decodeDesign, defaultStoneMM, dominantOf, encodeDesign, energyScores,
  fitWristCm, itemMM, itemPrice, label, layoutStrand, nextUid, parseSpec, pricing, sizeLabel, stonePhotos, stones,
  strandArcMM, PCT_PER_MM,
  type Accessory, type BeadSize, type ColorGroupKey, type DesignItem, type Stone,
} from "./catalog";
import { NEUTRAL_TONE, SERIES, bySeries, findProduct, type SeriesTone } from "./series";

// Starter design sums to 11.8 cm on the 14 cm default wrist (84%) — past the
// 80% checkout gate, but still under the 88% "nearly full" nudge so the first
// couple of beads a customer adds don't immediately trigger a size warning.
const initialSpec: [string, BeadSize?][] = [["amethyst","xlarge"],["amethyst","large"],["clear","large"],["amethyst","large"],["silver-round"],["rose","large"],["amethyst","large"],["moon","large"],["amethyst","large"],["clear","large"],["amethyst","large"],["moon-charm"]];
const initial: DesignItem[] = buildSpec(initialSpec);
// The most common wrist size, so both the studio and every ready-to-wear
// product in series.ts are configured around it.
export const DEFAULT_WRIST = 14;

// Three.js + fiber + drei add ~1MB to the bundle — code-split behind the
// 360° preview button so that weight only loads for visitors who actually
// open it, instead of on every studio page view.
const Preview3D = lazy(() => import("./preview-3d"));

export default function Home() {
  const [items, setItems] = useState<DesignItem[]>(initial);
  const [tab, setTab] = useState<"crystal" | "spacer" | "charm">("crystal");
  const [query, setQuery] = useState("");
  // Grid filters: colour chips above the stone grid, energy chips in the
  // energy panel. Both narrow the same grid; either can be off (null).
  const [colorFilter, setColorFilter] = useState<ColorGroupKey | null>(null);
  const [energyFilter, setEnergyFilter] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<DesignItem>({ kind: "stone", id: "obsidian", size: "large" });
  const [showGuide, setShowGuide] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const [view, setView] = useState<"home" | "shop" | "studio" | "checkout" | "gallery" | "quiz">("home");
  // Which collection the customer came in through. Drives the accent colour
  // and whether the studio speaks 能量 or 戰力. Null = walked straight into
  // the studio without picking a series, which gets the neutral wording.
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [wristCm, setWristCm] = useState(DEFAULT_WRIST);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [wristAlert, setWristAlert] = useState(false);
  // A toast that sits until dismissed is fine on desktop but covers the wrist
  // and price readouts on a phone, so it clears itself. The nonce restarts the
  // timer even when the same message fires twice (e.g. tapping a material that
  // still doesn't fit), which a plain string dependency would not.
  const [noticeSeq, setNoticeSeq] = useState(0);
  const showNotice = (text: string) => { setNotice(text); setNoticeSeq((n) => n + 1); };
  useEffect(() => { if (window.innerWidth > 1200) setEnergyOpen(true); }, []);
  // The view lives in the URL (?v=shop|studio|checkout, plus ?series=), so
  // the browser's back button steps between views instead of leaving the
  // site, and a refresh comes back to the same place. pushState on
  // programmatic navigation, popstate to follow the history.
  const navigate = (v: typeof view, sid: string | null, opts: { push?: boolean; scroll?: boolean } = {}) => {
    setSeriesId(sid);
    setView(v);
    const params = new URLSearchParams(window.location.search);
    params.delete("v"); params.delete("series"); params.delete("d");
    if (v !== "home") params.set("v", v);
    if (sid && (v === "shop" || v === "studio")) params.set("series", sid);
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (opts.push === false) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    if (opts.scroll !== false) window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const applyUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get("series");
      if (sid && bySeries[sid]) setSeriesId(sid);
      const v = params.get("v");
      if (v === "shop" || v === "studio" || v === "checkout" || v === "gallery" || v === "quiz") setView(v);
      else if (params.get("d")) setView("studio"); // a history entry from before a share link's design was navigated away
      else if (sid && bySeries[sid]) setView("shop"); // /men/ redirects here with ?series=forge
      else setView("home");
    };
    window.addEventListener("popstate", applyUrl);

    // Initial load: a shared design link (?d=) wins and opens the studio.
    const params = new URLSearchParams(window.location.search);
    const code = params.get("d");
    const decoded = code ? decodeDesign(code) : null;
    if (decoded) {
      setItems(decoded.items);
      setWristCm(decoded.wrist);
      showNotice("已載入這條設計，可直接調整或結帳");
      const sid = params.get("series");
      if (sid && bySeries[sid]) setSeriesId(sid);
      setView("studio");
    } else {
      applyUrl();
    }
    return () => window.removeEventListener("popstate", applyUrl);
  }, []);
  // Ready-to-wear products are re-parsed from their spec on click rather than
  // reusing the shop's display copies, so the studio always gets fresh uids
  // and editing one never mutates what the shop card renders.
  const openProduct = (sid: string, pid: string, mode: "buy" | "customize") => {
    const product = findProduct(sid, pid);
    if (!product) return;
    const parsed = parseSpec(product.spec);
    setItems(parsed);
    // Under the arc model a spec written to exactly fill its stated wrist
    // may need the next half-size up — fit, never overflow.
    setWristCm(fitWristCm(parsed.map(itemMM), product.wrist) ?? product.wrist);
    navigate(mode === "buy" ? "checkout" : "studio", sid);
    showNotice(mode === "buy" ? "" : `已載入「${product.name}」，接下來由你決定`);
  };
  const library = tab === "crystal" ? stones : accessories.filter((x) => x.type === tab);
  const visible = library.filter((x) => `${x.zh} ${x.en}`.toLowerCase().includes(query.toLowerCase()))
    .filter((x) => tab !== "crystal" || !colorFilter || colorGroupOf(x.id) === colorFilter)
    .filter((x) => tab !== "crystal" || !energyFilter || ((x as Stone).energy[energyFilter as keyof Stone["energy"]] ?? 0) >= 7);
  const widths = useMemo(() => items.map(itemMM), [items]);
  const capacityMM = wristCm * 10;
  // Strung length is measured in ARC the beads actually occupy on the ring
  // (a bead takes more arc than its diameter — see arcWidthMM), so the
  // readout, the fill gates and the drawn ring can never disagree with the
  // physical bracelet.
  const strungMM = useMemo(() => strandArcMM(widths, capacityMM), [widths, capacityMM]);
  // Adding a bead past the current capacity grows the wrist to the next
  // offered size automatically (per the owner: multi-selecting should just
  // get bigger, not nag) — the notice says so, and the select stays there
  // for shrinking back down.
  const add = (item: DesignItem) => {
    const nextWidths = [...widths, itemMM(item)];
    let cm = wristCm;
    if (strandArcMM(nextWidths, cm * 10) > cm * 10) {
      const grown = fitWristCm(nextWidths, cm);
      if (grown === undefined) {
        setWristAlert(true);
        showNotice(`已達最大手圍 ${WRIST_CHOICES[WRIST_CHOICES.length - 1]} cm，放不下${label(item)}了，請先移除部分素材`);
        return;
      }
      cm = grown;
      setWristCm(grown);
    }
    const placed = { ...item, uid: nextUid() }; setItems((v) => [...v, placed]); setSelected(placed);
    playClaspClick(true);
    const strungNext = (strandArcMM(nextWidths, cm * 10) / 10).toFixed(1);
    showNotice(cm !== wristCm
      ? `已加入 ${label(placed)}・手圍自動改為 ${cm} cm（已串 ${strungNext} cm）`
      : `已加入 ${label(placed)}${placed.kind === "stone" ? `・${sizeLabel(placed.size)}` : ""}・已串 ${strungNext} / ${cm} cm`);
  };
  const shareDesign = async () => {
    if (!items.length) { showNotice("先加幾顆，再把它分享出去"); return; }
    showNotice("正在產生分享卡…");
    const url = `${window.location.origin}${window.location.pathname}?d=${encodeURIComponent(encodeDesign(items, wristCm))}`;
    try {
      const blob = await generateShareCard({
        pieces: previewPieces, capacityMM,
        energies: ENERGY_META.map((m) => ({ zh: m.zh, en: m.en, color: m.color, score: scores[m.key] })),
        dominant: { zh: dominant.zh, en: dominant.en, color: dominant.color, score: scores[dominant.key] },
        totalEnergy, priceNTD: total, wristCm, beads, url,
      });
      const file = new File([blob], "oma-crystal-design.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "OMA CRYSTAL", text: `我的專屬能量手鍊 ${url}`, url });
        showNotice("已開啟分享面板");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "oma-crystal-design.png";
        a.click();
        URL.revokeObjectURL(a.href);
        await navigator.clipboard?.writeText(url);
        showNotice("分享卡已下載，連結已複製 — 貼給朋友就能看到同款");
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") { setNotice(""); return; }
      await navigator.clipboard?.writeText(url).catch(() => {});
      showNotice("分享卡產生失敗，已改為複製設計連結");
    }
  };
  const applyPreset = (key: keyof typeof PRESETS) => {
    const preset = PRESETS[key];
    const built = buildSpec([...preset.spec]);
    const w = built.map(itemMM);
    const cm = fitWristCm(w, wristCm) ?? WRIST_CHOICES[WRIST_CHOICES.length - 1];
    while (strandArcMM([...w, 8], cm * 10) <= cm * 10 && strandArcMM(w, cm * 10) < cm * 10 * 0.85) {
      built.splice(built.length - 1, 0, { kind: "stone", id: preset.pad, size: "small", uid: nextUid() });
      w.push(8);
    }
    if (cm !== wristCm) setWristCm(cm);
    setItems(built);
    showNotice(`已為你配好「${preset.name}」，再調成你的樣子`);
  };
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(t); }, [notice, noticeSeq]);
  useEffect(() => { if (!wristAlert) return; const t = setTimeout(() => setWristAlert(false), 2000); return () => clearTimeout(t); }, [wristAlert]);
  const changeWrist = (cm: number) => {
    const need = strandArcMM(widths, cm * 10);
    if (need > cm * 10) { showNotice(`目前已串 ${(need / 10).toFixed(1)} cm，超過手圍 ${cm} cm 的容量，請先移除部分素材`); return; }
    setWristCm(cm); setWristAlert(false); showNotice(`手圍已設定為 ${cm} cm`);
  };
  const removeByUid = (uid: number) => { const item = items.find((x) => x.uid === uid); setItems((v) => v.filter((x) => x.uid !== uid)); if (item) { setSelected(item); playClaspClick(false); showNotice(`已移除 ${label(item)}`); } };
  const total = useMemo(() => items.reduce((sum, item) => sum + itemPrice(item), pricing.baseFee), [items]);
  const scores = useMemo(() => energyScores(items), [items]);
  const totalEnergy = ENERGY_META.reduce((sum, m) => sum + scores[m.key], 0);
  const dominant = dominantOf(scores);
  const previewPieces = useMemo<PreviewPiece[]>(() => items.map((it) => it.kind === "stone"
    ? { mm: itemMM(it), src: stonePhotos[it.id] ?? null, metal: "gold" as const, isCharm: false, id: it.id, kind: "stone" as const }
    : { mm: itemMM(it), src: accessoryPhotos[it.id] ?? null, metal: (byAccessory[it.id] as Accessory).metal, isCharm: (byAccessory[it.id] as Accessory).type === "charm", id: it.id, kind: "accessory" as const }), [items]);
  const orderLines = useMemo<OrderLine[]>(() => {
    const grouped = new Map<string, { item: DesignItem; qty: number }>();
    items.forEach((item) => { const key = `${item.kind}-${item.id}-${item.size ?? ""}`; const entry = grouped.get(key); if (entry) entry.qty += 1; else grouped.set(key, { item, qty: 1 }); });
    return [...grouped.entries()].map(([key, { item, qty }]) => ({
      key, qty,
      unit: itemPrice(item),
      name: label(item),
      sub: item.kind === "stone" ? sizeLabel(item) : (byAccessory[item.id] as Accessory).type === "spacer" ? "精緻隔珠" : "垂墜吊飾",
      visual: <ItemVisual item={item} small />,
      kind: item.kind, id: item.id, mm: item.kind === "stone" ? itemMM(item) : undefined,
    }));
  }, [items]);
  const beads = items.filter((x) => x.kind === "stone").length;
  const charms = items.filter((x) => x.kind === "accessory" && (byAccessory[x.id] as Accessory).type === "charm").length;
  const strung = (strungMM / 10).toFixed(1);
  const fillRatio = strungMM / capacityMM;
  // Warn before the wrist auto-grows rather than after, so sizing stays the
  // customer's decision instead of a side effect of adding one more bead.
  const nextWrist = WRIST_CHOICES.find((c) => c > wristCm);
  const nearFull = fillRatio >= 0.88 && nextWrist !== undefined;
  const r = (capacityMM / (Math.PI * 2)) * PCT_PER_MM;
  const arcs = useMemo(() => layoutStrand(items, capacityMM), [items, capacityMM]);
  const selectedInfo = selected.kind === "stone" ? byStone[selected.id] as Stone : byAccessory[selected.id] as Accessory;
  const activeSeries = seriesId ? bySeries[seriesId] : null;
  const tone: SeriesTone = activeSeries?.tone ?? NEUTRAL_TONE;
  const goShop = (id?: string) => navigate("shop", id ?? seriesId ?? SERIES[0].id);
  if (view === "home") return <LandingHome
    onStart={() => navigate("studio", seriesId)}
    onShop={goShop}
    onGallery={() => navigate("gallery", seriesId)}
    onQuiz={() => navigate("quiz", seriesId)}
  />;
  if (view === "quiz") return <Quiz
    onHome={() => navigate("home", seriesId)}
    onLoadDesign={(quizItems, wrist) => {
      setItems(quizItems);
      setWristCm(fitWristCm(quizItems.map(itemMM), wrist) ?? wrist);
      navigate("studio", seriesId);
      showNotice("五石陣容已載入 — 每一顆都可以再調");
    }}
  />;
  if (view === "gallery") return <Gallery
    onBuy={(sid, pid) => openProduct(sid, pid, "buy")}
    onCustomize={(sid, pid) => openProduct(sid, pid, "customize")}
    onHome={() => navigate("home", seriesId)}
    onStudio={() => { setItems([]); navigate("studio", seriesId); showNotice("空白的手鍊 — 從右側挑第一顆礦石開始"); }}
  />;
  if (view === "shop") return <Shop
    seriesId={seriesId ?? SERIES[0].id}
    onSelectSeries={(sid) => navigate("shop", sid, { push: false, scroll: false })}
    onBuy={(sid, pid) => openProduct(sid, pid, "buy")}
    onCustomize={(sid, pid) => openProduct(sid, pid, "customize")}
    onHome={() => navigate("home", seriesId)}
    onBlankStudio={() => { setItems([]); navigate("studio", seriesId); showNotice("空白的手鍊 — 從右側挑第一顆礦石開始"); }}
  />;
  return <main className={`studio ${drawerOpen ? "" : "drawer-collapsed"}`} style={activeSeries ? { "--series-accent": activeSeries.accent } as React.CSSProperties : undefined}>
    <DesignGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    {previewOpen && <Suspense fallback={
      <div className="preview-overlay" role="dialog" aria-label="360 度立體預覽載入中">
        <div className="pv-head"><b>360° PREVIEW</b><span>載入中…</span><button className="pv-close" onClick={() => setPreviewOpen(false)} aria-label="關閉預覽">✕</button></div>
      </div>
    }>
      <Preview3D pieces={previewPieces} capacityMM={capacityMM} energy={dominant.key} onClose={() => setPreviewOpen(false)} />
    </Suspense>}
    <header className="studio-head"><button className="wordmark" onClick={() => navigate("home", seriesId)}>OMA <span>CRYSTAL</span></button><div className="head-note">{tone.dominantEn}</div><div className="head-actions"><button className="quiet" onClick={() => navigate("gallery", seriesId)}>靈感藝廊</button><button className="quiet" onClick={() => goShop()}>系列商品</button><button className="quiet" onClick={() => setShowGuide(true)}>? 設計指南</button><button className="quiet" onClick={() => { setItems([]); showNotice("已清空，隨時可以重新開始"); }}>清空設計</button></div></header>
    {view === "checkout" ? <Checkout lines={orderLines} spec={encodeDesign(items, wristCm)} dominant={dominant} totalEnergy={totalEnergy} initialWrist={wristCm} onBack={() => navigate("studio", seriesId)} /> : <>
    <section className="studio-shell" id="top">
      <section className="canvas-panel">
        <div className="canvas-top"><div className="stats"><span className={wristAlert ? "wrist-alert" : ""}><small>WRIST SIZE 手圍</small><b><select className="wrist-select" value={wristCm} onChange={(e) => changeWrist(Number(e.target.value))} aria-label="選擇手圍尺寸">{WRIST_CHOICES.map((cm) => <option key={cm} value={cm}>{cm} cm</option>)}</select></b></span><span><small>STRUNG 已串</small><b>{strung}<i> / {wristCm} cm</i></b><span className={`wrist-bar ${fillRatio >= 1 ? "full" : fillRatio > 0.9 ? "warn" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={wristCm} aria-valuenow={Number(strung)} aria-label="已串長度"><i style={{ width: `${Math.min(100, fillRatio * 100)}%` }} /></span>{nearFull && <button className="wrist-hint" onClick={() => changeWrist(nextWrist as number)}>快滿了 · 改 {nextWrist} cm</button>}</span><span><small>CHARMS</small><b>{charms}</b></span></div><div className="price"><small>ESTIMATED TOTAL</small><b>NT$ {total.toLocaleString()}</b></div></div>
        <BraceletStage
          items={items}
          setItems={setItems}
          arcs={arcs}
          r={r}
          capacityMM={capacityMM}
          beads={beads}
          dominant={dominant}
          strung={strung}
          wristCm={wristCm}
          tone={tone}
          showNotice={showNotice}
          removeByUid={removeByUid}
        />
        <EnergyPanel scores={scores} total={totalEnergy} dominant={dominant} open={energyOpen} onToggle={() => setEnergyOpen((v) => !v)} tone={tone} onAddStone={(id) => add({ kind: "stone", id, mm: defaultStoneMM(id) })} energyFilter={energyFilter} onFilterEnergy={(key) => { setEnergyFilter(key); if (key) { setTab("crystal"); setDrawerOpen(true); showNotice(`素材櫃只顯示「${ENERGY_META.find((m) => m.key === key)?.zh}」能量強的石頭`); } }} />
        <div className="canvas-actions"><button onClick={() => { setItems([]); showNotice("已清空，隨時可以重新開始"); }}>清空全部</button><button onClick={shareDesign}>分享設計</button><button className="pv-open" onClick={() => { if (!items.length) { showNotice("先加幾顆，才有東西可以轉"); return; } setPreviewOpen(true); }}>360° 預覽</button><button className="primary" onClick={() => { if (!items.length) { showNotice("手鍊還是空的，先選幾顆礦石"); return; } if (fillRatio < 0.8) { showNotice(`手圍 ${wristCm} cm 目前只串了 ${strung} cm。至少要串滿八成（${(wristCm * 0.8).toFixed(1)} cm）配戴才服貼，再加幾顆吧`); return; } navigate("checkout", seriesId, { scroll: false }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>前往結帳 <span>→</span></button></div>
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      </section>
      <MaterialLibrary
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((v) => !v)}
        tab={tab}
        onSelectTab={(id) => { setTab(id); setQuery(""); }}
        query={query}
        onQuery={setQuery}
        visible={visible}
        selected={selected}
        selectedInfo={selectedInfo}
        add={add}
        applyPreset={applyPreset}
        colorFilter={colorFilter}
        onColorFilter={setColorFilter}
        energyFilter={energyFilter}
        onEnergyFilter={setEnergyFilter}
      />
    </section>
    <section className="atelier-note"><p>THE OMA ATELIER</p><h2>把此刻的心願，<br />串成每日戴得住的光。</h2><span>所有礦石、隔珠與吊飾都能自由重排，想改幾次都可以。完成後由專人與你確認手圍與細節，確認前不會請款。</span></section>
    </>}
  </main>;
}
