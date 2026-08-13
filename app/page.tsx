"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Checkout, { type OrderLine } from "./checkout";
import DesignGuide from "./design-guide";
// Aliased: this file's own default export below is also named `Home` (the
// long-standing name of the whole builder component) — importing the
// landing page under the same identifier let the bundler's scope
// resolution collapse the JSX reference back onto this very component,
// so `<Home>` silently rendered itself recursively (infinite mount depth,
// hard browser-tab crash) instead of the intended landing page.
import LandingHome from "./home";
import Preview, { type PreviewPiece } from "./preview";
import { generateShareCard } from "./share-card";
import { playClaspClick } from "./ui-sound";

import Shop from "./shop";
import {
  BASE_FEE, ENERGY_META, ItemVisual, RARITY_LABEL, WRIST_CHOICES, accessories, accessoryPhotos,
  buildSpec, byAccessory, byStone, decodeDesign, dominantOf, encodeDesign, energyScores, itemMM,
  itemPrice, label, layoutStrand, nextUid, parseSpec, rarityOf, sizeLabel, stonePhotos, stones, PCT_PER_MM,
  type Accessory, type BeadSize, type DesignItem, type EnergyType, type Stone,
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

// One-tap recipes: stones weighted toward each intention's energy profile,
// padded with the theme stone to fill the wearer's wrist.
const PRESETS = {
  power: { name: "站穩自己", pad: "obsidian", spec: [["obsidian","xlarge"],["lava","large"],["obsidian","large"],["hematite","large"],["gold-hex"],["obsidian","large"],["lava","large"],["obsidian","large"],["gold-hex"],["hematite","large"],["obsidian","large"],["lava","large"],["arrow"]] as [string, BeadSize?][] },
  wealth: { name: "豐盛流動", pad: "goldstone", spec: [["goldstone","xlarge"],["tiger-eye","large"],["goldstone","large"],["citrine","large"],["gold-hex"],["goldstone","large"],["tiger-eye","large"],["goldstone","large"],["gold-hex"],["citrine","large"],["goldstone","large"],["tiger-eye","large"],["compass"]] as [string, BeadSize?][] },
  focus: { name: "靜下來", pad: "smoky", spec: [["tiger-eye","xlarge"],["smoky","large"],["clear","large"],["smoky","large"],["silver-hex"],["tiger-eye","large"],["smoky","large"],["clear","large"],["silver-hex"],["smoky","large"],["tiger-eye","large"],["smoky","large"],["compass"]] as [string, BeadSize?][] },
  gym: { name: "身體的力量", pad: "lava", spec: [["garnet","xlarge"],["lava","large"],["sunstone","large"],["hematite","large"],["gold-hex"],["garnet","large"],["lava","large"],["sunstone","large"],["gold-hex"],["hematite","large"],["garnet","large"],["lava","large"],["arrow"]] as [string, BeadSize?][] },
  office: { name: "工作日的界線", pad: "lapis", spec: [["lapis","xlarge"],["moon","large"],["clear","large"],["lapis","large"],["silver-hex"],["moon","large"],["lapis","large"],["clear","large"],["silver-hex"],["lapis","large"],["moon","large"],["lapis","large"],["key"]] as [string, BeadSize?][] },
  travel: { name: "路上有人陪", pad: "labradorite", spec: [["labradorite","xlarge"],["tourmaline","large"],["amethyst","large"],["labradorite","large"],["silver-hex"],["tourmaline","large"],["labradorite","large"],["amethyst","large"],["silver-hex"],["labradorite","large"],["tourmaline","large"],["labradorite","large"],["travel-compass"]] as [string, BeadSize?][] },
} as const;

// Animates a number toward its target so energy totals count up smoothly.
function useCountUp(value: number) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value;
    prev.current = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

function EnergyPanel({ scores, total, dominant, open, onToggle, tone }: { scores: Record<EnergyType, number>; total: number; dominant: (typeof ENERGY_META)[number]; open: boolean; onToggle: () => void; tone: SeriesTone }) {
  const displayTotal = useCountUp(total);
  const max = Math.max(...ENERGY_META.map((m) => scores[m.key]), 1);
  const cx = 110, cy = 92, R = 62;
  const point = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / ENERGY_META.length) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const ringPoints = (r: number) => ENERGY_META.map((_, i) => point(i, r).join(",")).join(" ");
  const valuePoints = ENERGY_META.map((m, i) => point(i, 8 + (scores[m.key] / max) * (R - 8)));
  if (!open) return <button className="energy-fab" onClick={onToggle} aria-label={`展開${tone.matrixZh}`}><span>{tone.fab}</span></button>;
  return <div className="energy-panel">
    <div className="ep-head"><b>{tone.matrixEn}</b><span>{tone.matrixZh}</span><button onClick={onToggle} aria-label={`收合${tone.matrixZh}`}>▾</button></div>
    <svg viewBox="0 0 220 186" className="ep-chart" role="img" aria-label={`六維${tone.fab}雷達圖`}>
      <defs>
        <linearGradient id="epFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity=".5" />
          <stop offset="100%" stopColor="#5ad6cd" stopOpacity=".28" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={ringPoints(R * f)} fill="none" stroke="#ffffff21" strokeWidth="1" />)}
      {ENERGY_META.map((m, i) => { const [x, y] = point(i, R); return <line key={m.key} x1={cx} y1={cy} x2={x} y2={y} stroke="#ffffff12" />; })}
      <polygon key={total} className="ep-value" points={valuePoints.map((p) => p.join(",")).join(" ")} fill="url(#epFill)" stroke="#ffd76a" strokeWidth="1.6" strokeLinejoin="round" />
      {valuePoints.map((p, i) => <circle key={ENERGY_META[i].key} cx={p[0]} cy={p[1]} r="2.6" fill={ENERGY_META[i].color} stroke="#0d1e1d" strokeWidth="1" />)}
      {ENERGY_META.map((m, i) => {
        const [x, y] = point(i, R + 16);
        const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
        return <g key={m.key} textAnchor={anchor}>
          <text x={x} y={y - 1} fontSize="9" fill={m.color} fontWeight="700" letterSpacing=".08em">{m.zh}</text>
          <text x={x} y={y + 9.5} fontSize="8" fill="#cfe4e0">{scores[m.key].toLocaleString()}</text>
        </g>;
      })}
    </svg>
    <div className="ep-dominant">{tone.dominantZh} <b style={{ color: dominant.color }}>{dominant.zh} {dominant.en}</b></div>
    <div className="ep-total"><span>{tone.totalEn}</span><b>{displayTotal.toLocaleString()}</b></div>
  </div>;
}

