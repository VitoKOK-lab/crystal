"use client";

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
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
import LandingHome from "./home";
import Quiz from "./quiz";
import MaterialLibrary from "./material-library";
import type { PreviewPiece } from "./preview-3d";
import { PRESETS } from "./presets";
import { playClaspClick } from "./ui-sound";
import { useShareDesign } from "./use-share-design";
import { useStudioRouter } from "./use-studio-router";

import Shop from "./shop";
import {
  ENERGY_META, ItemVisual, WRIST_CHOICES, accessories, accessoryPhotos,
  buildSpec, byAccessory, byStone, canPadMore, colorGroupOf, defaultStoneMM, dominantOf, encodeDesign, energyScores,
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
  const [wristCm, setWristCm] = useState(DEFAULT_WRIST);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [wristAlert, setWristAlert] = useState(false);
  // A toast that sits until dismissed is fine on desktop but covers the wrist
  // and price readouts on a phone, so it clears itself. The nonce restarts the
  // timer even when the same message fires twice (e.g. tapping a material that
  // still doesn't fit), which a plain string dependency would not.
  const [noticeSeq, setNoticeSeq] = useState(0);
  // Stable identities for everything handed to the memoised children
  // (BraceletStage / EnergyPanel / MaterialLibrary): a fresh function per
  // render would defeat their React.memo and re-render the whole studio on
  // every keystroke in the search box.
  const showNotice = useCallback((text: string) => { setNotice(text); setNoticeSeq((n) => n + 1); }, []);
  useEffect(() => { if (window.innerWidth > 1200) setEnergyOpen(true); }, []);
  // URL-backed view routing + the ?d= / ?pay= special entries live in the
  // hook; Home only supplies what to do when they fire.
  const onLoadShared = useCallback((shared: DesignItem[], wrist: number) => {
    setItems(shared);
    setWristCm(wrist);
    showNotice("已載入這條設計，可直接調整或結帳");
  }, [showNotice]);
  const onPayReturn = useCallback((pay: string, order: string | null) => {
    showNotice(pay === "ok"
      ? `付款成功！${order ? `訂單 ${order} ` : ""}已確認，我們會盡快為你揀珠串製`
      : pay === "back"
        ? "已離開付款頁——訂單保留中，隨時可以回來完成付款"
        : "付款未完成，訂單保留中；可以再試一次或改用其他方式");
  }, [showNotice]);
  const { view, seriesId, navigate } = useStudioRouter({ onLoadShared, onPayReturn });
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
  // Catalog data is hydrated before React mounts (see pages-static/main.tsx),
  // so the module arrays are stable for the app's lifetime and these deps are
  // the whole truth. Memoised because this otherwise re-filters 100+ stones on
  // every unrelated render — each notice tick, drag, and bead change.
  const visible = useMemo(() => {
    const library = tab === "crystal" ? stones : accessories.filter((x) => x.type === tab);
    const q = query.toLowerCase();
    return library.filter((x) => `${x.zh} ${x.en}`.toLowerCase().includes(q))
      .filter((x) => tab !== "crystal" || !colorFilter || colorGroupOf(x.id) === colorFilter)
      .filter((x) => tab !== "crystal" || !energyFilter || ((x as Stone).energy[energyFilter as keyof Stone["energy"]] ?? 0) >= 7);
  }, [tab, query, colorFilter, energyFilter]);
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
  const add = useCallback((item: DesignItem) => {
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
  }, [widths, wristCm, showNotice]);
  const applyPreset = useCallback((key: keyof typeof PRESETS) => {
    const preset = PRESETS[key];
    const built = buildSpec([...preset.spec]);
    const w = built.map(itemMM);
    const cm = fitWristCm(w, wristCm) ?? WRIST_CHOICES[WRIST_CHOICES.length - 1];
    while (canPadMore(w, cm * 10, 0.85)) {
      built.splice(built.length - 1, 0, { kind: "stone", id: preset.pad, size: "small", uid: nextUid() });
      w.push(8);
    }
    if (cm !== wristCm) setWristCm(cm);
    setItems(built);
    showNotice(`已為你配好「${preset.name}」，再調成你的樣子`);
  }, [wristCm, showNotice]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(t); }, [notice, noticeSeq]);
  useEffect(() => { if (!wristAlert) return; const t = setTimeout(() => setWristAlert(false), 2000); return () => clearTimeout(t); }, [wristAlert]);
  const changeWrist = (cm: number) => {
    const need = strandArcMM(widths, cm * 10);
    if (need > cm * 10) { showNotice(`目前已串 ${(need / 10).toFixed(1)} cm，超過手圍 ${cm} cm 的容量，請先移除部分素材`); return; }
    setWristCm(cm); setWristAlert(false); showNotice(`手圍已設定為 ${cm} cm`);
  };
  const removeByUid = useCallback((uid: number) => { const item = items.find((x) => x.uid === uid); setItems((v) => v.filter((x) => x.uid !== uid)); if (item) { setSelected(item); playClaspClick(false); showNotice(`已移除 ${label(item)}`); } }, [items, showNotice]);
  const toggleEnergyOpen = useCallback(() => setEnergyOpen((v) => !v), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);
  const addStoneById = useCallback((id: string) => add({ kind: "stone", id, mm: defaultStoneMM(id) }), [add]);
  const filterEnergy = useCallback((key: string | null) => {
    setEnergyFilter(key);
    if (key) { setTab("crystal"); setDrawerOpen(true); showNotice(`素材櫃只顯示「${ENERGY_META.find((m) => m.key === key)?.zh}」能量強的石頭`); }
  }, [showNotice]);
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);
  const selectTab = useCallback((id: "crystal" | "spacer" | "charm") => { setTab(id); setQuery(""); }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + itemPrice(item), pricing.baseFee), [items]);
  const scores = useMemo(() => energyScores(items), [items]);
  const totalEnergy = ENERGY_META.reduce((sum, m) => sum + scores[m.key], 0);
  const dominant = dominantOf(scores);
  const previewPieces = useMemo<PreviewPiece[]>(() => items.map((it) => it.kind === "stone"
    ? { mm: itemMM(it), src: stonePhotos[it.id] ?? null, metal: "gold" as const, isCharm: false, id: it.id, kind: "stone" as const, uid: it.uid }
    : { mm: itemMM(it), src: accessoryPhotos[it.id] ?? null, metal: (byAccessory[it.id] as Accessory).metal, isCharm: (byAccessory[it.id] as Accessory).type === "charm", id: it.id, kind: "accessory" as const, uid: it.uid }), [items]);
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
  const r = (capacityMM / (Math.PI * 2)) * PCT_PER_MM;
  const arcs = useMemo(() => layoutStrand(items, capacityMM), [items, capacityMM]);
  const selectedInfo = selected.kind === "stone" ? byStone[selected.id] as Stone : byAccessory[selected.id] as Accessory;
  // Declared after every derived value it consumes (previewPieces, scores,
  // total…) — the hook's args are evaluated right here at render time.
  const shareDesign = useShareDesign({ items, wristCm, previewPieces, capacityMM, scores, dominant, totalEnergy, total, beads, showNotice, setNotice });
  const activeSeries = seriesId ? bySeries[seriesId] : null;
  const tone: SeriesTone = activeSeries?.tone ?? NEUTRAL_TONE;
  const goShop = (id?: string) => navigate("shop", id ?? seriesId ?? SERIES[0].id);
  if (view === "home") return <>
    <LandingHome
      onStart={() => navigate("studio", seriesId)}
      onShop={goShop}
      onQuiz={() => navigate("quiz", seriesId)}
    />
    {/* 金流導回落在首頁（redirect URL 不帶 ?v=）——「付款成功」的
        toast 必須在這裡也看得到，不能只活在工作室視圖裡。 */}
    {notice && <div className="notice notice-fixed">{notice}<button onClick={() => setNotice("")}>×</button></div>}
  </>;
  if (view === "quiz") return <Quiz
    onHome={() => navigate("home", seriesId)}
    onLoadDesign={(quizItems, wrist) => {
      setItems(quizItems);
      setWristCm(fitWristCm(quizItems.map(itemMM), wrist) ?? wrist);
      navigate("studio", seriesId);
      showNotice("五石陣容已載入 — 每一顆都可以再調");
    }}
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
        {/* 3D 引擎 chunk 下載中；引擎就緒後由 Preview3D 內的 LoadingVeil
            無縫接手（同一套視覺）。 */}
        <div className="pv-loader" aria-hidden="true">
          <div className="pv-spinner"><span /><span /><span /><i /></div>
          <span className="pv-loading-text">正在努力串珠珠中<i className="pv-dots" /></span>
        </div>
      </div>
    }>
      <Preview3D pieces={previewPieces} capacityMM={capacityMM} energy={dominant.key} onClose={closePreview} />
    </Suspense>}
    <header className="studio-head"><button className="wordmark" onClick={() => navigate("home", seriesId)}>OMA <span>CRYSTAL</span></button><div className="head-note">{tone.dominantEn}</div><div className="head-actions"><button className="quiet" onClick={() => navigate("quiz", seriesId)}>選石測驗</button><button className="quiet" onClick={() => goShop()}>系列商品</button><button className="quiet" onClick={() => setShowGuide(true)}>? 設計指南</button><button className="quiet" onClick={() => { setItems([]); showNotice("已清空，隨時可以重新開始"); }}>清空設計</button></div></header>
    {view === "checkout" ? <Checkout lines={orderLines} specFor={(cm) => encodeDesign(items, cm)} dominant={dominant} totalEnergy={totalEnergy} initialWrist={wristCm} onBack={() => navigate("studio", seriesId)} /> : <>
    <section className="studio-shell" id="top">
      <section className="canvas-panel">
        <div className="canvas-top"><div className="stats"><span className={wristAlert ? "wrist-alert" : ""}><small>WRIST SIZE 手圍</small><b><select className="wrist-select" value={wristCm} onChange={(e) => changeWrist(Number(e.target.value))} aria-label="選擇手圍尺寸">{WRIST_CHOICES.map((cm) => <option key={cm} value={cm}>{cm} cm</option>)}</select></b></span><span><small>STRUNG 已串</small><b>{strung}<i> / {wristCm} cm</i></b><span className={`wrist-bar ${fillRatio >= 1 ? "full" : fillRatio > 0.9 ? "warn" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={wristCm} aria-valuenow={Number(strung)} aria-label="已串長度"><i style={{ width: `${Math.min(100, fillRatio * 100)}%` }} /></span></span><span><small>CHARMS</small><b>{charms}</b></span></div><div className="price"><small>ESTIMATED TOTAL</small><b>NT$ {total.toLocaleString()}</b></div></div>
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
        <EnergyPanel scores={scores} total={totalEnergy} dominant={dominant} open={energyOpen} onToggle={toggleEnergyOpen} tone={tone} onAddStone={addStoneById} energyFilter={energyFilter} onFilterEnergy={filterEnergy} />
        <div className="canvas-actions"><button onClick={() => { setItems([]); showNotice("已清空，隨時可以重新開始"); }}>清空全部</button><button onClick={shareDesign}>分享設計</button><button className="pv-open" onClick={() => { if (!items.length) { showNotice("先加幾顆，才有東西可以轉"); return; } setPreviewOpen(true); }}>360° 預覽</button><button className="primary" onClick={() => { if (!items.length) { showNotice("手鍊還是空的，先選幾顆礦石"); return; } if (fillRatio < 0.8) { showNotice(`手圍 ${wristCm} cm 目前只串了 ${strung} cm。至少要串滿八成（${(wristCm * 0.8).toFixed(1)} cm）配戴才服貼，再加幾顆吧`); return; } navigate("checkout", seriesId, { scroll: false }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>前往結帳 <span>→</span></button></div>
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      </section>
      <MaterialLibrary
        drawerOpen={drawerOpen}
        onToggleDrawer={toggleDrawer}
        tab={tab}
        onSelectTab={selectTab}
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
