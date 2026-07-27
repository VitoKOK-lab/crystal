"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DesignGuide from "./design-guide";

type EnergyType = "wealth" | "love" | "health" | "protection" | "clarity" | "energy";
type Stone = { id: string; zh: string; en: string; group: string; color: string; light: string; deep: string; price: number; note: string; energy: Record<EnergyType, number> };
type Accessory = { id: string; zh: string; en: string; type: "spacer" | "charm"; shape: string; metal: "gold" | "silver"; price: number; note: string; energy?: Record<EnergyType, number> };
type BeadSize = "xlarge" | "large" | "small";
type DesignItem = { kind: "stone" | "accessory"; id: string; size?: BeadSize; uid?: number };

// Stable per-placement identity so live drag-reordering keeps DOM nodes (and
// their pointer capture) alive while the array order changes underneath.
let uidSeq = 0;
const nextUid = () => ++uidSeq;

const stones: Stone[] = [
  ["rose","粉水晶","Rose Quartz","愛與關係","#df9baa","#fff3f4","#a65364",260,"溫柔、親密與自我接納",{wealth:2,love:9,health:7,protection:3,clarity:4,energy:6}],
  ["clear","白水晶","Clear Quartz","淨化","#d4e2e4","#ffffff","#8ba3a7",230,"清晰思緒，放大你的意圖",{wealth:7,love:5,health:6,protection:8,clarity:10,energy:9}],
  ["amethyst","紫水晶","Amethyst","守護","#8868b3","#eee5ff","#4e2c80",280,"安定心緒，保持內在平衡",{wealth:4,love:6,health:8,protection:9,clarity:9,energy:8}],
  ["citrine","黃水晶","Citrine","豐盛","#e1b254","#fff7c5","#9d6a11",300,"邀請豐盛與自信前來",{wealth:10,love:4,health:5,protection:4,clarity:7,energy:9}],
  ["aqua","海藍寶","Aquamarine","療癒","#7fc6d4","#efffff","#337b8c",360,"像海一樣清澈、自在",{wealth:3,love:8,health:9,protection:5,clarity:8,energy:7}],
  ["tourmaline","黑碧璽","Black Tourmaline","守護","#282a2c","#74777a","#060708",290,"穩定界線，沉靜守護",{wealth:2,love:3,health:6,protection:10,clarity:5,energy:4}],
  ["sunstone","太陽石","Sunstone","行動","#ce7b4f","#ffd4ad","#813820",330,"把勇氣帶到每一步",{wealth:7,love:5,health:8,protection:4,clarity:6,energy:9}],
  ["moon","月光石","Moonstone","療癒","#bbc6e1","#ffffff","#6d78a3",320,"柔和直覺，照亮新開始",{wealth:3,love:7,health:8,protection:6,clarity:7,energy:6}],
  ["moss","苔蘚瑪瑙","Moss Agate","療癒","#779b78","#e5f3d8","#31563a",290,"穩定生長，回到自己的節奏",{wealth:6,love:4,health:9,protection:7,clarity:5,energy:5}],
  ["lapis","青金石","Lapis Lazuli","守護","#315b94","#a7d9f3","#122654",330,"誠實表達，連結內在智慧",{wealth:5,love:6,health:7,protection:8,clarity:9,energy:7}],
  ["garnet","石榴石","Garnet","行動","#9d3753","#ffc2cb","#4d1025",310,"熱情與持續前進的力量",{wealth:8,love:7,health:6,protection:5,clarity:4,energy:10}],
  ["tiger","虎眼石","Tiger’s Eye","豐盛","#ae7927","#ffdf84","#55340c",270,"專注、果斷與行動力",{wealth:9,love:3,health:7,protection:6,clarity:8,energy:8}],
  ["smoky","茶晶","Smoky Quartz","守護","#7b604d","#edd7bc","#38241c",300,"沉穩落地，釋放雜訊",{wealth:4,love:4,health:6,protection:9,clarity:6,energy:5}],
  ["fluorite","螢石","Fluorite","淨化","#79b69f","#e3ffe7","#3d7461",320,"整理思緒，溫柔淨化",{wealth:3,love:5,health:8,protection:7,clarity:9,energy:7}],
  ["rhodonite","薔薇輝石","Rhodonite","愛與關係","#b96f82","#ffd8e0","#6e3445",350,"修復關係與勇敢去愛",{wealth:2,love:10,health:7,protection:4,clarity:5,energy:6}],
  ["labradorite","拉長石","Labradorite","守護","#557883","#bfeef2","#263e55",380,"低調光芒，守護你的能量",{wealth:4,love:5,health:6,protection:10,clarity:7,energy:8}],
].map(([id,zh,en,group,color,light,deep,price,note,energy]) => ({ id,zh,en,group,color,light,deep,price,note,energy } as Stone));