export default function Home() {
  const [items, setItems] = useState<DesignItem[]>(initial);
  const [tab, setTab] = useState<"crystal" | "spacer" | "charm">("crystal");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<DesignItem>({ kind: "stone", id: "obsidian", size: "large" });
  // Drag logic lives in a ref so pointerup always sees the freshest state —
  // reading it from React state raced the render loop and made quick drags
  // register as taps (deleting the bead). dragView only drives rendering.
  const dragRef = useRef<{ uid: number; startX: number; startY: number; moved: boolean } | null>(null);
  const [dragView, setDragView] = useState<{ uid: number; angle: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const [view, setView] = useState<"home" | "shop" | "studio" | "checkout">("home");
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
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // /men/ redirects here with ?series=forge so old links keep working.
    const wanted = params.get("series");
    if (wanted && bySeries[wanted]) { setSeriesId(wanted); setView("shop"); }
    const code = params.get("d");
    if (!code) return;
    const decoded = decodeDesign(code);
    if (!decoded) return;
    setItems(decoded.items);
    setWristCm(decoded.wrist);
    showNotice("已載入這條設計，可直接調整或結帳");
    setView("studio");
  }, []);
  // Ready-to-wear products are re-parsed from their spec on click rather than
  // reusing the shop's display copies, so the studio always gets fresh uids
  // and editing one never mutates what the shop card renders.
  const openProduct = (sid: string, pid: string, mode: "buy" | "customize") => {
    const product = findProduct(sid, pid);
    if (!product) return;
    setSeriesId(sid);
    setItems(parseSpec(product.spec));
    setWristCm(product.wrist);
    setView(mode === "buy" ? "checkout" : "studio");
    showNotice(mode === "buy" ? "" : `已載入「${product.name}」，接下來由你決定`);
    window.scrollTo({ top: 0 });
  };
  const stageRef = useRef<HTMLDivElement>(null);
  const library = tab === "crystal" ? stones : accessories.filter((x) => x.type === tab);
  const visible = library.filter((x) => `${x.zh} ${x.en}`.toLowerCase().includes(query.toLowerCase()));
  const strandMM = useMemo(() => items.reduce((sum, it) => sum + itemMM(it), 0), [items]);
  const capacityMM = wristCm * 10;
  // The wrist is a hard limit, never something adding a bead can move. It used
  // to grow itself to fit, which meant a customer could hold down a material
  // and walk the bracelet up to 22 cm without ever deciding to — the size has
  // to stay an explicit choice, because it is what has to fit their arm. So a
  // bead that does not fit is refused, and they change the wrist first.
  const add = (item: DesignItem) => {
    const needMM = strandMM + itemMM(item);
    if (needMM > wristCm * 10) {
      const next = WRIST_CHOICES.find((c) => c * 10 >= needMM);
      setWristAlert(true);
      showNotice(next
        ? `${wristCm} cm 放不下${label(item)}了 — 請先把手圍改成 ${next} cm，或移除一些素材`
        : `已達最大手圍 ${WRIST_CHOICES[WRIST_CHOICES.length - 1]} cm，放不下${label(item)}了，請先移除部分素材`);
      return;
    }
    const placed = { ...item, uid: nextUid() }; setItems((v) => [...v, placed]); setSelected(placed);
    playClaspClick(true);
    showNotice(`已加入 ${label(placed)}${placed.kind === "stone" ? `・${sizeLabel(placed.size)}` : ""}・已串 ${(needMM / 10).toFixed(1)} / ${wristCm} cm`);
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
    let mm = built.reduce((sum, it) => sum + itemMM(it), 0);
    let cm = wristCm;
    if (mm > cm * 10) cm = WRIST_CHOICES.find((c) => c * 10 >= mm) ?? WRIST_CHOICES[WRIST_CHOICES.length - 1];
    while (mm + 8 <= cm * 10 && mm < cm * 10 * 0.85) { built.splice(built.length - 1, 0, { kind: "stone", id: preset.pad, size: "small", uid: nextUid() }); mm += 8; }
    if (cm !== wristCm) setWristCm(cm);
    setItems(built);
    showNotice(`已為你配好「${preset.name}」，再調成你的樣子`);
  };
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(t); }, [notice, noticeSeq]);
  useEffect(() => { if (!wristAlert) return; const t = setTimeout(() => setWristAlert(false), 2000); return () => clearTimeout(t); }, [wristAlert]);
  const changeWrist = (cm: number) => {
    if (strandMM > cm * 10) { showNotice(`目前已串 ${(strandMM / 10).toFixed(1)} cm，超過手圍 ${cm} cm 的容量，請先移除部分素材`); return; }
    setWristCm(cm); setWristAlert(false); showNotice(`手圍已設定為 ${cm} cm`);
  };
  const removeByUid = (uid: number) => { const item = items.find((x) => x.uid === uid); setItems((v) => v.filter((x) => x.uid !== uid)); if (item) { setSelected(item); playClaspClick(false); showNotice(`已移除 ${label(item)}`); } };
  const angleForPointer = (clientX: number, clientY: number) => { const box = stageRef.current?.getBoundingClientRect(); if (!box) return 0; const x = (clientX - box.left) / box.width - .5; const y = (clientY - box.top) / box.height - .5; return Math.atan2(y, x); };
  // Live reorder while dragging: map the pointer angle to a millimetre
  // position along the strand and insert the bead between the pieces whose
  // widths bracket it. Excluding the dragged bead keeps boundaries stable, so
  // neighbours don't oscillate.
  const moveToAngle = (uid: number, angle: number) => setItems((current) => {
    const from = current.findIndex((x) => x.uid === uid);
    if (from < 0 || current.length < 2) return current;
    const moving = current[from];
    const rest = current.filter((x) => x.uid !== uid);
    const TAU = Math.PI * 2;
    const frac = ((((angle + Math.PI / 2) % TAU) + TAU) % TAU) / TAU;
    const p = frac * capacityMM;
    let cum = 0, target = rest.length;
    for (let i = 0; i < rest.length; i++) { const w = itemMM(rest[i]); if (p < cum + w / 2) { target = i; break; } cum += w; }
    const next = [...rest];
    next.splice(target, 0, moving);
    return next.every((x, i) => x === current[i]) ? current : next;
  });
  const total = useMemo(() => items.reduce((sum, item) => sum + itemPrice(item), BASE_FEE), [items]);
  const scores = useMemo(() => energyScores(items), [items]);
  const totalEnergy = ENERGY_META.reduce((sum, m) => sum + scores[m.key], 0);
  const dominant = dominantOf(scores);
  const dominantDisplay = useCountUp(scores[dominant.key]);
  const previewPieces = useMemo<PreviewPiece[]>(() => items.map((it) => it.kind === "stone"
    ? { mm: itemMM(it), src: stonePhotos[it.id] ?? null, metal: "gold" as const, isCharm: false }
    : { mm: itemMM(it), src: accessoryPhotos[it.id] ?? null, metal: (byAccessory[it.id] as Accessory).metal, isCharm: (byAccessory[it.id] as Accessory).type === "charm" }), [items]);
  const orderLines = useMemo<OrderLine[]>(() => {
    const grouped = new Map<string, { item: DesignItem; qty: number }>();
    items.forEach((item) => { const key = `${item.kind}-${item.id}-${item.size ?? ""}`; const entry = grouped.get(key); if (entry) entry.qty += 1; else grouped.set(key, { item, qty: 1 }); });
    return [...grouped.entries()].map(([key, { item, qty }]) => ({
      key, qty,
      unit: itemPrice(item),
      name: label(item),
      sub: item.kind === "stone" ? sizeLabel(item.size) : (byAccessory[item.id] as Accessory).type === "spacer" ? "精緻隔珠" : "垂墜吊飾",
      visual: <ItemVisual item={item} small />,
    }));
  }, [items]);
  const beads = items.filter((x) => x.kind === "stone").length;
  const charms = items.filter((x) => x.kind === "accessory" && (byAccessory[x.id] as Accessory).type === "charm").length;
  const strung = (strandMM / 10).toFixed(1);
  const fillRatio = strandMM / capacityMM;
  // Warn before the wrist auto-grows rather than after, so sizing stays the
  // customer's decision instead of a side effect of adding one more bead.
  const nextWrist = WRIST_CHOICES.find((c) => c > wristCm);
  const nearFull = fillRatio >= 0.88 && nextWrist !== undefined;
  const r = (capacityMM / (Math.PI * 2)) * PCT_PER_MM;
  const arcs = useMemo(() => layoutStrand(items, capacityMM), [items, capacityMM]);
  const selectedInfo = selected.kind === "stone" ? byStone[selected.id] as Stone : byAccessory[selected.id] as Accessory;
  const activeSeries = seriesId ? bySeries[seriesId] : null;
  const tone: SeriesTone = activeSeries?.tone ?? NEUTRAL_TONE;
  const goShop = (id?: string) => { setSeriesId(id ?? seriesId ?? SERIES[0].id); setView("shop"); window.scrollTo({ top: 0 }); };
  if (view === "home") return <LandingHome
    onStart={() => { setView("studio"); window.scrollTo({ top: 0 }); }}
    onShop={goShop}
  />;
  if (view === "shop") return <Shop
    seriesId={seriesId ?? SERIES[0].id}
    onSelectSeries={setSeriesId}
    onBuy={(sid, pid) => openProduct(sid, pid, "buy")}
    onCustomize={(sid, pid) => openProduct(sid, pid, "customize")}
    onHome={() => { setView("home"); window.scrollTo({ top: 0 }); }}
    onBlankStudio={() => { setItems([]); setView("studio"); showNotice("空白的手鍊 — 從右側挑第一顆礦石開始"); window.scrollTo({ top: 0 }); }}
  />;
  return <main className={`studio ${drawerOpen ? "" : "drawer-collapsed"}`} style={activeSeries ? { "--series-accent": activeSeries.accent } as React.CSSProperties : undefined}>
    <DesignGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    {previewOpen && <Preview pieces={previewPieces} capacityMM={capacityMM} onClose={() => setPreviewOpen(false)} />}
    <header className="studio-head"><button className="wordmark" onClick={() => setView("home")}>OMA <span>CRYSTAL</span></button><div className="head-note">{tone.dominantEn}</div><div className="head-actions"><button className="quiet" onClick={() => goShop()}>系列商品</button><button className="quiet" onClick={() => setShowGuide(true)}>? 設計指南</button><button className="quiet" onClick={() => { setItems([]); showNotice("已清空，隨時可以重新開始"); }}>清空設計</button></div></header>
    {view === "checkout" ? <Checkout lines={orderLines} baseFee={680} dominant={dominant} totalEnergy={totalEnergy} initialWrist={wristCm} onBack={() => setView("studio")} /> : <>
    <section className="studio-shell" id="top">
      <section className="canvas-panel">
        <div className="canvas-top"><div className="stats"><span className={wristAlert ? "wrist-alert" : ""}><small>WRIST SIZE 手圍</small><b><select className="wrist-select" value={wristCm} onChange={(e) => changeWrist(Number(e.target.value))} aria-label="選擇手圍尺寸">{WRIST_CHOICES.map((cm) => <option key={cm} value={cm}>{cm} cm</option>)}</select></b></span><span><small>STRUNG 已串</small><b>{strung}<i> / {wristCm} cm</i></b><span className={`wrist-bar ${fillRatio >= 1 ? "full" : fillRatio > 0.9 ? "warn" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={wristCm} aria-valuenow={Number(strung)} aria-label="已串長度"><i style={{ width: `${Math.min(100, fillRatio * 100)}%` }} /></span>{nearFull && <button className="wrist-hint" onClick={() => changeWrist(nextWrist as number)}>快滿了 · 改 {nextWrist} cm</button>}</span><span><small>CHARMS</small><b>{charms}</b></span></div><div className="price"><small>ESTIMATED TOTAL</small><b>NT$ {total.toLocaleString()}</b></div></div>
        <div className="bracelet-stage" ref={stageRef}>
          <div className="table-shadow" />
          <div className="bracelet-string" style={{ left: `${50 - r}%`, top: `${50 - r}%`, width: `${r * 2}%`, height: `${r * 2}%` }} />
          {items.map((item, i) => { const uid = item.uid as number; const isDragging = dragView?.uid === uid; const a = isDragging ? (dragView as { angle: number }).angle : arcs[i].angle; const isCharm = arcs[i].isCharm; const sizePct = isCharm ? 10.5 : arcs[i].mm * PCT_PER_MM; const orbit = isCharm ? r + 5 : r; const charmRotation = (a * 180 / Math.PI) - 90; const stoneRotation = (a * 180 / Math.PI) + 90; return <button key={uid} className={`design-item ${isCharm ? "is-charm" : ""} ${isDragging ? "dragging" : ""}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { uid, startX: event.clientX, startY: event.clientY, moved: false }; }} onPointerMove={(event) => { const d = dragRef.current; if (!d || d.uid !== uid) return; if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) <= 9) return; d.moved = true; const angle = angleForPointer(event.clientX, event.clientY); setDragView({ uid, angle }); moveToAngle(uid, angle); }} onPointerUp={() => { const d = dragRef.current; if (!d || d.uid !== uid) return; dragRef.current = null; setDragView(null); if (d.moved) showNotice("已調整素材位置"); else removeByUid(uid); }} onPointerCancel={() => { dragRef.current = null; setDragView(null); }} aria-label={isCharm ? "輕點移除吊飾，按住拖曳調整位置" : "輕點移除素材，按住拖曳調整位置"} title="輕點移除 · 按住拖曳調整位置" style={{ left: `${50 + Math.cos(a) * orbit}%`, top: `${50 + Math.sin(a) * orbit}%`, width: `${sizePct}%`, height: `${sizePct}%`, transform: `translate(-50%,-50%) rotate(${isCharm ? charmRotation : stoneRotation}deg)` }}><ItemVisual item={item} /><span className="remove-mark">−</span></button>; })}
          {beads > 0
            ? <div className="center-intention"><small>{tone.dominantEn}</small><b>{dominant.en}</b><span className="ci-score">{dominantDisplay.toLocaleString()}</span><span className="ci-note">{beads} NATURAL STONES · {items.length} PIECES</span></div>
            : <div className="center-intention"><small>OMA CRYSTAL</small><b>BEGIN WITH ONE</b><span className="ci-note">從一顆開始 · 右側挑你的第一顆礦石</span></div>}
          <div className="stage-tip">輕點移除 · 按住拖曳調整位置</div>
        </div>
        <EnergyPanel scores={scores} total={totalEnergy} dominant={dominant} open={energyOpen} onToggle={() => setEnergyOpen((v) => !v)} tone={tone} />
        <div className="canvas-actions"><button onClick={() => { setItems([]); showNotice("已清空，隨時可以重新開始"); }}>清空全部</button><button onClick={shareDesign}>分享設計</button><button className="pv-open" onClick={() => { if (!items.length) { showNotice("先加幾顆，才有東西可以轉"); return; } setPreviewOpen(true); }}>360° 預覽</button><button className="primary" onClick={() => { if (!items.length) { showNotice("手鍊還是空的，先選幾顆礦石"); return; } if (fillRatio < 0.8) { showNotice(`手圍 ${wristCm} cm 目前只串了 ${strung} cm。至少要串滿八成（${(wristCm * 0.8).toFixed(1)} cm）配戴才服貼，再加幾顆吧`); return; } setView("checkout"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>前往結帳 <span>→</span></button></div>
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      </section>
      <aside className={`materials-panel ${drawerOpen ? "" : "collapsed"}`}>
        <button className="drawer-handle" onClick={() => setDrawerOpen((v) => !v)} aria-expanded={drawerOpen} aria-label={drawerOpen ? "收起素材選擇區" : "展開素材選擇區"}><i /><span>{drawerOpen ? "收起選項" : "選擇礦石與配件"}</span></button>
        <div className="drawer-body">
        <div className="materials-head"><p>01 — CHOOSE MATERIAL</p><h1>為自己串一條<br /><em>Crystal Ritual</em></h1><span>點選素材加入手鍊。每一顆天然晶石的紋理都不相同，不會有第二條與你這條一樣。</span></div>
        <div className="preset-row" aria-label="一鍵搭配"><span>一鍵<br />搭配</span>{(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => <button key={key} onClick={() => applyPreset(key)}>{PRESETS[key].name}</button>)}</div>
        <div className="tabs" aria-label="素材分類">{([["crystal","天然水晶"],["spacer","精緻隔珠"],["charm","專屬吊飾"]] as const).map(([id, name]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setQuery(""); }}>{name}</button>)}</div>
        <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "crystal" ? "搜尋水晶名稱…" : "搜尋配件名稱…"} /></label>
        <div className="library-label"><span>{tab === "crystal" ? "選擇水晶尺寸" : tab === "spacer" ? "選擇精緻隔珠" : "選擇專屬吊飾"}</span><b>{visible.length} 款素材</b></div>
        <div className="material-grid" key={tab}>{visible.length ? visible.map((x: Stone | Accessory) => {
          const item: DesignItem = tab === "crystal" ? { kind: "stone", id: x.id, size: "large" } : { kind: "accessory", id: x.id };
          const tier = rarityOf(x.price);
          if (tab === "crystal") return <article className={`material-card crystal-card rarity-${tier} ${selected.id === item.id ? "selected" : ""}`} key={x.id}><span className="rarity-tag">{RARITY_LABEL[tier]}</span><button className="card-main" onClick={() => add(item)} aria-label={`加入 ${x.zh} 10mm 大珠`}><div className="visual-wrap"><ItemVisual item={item} /><span>＋</span></div><b>{x.zh}</b><small>{x.en}</small><em>NT$ {itemPrice(item)}</em></button><div className="size-actions"><button onClick={() => add({ kind: "stone", id: x.id, size: "xlarge" })} aria-label="加入 20mm 特大主珠">20mm</button><button onClick={() => add({ kind: "stone", id: x.id, size: "large" })} aria-label="加入 10mm 大珠">10mm</button><button onClick={() => add({ kind: "stone", id: x.id, size: "small" })} aria-label="加入 8mm 中珠">8mm</button></div></article>;
          return <button className={`material-card rarity-${tier} ${selected.id === item.id ? "selected" : ""}`} key={x.id} onClick={() => add(item)}><span className="rarity-tag">{RARITY_LABEL[tier]}</span><div className="visual-wrap"><ItemVisual item={item} /><span>＋</span></div><b>{x.zh}</b><small>{x.en}</small><em>NT$ {x.price}</em><i>{(x as Accessory).type === "spacer" ? "精緻小隔珠" : "垂墜吊飾"}</i></button>;
        }) : <div className="empty-library"><b>這裡暫時沒有符合的素材</b><span>清除搜尋文字，或換一個分類看看。</span></div>}</div>
        <div className="selected-detail"><div className="detail-visual"><ItemVisual item={selected} /></div><div><p>{selected.kind === "stone" ? "NATURAL STONE" : "JEWELRY DETAIL"} · <span className={`sd-rarity rarity-${rarityOf(selectedInfo.price)}`}>{RARITY_LABEL[rarityOf(selectedInfo.price)]}</span></p><b>{selectedInfo.zh}</b><span>{selectedInfo.note}</span></div><button onClick={() => add(selected)}>加入 <strong>＋</strong></button></div>
        </div>
      </aside>
    </section>
    <section className="atelier-note"><p>THE OMA ATELIER</p><h2>把此刻的心願，<br />串成每日戴得住的光。</h2><span>所有礦石、隔珠與吊飾都能自由重排，想改幾次都可以。完成後由專人與你確認手圍與細節，確認前不會請款。</span></section>
    </>}
  </main>;
}