const accessories: Accessory[] = [
  ["silver-round","925銀圓隔珠","Sterling Silver Round","spacer","round","silver",90,"鏡面拋光的細緻間隔"],
  ["silver-heart","925銀愛心隔珠","Sterling Silver Heart","spacer","heart","silver",160,"立體愛心，適合作為細緻焦點"],
  ["gold-rondelle","鍍金方鑽隔珠","Gold Crystal Rondelle","spacer","rondelle","gold",140,"光線下會微微閃爍"],
  ["silver-flower","銀色雕花隔珠","Silver Filigree","spacer","flower","silver",120,"手工感雕花紋理"],
  ["gold-knot","金色繩結隔珠","Gold Knot Spacer","spacer","knot","gold",130,"象徵相遇與連結"],
  ["silver-star","銀色星芒隔珠","Silver Star Spacer","spacer","star","silver",120,"細小卻明亮的星芒"],
  ["gold-crown","金色皇冠隔珠","Gold Crown Spacer","spacer","crown","gold",160,"為主石留出精緻焦點"],
  ["leaf","金葉吊飾","Golden Leaf Charm","charm","leaf","gold",390,"把成長與好運帶在身邊"],
  ["moon-charm","月亮吊飾","Moon Charm","charm","moon","silver",390,"為夜晚留一點柔光"],
  ["lotus","蓮花吊飾","Lotus Charm","charm","lotus","gold",490,"綻放、平靜與重生"],
  ["heart","愛心吊飾","Heart Charm","charm","heart","gold",420,"將心意串進每日佩戴"],
  ["cross","守護十字吊飾","Cross Charm","charm","cross","silver",490,"低調而堅定的守護"],
  ["key","幸運鑰匙吊飾","Lucky Key Charm","charm","key","gold",450,"開啟新的可能性"],
  ["butterfly","蛻變蝴蝶吊飾","Butterfly Charm","charm","butterfly","gold",520,"提醒自己，優雅地迎向每次蛻變"],
  ["evil-eye","守護之眼吊飾","Evil Eye Charm","charm","evil-eye","silver",480,"把溫柔的守護帶在身邊"],
  ["sun-charm","金色太陽吊飾","Sunray Charm","charm","sun","gold",470,"為每一天留下一點明亮能量"],
  ["star-charm","許願星吊飾","Wish Star Charm","charm","wish-star","silver",430,"將想完成的願望串成日常"],
  ["shell","海洋貝殼吊飾","Seashell Charm","charm","shell","gold",460,"像海一樣自在而柔韌"],
  ["compass","旅行羅盤吊飾","Compass Charm","charm","compass","silver",540,"讓心始終知道前進的方向"],
  ["angel-wing","天使之翼吊飾","Angel Wing Charm","charm","wing","silver",510,"低調陪伴、安定而溫柔"],
  ["clover","四葉幸運草吊飾","Four Leaf Clover Charm","charm","clover","gold",500,"收下剛剛好的幸運與祝福"],
  ["lock","愛的鎖頭吊飾","Love Lock Charm","charm","lock","gold",490,"守住珍視的心意與承諾"],
  ["hamsa","祝福手掌吊飾","Hamsa Charm","charm","hamsa","silver",520,"以祝福與平安守護你的日常"],
].map(([id,zh,en,type,shape,metal,price,note]) => ({ id,zh,en,type,shape,metal,price,note } as Accessory));

const byStone = Object.fromEntries(stones.map((x) => [x.id, x]));
const byAccessory = Object.fromEntries(accessories.map((x) => [x.id, x]));
// These are original, top-down product renders created specifically for the temporary OMA material library.
// They can be replaced one-for-one with the final photographed product files later.
const stonePhotos: Record<string, string> = {
  clear: "/materials/clear.png",
  amethyst: "/materials/amethyst.png",
  rose: "/materials/rose.png",
  citrine: "/materials/citrine.png",
  smoky: "/materials/smoky.png",
  aqua: "/materials/aqua.png",
  tourmaline: "/materials/tourmaline.png",
  sunstone: "/materials/sunstone.png",
  moon: "/materials/moon.png",
  moss: "/materials/moss.png",
  lapis: "/materials/lapis.png",
  garnet: "/materials/garnet.png",
  tiger: "/materials/tiger.png",
  fluorite: "/materials/fluorite.png",
  rhodonite: "/materials/rhodonite.png",
  labradorite: "/materials/labradorite.png",
};
const accessoryPhotos: Record<string, string> = {
  "silver-round": "/materials/silver-round.png",
  "gold-crown": "/materials/gold-crown.png",
  "gold-rondelle": "/materials/gold-rondelle.png",
  "silver-flower": "/materials/silver-flower.png",
  "gold-knot": "/materials/gold-knot.png",
  "silver-star": "/materials/silver-star.png",
  leaf: "/materials/leaf.png",
  "moon-charm": "/materials/silver-moon.png",
  lotus: "/materials/lotus.png",
  heart: "/materials/gold-heart.png",
  cross: "/materials/cross.png",
  key: "/materials/key.png",
  "silver-heart": "/materials/silver-heart.png",
};
const initial: DesignItem[] = ["rose","rose","rose","rose","clear","rose","rose","silver-round","rose","rose","rose","rose","rose","rose","rose","gold-rondelle","rose","rose","rose","rose","rose","rose","rose","rose","rose","lotus"].map((id, index) => accessories.some((a) => a.id === id)
  ? ({ kind: "accessory", id, uid: nextUid() })
  : ({ kind: "stone", id, size: [4, 8, 17, 21].includes(index) ? "small" : [12, 20].includes(index) ? "large" : "xlarge", uid: nextUid() }));

// draggable={false}: the browser's native image drag hijacks the pointer
// stream (firing pointercancel) and kills bead drag-reordering.
function Crystal({ stone, size = "large" }: { stone: Stone; size?: BeadSize }) {
  const photo = stonePhotos[stone.id];
  if (photo) return <span className={`crystal photo ${size}`}><img src={photo} alt={`${stone.zh} 正面實物圖`} draggable={false} /></span>;
  return <span className={`crystal ${size}`} style={{ "--c": stone.color, "--l": stone.light, "--d": stone.deep } as React.CSSProperties}><i /><b /><em /></span>;
}
function Hardware({ a, small = false }: { a: Accessory; small?: boolean }) {
  const photo = accessoryPhotos[a.id];
  if (photo) return <span className={`hardware photo ${a.type} ${small ? "small" : ""}`}><img src={photo} alt={`${a.zh} 正面實物圖`} draggable={false} /></span>;
  return <span className={`hardware ${a.metal} ${a.type} shape-${a.shape} ${small ? "small" : ""}`}><i /><b /></span>;
}
function ItemVisual({ item, small = false }: { item: DesignItem; small?: boolean }) {
  const stoneSize: BeadSize = small ? "small" : item.size ?? "large";
  return item.kind === "stone" ? <Crystal stone={byStone[item.id] as Stone} size={stoneSize} /> : <Hardware a={byAccessory[item.id] as Accessory} small={small || (byAccessory[item.id] as Accessory).type === "spacer"} />;
}
function label(item: DesignItem) { return item.kind === "stone" ? (byStone[item.id] as Stone).zh : (byAccessory[item.id] as Accessory).zh; }
function sizeLabel(size: BeadSize = "large") { return size === "xlarge" ? "10mm 大主珠" : size === "large" ? "8mm 中珠" : "6mm 小珠"; }
function itemPrice(item: DesignItem) { if (item.kind === "accessory") return (byAccessory[item.id] as Accessory).price; const base = (byStone[item.id] as Stone).price; return base + (item.size === "xlarge" ? 100 : item.size === "small" ? -50 : 0); }

const ENERGY_META = [
  { key: "wealth", zh: "豐盛", en: "WEALTH", color: "#e3b04b" },
  { key: "love", zh: "愛情", en: "LOVE", color: "#e88aa8" },
  { key: "health", zh: "療癒", en: "HEALING", color: "#7ec8a5" },
  { key: "protection", zh: "守護", en: "PROTECTION", color: "#7593d8" },
  { key: "clarity", zh: "清晰", en: "CLARITY", color: "#72c7d6" },
  { key: "energy", zh: "活力", en: "VITALITY", color: "#e0885a" },
] as const satisfies readonly { key: EnergyType; zh: string; en: string; color: string }[];

// Bigger beads carry more of the stone's energy into the design.
function energyScores(items: DesignItem[]) {
  const sizeWeight = (s?: BeadSize) => (s === "xlarge" ? 1.3 : s === "small" ? 0.7 : 1);
  const scores = { wealth: 0, love: 0, health: 0, protection: 0, clarity: 0, energy: 0 } as Record<EnergyType, number>;
  items.forEach((item) => {
    if (item.kind !== "stone") return;
    const stone = byStone[item.id] as Stone;
    const w = sizeWeight(item.size);
    ENERGY_META.forEach((m) => { scores[m.key] += stone.energy[m.key] * w * 36; });
  });
  ENERGY_META.forEach((m) => { scores[m.key] = Math.round(scores[m.key]); });
  return scores;
}

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

function EnergyPanel({ scores, total, dominant, open, onToggle }: { scores: Record<EnergyType, number>; total: number; dominant: (typeof ENERGY_META)[number]; open: boolean; onToggle: () => void }) {
  const displayTotal = useCountUp(total);
  const max = Math.max(...ENERGY_META.map((m) => scores[m.key]), 1);
  const cx = 110, cy = 92, R = 62;
  const point = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / ENERGY_META.length) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const ringPoints = (r: number) => ENERGY_META.map((_, i) => point(i, r).join(",")).join(" ");
  const valuePoints = ENERGY_META.map((m, i) => point(i, 8 + (scores[m.key] / max) * (R - 8)));
  if (!open) return <button className="energy-fab" onClick={onToggle} aria-label="展開能量矩陣">⚡<span>能量</span></button>;
  return <div className="energy-panel">
    <div className="ep-head"><b>⚡ ENERGY MATRIX</b><span>能量矩陣</span><button onClick={onToggle} aria-label="收合能量矩陣">▾</button></div>
    <svg viewBox="0 0 220 186" className="ep-chart" role="img" aria-label="六維能量雷達圖">
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
    <div className="ep-dominant">主能量 <b style={{ color: dominant.color }}>{dominant.zh} {dominant.en}</b></div>
    <div className="ep-total"><span>TOTAL ENERGY</span><b>{displayTotal.toLocaleString()}</b></div>
  </div>;
}

export default function Home() {
  const [items, setItems] = useState<DesignItem[]>(initial);
  const [tab, setTab] = useState<"crystal" | "spacer" | "charm">("crystal");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("已為你準備一條粉水晶基底手鍊");
  const [selected, setSelected] = useState<DesignItem>({ kind: "stone", id: "rose", size: "xlarge" });
  // Drag logic lives in a ref so pointerup always sees the freshest state —
  // reading it from React state raced the render loop and made quick drags
  // register as taps (deleting the bead). dragView only drives rendering.
  const dragRef = useRef<{ uid: number; startX: number; startY: number; moved: boolean } | null>(null);
  const [dragView, setDragView] = useState<{ uid: number; angle: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  useEffect(() => { if (window.innerWidth > 1200) setEnergyOpen(true); }, []);
  const stageRef = useRef<HTMLDivElement>(null);
  const library = tab === "crystal" ? stones : accessories.filter((x) => x.type === tab);
  const visible = library.filter((x) => `${x.zh} ${x.en}`.toLowerCase().includes(query.toLowerCase()));
  const add = (item: DesignItem) => { if (items.length >= 42) { setNotice("手鍊最多 42 個素材，請先點手鍊上的素材移除。"); return; } const placed = { ...item, uid: nextUid() }; setItems((v) => [...v, placed]); setSelected(placed); setNotice(`已加入 ${label(placed)}${placed.kind === "stone" ? `・${sizeLabel(placed.size)}` : ""}`); };
  const removeByUid = (uid: number) => { const item = items.find((x) => x.uid === uid); setItems((v) => v.filter((x) => x.uid !== uid)); if (item) { setSelected(item); setNotice(`已移除 ${label(item)}`); } };
  const angleForPointer = (clientX: number, clientY: number) => { const box = stageRef.current?.getBoundingClientRect(); if (!box) return 0; const x = (clientX - box.left) / box.width - .5; const y = (clientY - box.top) / box.height - .5; return Math.atan2(y, x); };
  // Live reorder while dragging: shift the bead to the slot nearest the
  // pointer. The 0.38 dead zone keeps neighbours from oscillating when the
  // pointer hovers right on a slot boundary.
  const moveToAngle = (uid: number, angle: number) => setItems((current) => {
    const from = current.findIndex((x) => x.uid === uid);
    if (from < 0 || current.length < 2) return current;
    const TAU = Math.PI * 2;
    const exact = ((((angle + Math.PI / 2) % TAU) + TAU) % TAU) / TAU * current.length;
    const target = Math.round(exact) % current.length;
    if (target === from || Math.abs(exact - Math.round(exact)) > 0.38) return current;
    const next = [...current];
    const [moving] = next.splice(from, 1);
    next.splice(target, 0, moving);
    return next;
  });
  const total = useMemo(() => items.reduce((sum, item) => sum + itemPrice(item), 680), [items]);
  const scores = useMemo(() => energyScores(items), [items]);
  const totalEnergy = ENERGY_META.reduce((sum, m) => sum + scores[m.key], 0);
  const dominant = ENERGY_META.reduce((best, m) => (scores[m.key] > scores[best.key] ? m : best), ENERGY_META[0]);
  const dominantDisplay = useCountUp(scores[dominant.key]);
  const beads = items.filter((x) => x.kind === "stone").length;
  const charms = items.filter((x) => x.kind === "accessory" && (byAccessory[x.id] as Accessory).type === "charm").length;
  const wrist = Math.min(26, 12.8 + items.length * .31).toFixed(1);
  const r = Math.min(38, 26 + Math.max(0, items.length - 14) * .42);
  const selectedInfo = selected.kind === "stone" ? byStone[selected.id] as Stone : byAccessory[selected.id] as Accessory;
  return <main className="studio">
    <DesignGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    <header className="studio-head"><a className="wordmark" href="#top">OMA <span>CRYSTAL</span></a><div className="head-note">MAKE YOUR OWN ENERGY JEWELRY</div><div className="head-actions"><button className="quiet" onClick={() => setShowGuide(true)}>? 設計指南</button><button className="quiet" onClick={() => { setItems([]); setNotice("設計已清空"); }}>清空設計</button></div></header>
    <section className="studio-shell" id="top">
      <section className="canvas-panel">
        <div className="canvas-top"><div className="stats"><span><small>COMPONENTS</small><b>{items.length}</b></span><span><small>WRIST SIZE</small><b>{wrist}<i> / 26 cm</i></b></span><span><small>CHARMS</small><b>{charms}</b></span></div><div className="price"><small>ESTIMATED TOTAL</small><b>NT$ {total.toLocaleString()}</b></div></div>
        <div className="bracelet-stage" ref={stageRef}>
          <div className="table-shadow" />
          <div className="bracelet-string" style={{ left: `${50 - r}%`, top: `${50 - r}%`, width: `${r * 2}%`, height: `${r * 2}%` }} />
          {items.map((item, i) => { const uid = item.uid as number; const isDragging = dragView?.uid === uid; const baseAngle = -Math.PI / 2 + i * ((Math.PI * 2) / items.length); const a = isDragging ? (dragView as { angle: number }).angle : baseAngle; const isCharm = item.kind === "accessory" && (byAccessory[item.id] as Accessory).type === "charm"; const charmOffset = isCharm ? 4.2 : 0; const xRadius = r + charmOffset; const yRadius = r + charmOffset; const charmRotation = (a * 180 / Math.PI) - 90; return <button key={uid} className={`design-item ${isCharm ? "is-charm" : ""} ${isDragging ? "dragging" : ""}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { uid, startX: event.clientX, startY: event.clientY, moved: false }; }} onPointerMove={(event) => { const d = dragRef.current; if (!d || d.uid !== uid) return; if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) <= 9) return; d.moved = true; const angle = angleForPointer(event.clientX, event.clientY); setDragView({ uid, angle }); moveToAngle(uid, angle); }} onPointerUp={() => { const d = dragRef.current; if (!d || d.uid !== uid) return; dragRef.current = null; setDragView(null); if (d.moved) setNotice("已調整素材位置"); else removeByUid(uid); }} onPointerCancel={() => { dragRef.current = null; setDragView(null); }} aria-label={isCharm ? "輕點移除吊飾，按住拖曳調整位置" : "輕點移除素材，按住拖曳調整位置"} title="輕點移除 · 按住拖曳調整位置" style={{ left: `${50 + Math.cos(a) * xRadius}%`, top: `${50 + Math.sin(a) * yRadius}%`, transform: `translate(-50%,-50%)${isCharm ? ` rotate(${charmRotation}deg)` : ""}` }}><ItemVisual item={item} /><span className="remove-mark">−</span></button>; })}
          {beads > 0
            ? <div className="center-intention"><small>DOMINANT ENERGY</small><b>{dominant.en}</b><span className="ci-score">{dominantDisplay.toLocaleString()}</span><span className="ci-note">{beads} NATURAL STONES · {items.length} PIECES</span></div>
            : <div className="center-intention"><small>OMA CRYSTAL</small><b>START YOUR STORY</b><span className="ci-note">從右側挑選第一顆水晶</span></div>}
          <div className="stage-tip">輕點珠子移除 · 按住拖曳調整位置</div>
        </div>
        <EnergyPanel scores={scores} total={totalEnergy} dominant={dominant} open={energyOpen} onToggle={() => setEnergyOpen((v) => !v)} />
        <div className="canvas-actions"><button onClick={() => { setItems([]); setNotice("設計已清空"); }}>清空全部</button><button onClick={() => navigator.clipboard?.writeText(`OMA CRYSTAL｜${items.length} 個素材｜NT$ ${total.toLocaleString()}`).then(() => setNotice("設計摘要已複製"))}>分享設計</button><button className="primary" onClick={() => setNotice("設計已保存，珠寶顧問將為你確認細節。")}>保存並預覽 <span>→</span></button></div>
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      </section>
      <aside className="materials-panel">
        <div className="materials-head"><p>01 — CHOOSE MATERIAL</p><h1>打造專屬<br /><em>Crystal Story</em></h1><span>點選素材加入手鍊；每一顆天然晶石皆有獨一無二的紋理。</span></div>
        <div className="tabs" aria-label="素材分類">{([["crystal","天然水晶"],["spacer","精緻隔珠"],["charm","專屬吊飾"]] as const).map(([id, name]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setQuery(""); }}>{name}</button>)}</div>
        <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "crystal" ? "搜尋水晶名稱…" : "搜尋配件名稱…"} /></label>
        <div className="library-label"><span>{tab === "crystal" ? "選擇水晶尺寸" : tab === "spacer" ? "選擇精緻隔珠" : "選擇專屬吊飾"}</span><b>{visible.length} 款素材</b></div>
        <div className="material-grid" key={`${tab}-${query}`}>{visible.length ? visible.map((x: Stone | Accessory) => {
          const item: DesignItem = tab === "crystal" ? { kind: "stone", id: x.id, size: "xlarge" } : { kind: "accessory", id: x.id };
          if (tab === "crystal") return <article className={`material-card crystal-card ${selected.id === item.id ? "selected" : ""}`} key={x.id}><button className="card-main" onClick={() => add(item)} aria-label={`加入 ${x.zh} 10mm 大主珠`}><div className="visual-wrap"><ItemVisual item={item} /><span>＋</span></div><b>{x.zh}</b><small>{x.en}</small><em>NT$ {itemPrice(item)}</em></button><div className="size-actions"><button onClick={() => add({ kind: "stone", id: x.id, size: "xlarge" })}>10mm 大主珠</button><button onClick={() => add({ kind: "stone", id: x.id, size: "large" })}>8mm 中珠</button><button onClick={() => add({ kind: "stone", id: x.id, size: "small" })}>6mm 小珠</button></div></article>;
          return <button className={`material-card ${selected.id === item.id ? "selected" : ""}`} key={x.id} onClick={() => add(item)}><div className="visual-wrap"><ItemVisual item={item} /><span>＋</span></div><b>{x.zh}</b><small>{x.en}</small><em>NT$ {x.price}</em><i>{(x as Accessory).type === "spacer" ? "精緻小隔珠" : "垂墜吊飾"}</i></button>;
        }) : <div className="empty-library"><b>這個分類暫時沒有符合的素材</b><span>請清除搜尋文字，或切換其他分類。</span></div>}</div>
        <div className="selected-detail"><div className="detail-visual"><ItemVisual item={selected} /></div><div><p>{selected.kind === "stone" ? "NATURAL STONE" : "JEWELRY DETAIL"}</p><b>{selectedInfo.zh}</b><span>{selectedInfo.note}</span></div><button onClick={() => add(selected)}>加入 <strong>＋</strong></button></div>
      </aside>
    </section>
    <section className="atelier-note"><p>THE OMA ATELIER</p><h2>把此刻的心願，串成每天看得見的光。</h2><span>所有晶石、隔珠與吊飾都可自由重排；完成後由專人確認手圍與配件細節。</span></section>
  </main>;
}
