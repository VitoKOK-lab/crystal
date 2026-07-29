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

type EnergyType = "wealth" | "will" | "decision" | "protection" | "focus" | "power";
type Rarity = "common" | "rare" | "legendary";
type Stone = { id: string; zh: string; en: string; group: string; color: string; light: string; deep: string; price: number; note: string; energy: Record<EnergyType, number> };
type Accessory = { id: string; zh: string; en: string; type: "spacer" | "charm"; shape: string; metal: "gold" | "silver"; price: number; note: string; energy?: Record<EnergyType, number> };
// Rarity is derived from price rather than hand-tagged per item — keeps the
// tier consistent as the catalogue grows instead of drifting out of sync.
const RARITY_TIER = { common: 280, rare: 450 } as const;
function rarityOf(price: number): Rarity { return price <= RARITY_TIER.common ? "common" : price <= RARITY_TIER.rare ? "rare" : "legendary"; }
const RARITY_LABEL: Record<Rarity, string> = { common: "普通", rare: "稀有", legendary: "傳說" };
type BeadSize = "xlarge" | "large" | "small";
type DesignItem = { kind: "stone" | "accessory"; id: string; size?: BeadSize; uid?: number };

// Stable per-placement identity so live drag-reordering keeps DOM nodes (and
// their pointer capture) alive while the array order changes underneath.
let uidSeq = 0;
const nextUid = () => ++uidSeq;

const stones: Stone[] = [
  ["obsidian","切面黑曜石","Faceted Black Obsidian","守護","#232323","#5c5c5c","#0a0a0a",280,"深邃切面，隔絕負能量，穩定決斷力",{wealth:3,will:6,decision:8,protection:10,focus:6,power:6}],
  ["tiger-eye","切面虎眼石","Faceted Tiger Eye","決斷","#a9762f","#e8c876","#4a2f0c",290,"琥珀光澤流動，帶來判斷力與行動的勇氣",{wealth:8,will:5,decision:9,protection:5,focus:7,power:6}],
  ["hematite","切面赤鐵礦","Faceted Hematite","意志","#71757a","#c7ccd1","#2b2d30",260,"金屬光澤沉穩接地，強化意志與防禦力",{wealth:3,will:9,decision:5,protection:8,focus:5,power:6}],
  ["smoky","圓珠茶晶","Round Smoky Quartz","專注","#5f4a3a","#a8876a","#241a12",250,"沉穩接地，釋放雜訊，收束專注力",{wealth:4,will:5,decision:5,protection:6,focus:9,power:6}],
  ["lava","圓珠消光火山岩","Round Matte Lava Rock","力量","#1c1c1c","#3f3f3f","#050505",220,"原始火山岩質地，釋放意志與爆發力",{wealth:2,will:8,decision:4,protection:5,focus:4,power:10}],
  ["goldstone","切面金沙石","Faceted Blue Goldstone","財富","#1d2b45","#5878ad","#0a1220",310,"深藍夜空中的金色星芒，象徵野心與機運",{wealth:10,will:4,decision:6,protection:3,focus:5,power:7}],
  ["rose","粉晶","Rose Quartz","意志","#df9baa","#fff3f4","#a65364",260,"溫潤粉色礦脈，安定情緒，穩固意志的核心",{wealth:2,will:9,decision:3,protection:4,focus:4,power:5}],
  ["clear","白水晶","Clear Quartz","專注","#d4e2e4","#ffffff","#8ba3a7",230,"純淨無雜訊，放大專注力與判斷的清晰度",{wealth:5,will:5,decision:7,protection:6,focus:10,power:7}],
  ["amethyst","紫水晶","Amethyst","守護","#8868b3","#eee5ff","#4e2c80",280,"深紫礦石，鎮定心神，強化守護與自制力",{wealth:3,will:7,decision:5,protection:9,focus:8,power:6}],
  ["citrine","黃水晶","Citrine","財富","#e1b254","#fff7c5","#9d6a11",300,"陽光色澤，招引機運與自信的果決",{wealth:10,will:4,decision:7,protection:3,focus:5,power:7}],
  ["aqua","海藍寶","Aquamarine","意志","#7fc6d4","#efffff","#337b8c",360,"深海般的沉靜，讓意志在壓力下依然清晰",{wealth:3,will:8,decision:6,protection:5,focus:7,power:5}],
  ["tourmaline","黑碧璽","Black Tourmaline","守護","#282a2c","#74777a","#060708",290,"極致黑色礦石，隔絕干擾，築起最強防線",{wealth:2,will:5,decision:4,protection:10,focus:5,power:6}],
  ["sunstone","太陽石","Sunstone","力量","#ce7b4f","#ffd4ad","#813820",330,"橙金色反光，點燃行動力與無畏的氣場",{wealth:6,will:6,decision:6,protection:3,focus:5,power:9}],
  ["moon","月光石","Moonstone","決斷","#bbc6e1","#ffffff","#6d78a3",320,"低調流轉的光暈，在關鍵時刻看清局勢",{wealth:3,will:6,decision:8,protection:6,focus:6,power:5}],
  ["moss","苔蘚瑪瑙","Moss Agate","意志","#779b78","#e5f3d8","#31563a",290,"沉穩生長紋理，累積不張揚的長期意志",{wealth:5,will:9,decision:4,protection:6,focus:5,power:5}],
  ["lapis","青金石","Lapis Lazuli","決斷","#315b94","#a7d9f3","#122654",330,"深藍夜色礦脈，象徵智慧與果斷的權威",{wealth:5,will:5,decision:9,protection:7,focus:7,power:6}],
  ["garnet","石榴石","Garnet","力量","#9d3753","#ffc2cb","#4d1025",310,"深紅如血的礦石，驅動持續前進的爆發力",{wealth:6,will:6,decision:5,protection:4,focus:4,power:10}],
  ["tiger","圓珠虎眼石","Round Tiger Eye","決斷","#ae7927","#ffdf84","#55340c",260,"圓潤金棕紋理，果斷俐落不拖泥帶水",{wealth:7,will:4,decision:8,protection:5,focus:6,power:6}],
  ["fluorite","螢石","Fluorite","專注","#79b69f","#e3ffe7","#3d7461",320,"多彩層次礦石，整頓雜念，鋒利思路",{wealth:3,will:5,decision:6,protection:6,focus:9,power:5}],
  ["rhodonite","薔薇輝石","Rhodonite","意志","#b96f82","#ffd8e0","#6e3445",350,"深粉帶黑紋理，修復耗損、重建意志力",{wealth:2,will:9,decision:4,protection:5,focus:5,power:6}],
  ["labradorite","拉長石","Labradorite","守護","#557883","#bfeef2","#263e55",380,"深藍流光暗湧，低調卻難以動搖的守護力",{wealth:4,will:6,decision:6,protection:10,focus:6,power:6}],
].map(([id,zh,en,group,color,light,deep,price,note,energy]) => ({ id,zh,en,group,color,light,deep,price,note,energy } as Stone));

const accessories: Accessory[] = [
  ["gold-hex","金色六角框隔珠","Gold Hex Frame Spacer","spacer","hex","gold",150,"俐落線條，界定每段能量"],
  ["silver-hex","銀色六角框隔珠","Silver Hex Frame Spacer","spacer","hex","silver",140,"冷冽金屬感，中和石材重量"],
  ["compass","金色羅盤吊飾","Gold Compass Charm","charm","compass","gold",460,"讓決斷始終指向目標"],
  ["arrow","金屬箭頭吊飾","Metal Arrow Charm","charm","arrow","gold",420,"直線前進，象徵意志與力量"],
  ["silver-round","銀圓隔珠","Sterling Silver Round","spacer","round","silver",90,"鏡面拋光，簡練俐落的分段"],
  ["silver-heart","銀立體隔珠","Sterling Silver Heart","spacer","heart","silver",160,"低調立體造型，作為視覺焦點"],
  ["gold-rondelle","鍍金方鑽隔珠","Gold Crystal Rondelle","spacer","rondelle","gold",140,"光線下細微閃爍，增添層次"],
  ["silver-flower","銀雕花隔珠","Silver Filigree","spacer","flower","silver",120,"手工雕花紋理，粗獷中見細節"],
  ["gold-knot","金繩結隔珠","Gold Knot Spacer","spacer","knot","gold",130,"繩結造型，象徵牢牢守住的目標"],
  ["silver-star","銀星芒隔珠","Silver Star Spacer","spacer","star","silver",120,"細小星芒，暗夜中的座標"],
  ["gold-crown","金皇冠隔珠","Gold Crown Spacer","spacer","crown","gold",160,"皇冠輪廓，為主石留出焦點"],
  ["leaf","金葉吊飾","Golden Leaf Charm","charm","leaf","gold",390,"破土而生的姿態，象徵持續成長"],
  ["moon-charm","月亮吊飾","Moon Charm","charm","moon","silver",390,"夜行者的座標，沉靜中蓄積力量"],
  ["lotus","蓮花吊飾","Lotus Charm","charm","lotus","gold",490,"泥中不染，淬鍊後的從容"],
  ["heart","赤誠吊飾","Heart Charm","charm","heart","gold",420,"純粹的初衷，提醒自己為何出發"],
  ["cross","守護十字吊飾","Cross Charm","charm","cross","silver",490,"低調堅定，扛住每一次風浪"],
  ["key","掌控鑰匙吊飾","Lucky Key Charm","charm","key","gold",450,"掌握開啟下一步的主動權"],
  ["butterfly","蛻變吊飾","Butterfly Charm","charm","butterfly","gold",520,"破繭姿態，提醒自己敢於蛻變"],
  ["evil-eye","守護之眼吊飾","Evil Eye Charm","charm","evil-eye","silver",480,"警醒之眼，阻擋來自四面的干擾"],
  ["sun-charm","太陽吊飾","Sunray Charm","charm","sun","gold",470,"每天為自己點亮一次氣場"],
  ["star-charm","目標星吊飾","Wish Star Charm","charm","wish-star","silver",430,"把目標釘進日常，時刻可見"],
  ["shell","遠航貝殼吊飾","Seashell Charm","charm","shell","gold",460,"見過風浪，依然自在前行"],
  ["travel-compass","旅行羅盤吊飾","Travel Compass Charm","charm","compass","silver",540,"無論走到哪，心裡有一個方向"],
  ["angel-wing","守護之翼吊飾","Angel Wing Charm","charm","wing","silver",510,"低調的後盾，安靜地在背後撐著"],
  ["clover","幸運草吊飾","Four Leaf Clover Charm","charm","clover","gold",500,"收下恰到好處的運氣，其餘靠實力"],
  ["lock","承諾鎖頭吊飾","Love Lock Charm","charm","lock","gold",490,"鎖住說出口的承諾"],
  ["hamsa","平安手掌吊飾","Hamsa Charm","charm","hamsa","silver",520,"掌心向外，擋下多餘的雜訊"],
].map(([id,zh,en,type,shape,metal,price,note]) => ({ id,zh,en,type,shape,metal,price,note } as Accessory));

const byStone = Object.fromEntries(stones.map((x) => [x.id, x]));
const byAccessory = Object.fromEntries(accessories.map((x) => [x.id, x]));
// These are original, top-down product renders created specifically for the temporary OMA material library.
// They can be replaced one-for-one with the final photographed product files later.
const stonePhotos: Record<string, string> = {
  obsidian: "/materials/men/obsidian.png",
  "tiger-eye": "/materials/men/tiger-eye.png",
  hematite: "/materials/men/hematite.png",
  smoky: "/materials/men/smoky.png",
  lava: "/materials/men/lava.png",
  goldstone: "/materials/men/goldstone.png",
  clear: "/materials/clear.png",
  amethyst: "/materials/amethyst.png",
  rose: "/materials/rose.png",
  citrine: "/materials/citrine.png",
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
  "gold-hex": "/materials/men/gold-hex.png",
  "silver-hex": "/materials/men/silver-hex.png",
  compass: "/materials/men/compass.png",
  arrow: "/materials/men/arrow.png",
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
// Starter design sums to ~14.3 cm — comfortably inside the default 16 cm
// wrist: one 20mm focal bead, 10mm rounds, 8mm accents, spacers and a charm.
const initialSpec: [string, BeadSize?][] = [["obsidian","xlarge"],["obsidian","large"],["tiger-eye","large"],["hematite","small"],["obsidian","large"],["gold-hex"],["tiger-eye","small"],["obsidian","large"],["hematite","small"],["silver-hex"],["obsidian","large"],["tiger-eye","small"],["obsidian","large"],["hematite","small"],["obsidian","large"],["compass"]];
const buildSpec = (spec: [string, BeadSize?][]): DesignItem[] => spec.map(([id, size]) => accessories.some((a) => a.id === id)
  ? ({ kind: "accessory", id, uid: nextUid() })
  : ({ kind: "stone", id, size: size ?? "large", uid: nextUid() }));
const initial: DesignItem[] = buildSpec(initialSpec);

// One-tap energy recipes: stones weighted toward each intention's energy
// profile, padded with the theme stone to fill the wearer's wrist.
const PRESETS = {
  power: { name: "力量掌控", pad: "obsidian", spec: [["obsidian","xlarge"],["lava","large"],["obsidian","large"],["hematite","large"],["lava","small"],["gold-hex"],["obsidian","large"],["hematite","large"],["lava","small"],["gold-hex"],["obsidian","large"],["lava","large"],["hematite","small"],["obsidian","large"],["arrow"]] as [string, BeadSize?][] },
  wealth: { name: "財富機運", pad: "goldstone", spec: [["goldstone","xlarge"],["tiger-eye","large"],["goldstone","large"],["tiger-eye","large"],["hematite","small"],["gold-hex"],["goldstone","large"],["tiger-eye","large"],["hematite","small"],["gold-hex"],["goldstone","large"],["tiger-eye","large"],["hematite","small"],["goldstone","large"],["compass"]] as [string, BeadSize?][] },
  focus: { name: "決斷專注", pad: "smoky", spec: [["tiger-eye","xlarge"],["smoky","large"],["obsidian","large"],["smoky","large"],["hematite","small"],["silver-hex"],["tiger-eye","large"],["smoky","large"],["hematite","small"],["silver-hex"],["obsidian","large"],["smoky","large"],["hematite","small"],["tiger-eye","large"],["compass"]] as [string, BeadSize?][] },
  gym: { name: "健身房戰袍", pad: "lava", spec: [["garnet","xlarge"],["lava","large"],["sunstone","large"],["hematite","large"],["lava","small"],["gold-hex"],["garnet","large"],["lava","large"],["sunstone","small"],["gold-hex"],["hematite","large"],["garnet","large"],["lava","small"],["sunstone","large"],["arrow"]] as [string, BeadSize?][] },
  office: { name: "辦公室決戰", pad: "lapis", spec: [["lapis","xlarge"],["moon","large"],["tiger-eye","large"],["clear","large"],["moon","small"],["silver-hex"],["lapis","large"],["tiger-eye","large"],["clear","small"],["silver-hex"],["moon","large"],["lapis","large"],["clear","small"],["tiger-eye","large"],["key"]] as [string, BeadSize?][] },
  travel: { name: "出差遠征", pad: "labradorite", spec: [["labradorite","xlarge"],["tourmaline","large"],["amethyst","large"],["obsidian","large"],["tourmaline","small"],["silver-hex"],["labradorite","large"],["amethyst","large"],["tourmaline","small"],["silver-hex"],["obsidian","large"],["labradorite","large"],["amethyst","small"],["tourmaline","large"],["travel-compass"]] as [string, BeadSize?][] },
} as const;

// Shareable design links: ?d=<wrist>|<id>.<size>,<id>,…
const encodeDesign = (items: DesignItem[], wristCm: number) => `${wristCm}|` + items.map((it) => it.kind === "stone" ? `${it.id}.${it.size === "xlarge" ? "x" : it.size === "small" ? "s" : "l"}` : it.id).join(",");
function decodeDesign(code: string): { wrist: number; items: DesignItem[] } | null {
  try {
    const [w, list] = code.split("|");
    const wrist = Number(w);
    if (!WRIST_CHOICES.includes(wrist) || !list) return null;
    const items: DesignItem[] = [];
    for (const token of list.split(",")) {
      const [id, sz] = token.split(".");
      if (byStone[id]) items.push({ kind: "stone", id, size: sz === "x" ? "xlarge" : sz === "s" ? "small" : "large", uid: nextUid() });
      else if (byAccessory[id]) items.push({ kind: "accessory", id, uid: nextUid() });
      else return null;
    }
    if (!items.length || items.length > 42) return null;
    if (items.reduce((sum, it) => sum + itemMM(it), 0) > wrist * 10) return null;
    return { wrist, items };
  } catch { return null; }
}

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
function sizeLabel(size: BeadSize = "large") { return size === "xlarge" ? "20mm 特大主珠" : size === "large" ? "10mm 大珠" : "8mm 中珠"; }
function itemPrice(item: DesignItem) { if (item.kind === "accessory") return (byAccessory[item.id] as Accessory).price; const base = (byStone[item.id] as Stone).price; return base + (item.size === "xlarge" ? 320 : item.size === "small" ? 0 : 80); }
// Physical width each piece occupies on the strand, in millimetres. The user
// picks a wrist size first; its circumference (cm × 10) is the fixed capacity
// that beads fill up — adding stones never grows the wrist.
const BEAD_MM: Record<BeadSize, number> = { xlarge: 20, large: 10, small: 8 };
const WRIST_CHOICES = Array.from({ length: 19 }, (_, i) => 13 + i * 0.5);
// Rendering scale: stage percent per physical millimetre. Ring radius and
// bead diameters share it, so beads sit tangent along the cord — a 20mm bead
// truly draws twice as wide as a 10mm one and neighbours never overlap.
const PCT_PER_MM = 0.95;
function itemMM(item: DesignItem) { if (item.kind === "stone") return BEAD_MM[item.size ?? "large"]; return (byAccessory[item.id] as Accessory).type === "spacer" ? 5 : 3; }

const ENERGY_META = [
  { key: "wealth", zh: "財富", en: "WEALTH", color: "#c9a355" },
  { key: "will", zh: "意志", en: "WILL", color: "#a8977a" },
  { key: "decision", zh: "決斷", en: "DECISION", color: "#c7cdd3" },
  { key: "protection", zh: "守護", en: "PROTECTION", color: "#7d8896" },
  { key: "focus", zh: "專注", en: "FOCUS", color: "#8a6d1f" },
  { key: "power", zh: "力量", en: "POWER", color: "#e3c179" },
] as const satisfies readonly { key: EnergyType; zh: string; en: string; color: string }[];

// Bigger beads carry more of the stone's energy into the design.
function energyScores(items: DesignItem[]) {
  const sizeWeight = (s?: BeadSize) => (s === "xlarge" ? 1.6 : s === "small" ? 0.8 : 1);
  const scores = { wealth: 0, will: 0, decision: 0, protection: 0, focus: 0, power: 0 } as Record<EnergyType, number>;
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
  if (!open) return <button className="energy-fab" onClick={onToggle} aria-label="展開戰力矩陣"><span>戰力</span></button>;
  return <div className="energy-panel">
    <div className="ep-head"><b>POWER MATRIX</b><span>戰力矩陣</span><button onClick={onToggle} aria-label="收合戰力矩陣">▾</button></div>
    <svg viewBox="0 0 220 186" className="ep-chart" role="img" aria-label="六維戰力雷達圖">
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
    <div className="ep-dominant">主屬性 <b style={{ color: dominant.color }}>{dominant.zh} {dominant.en}</b></div>
    <div className="ep-total"><span>TOTAL POWER</span><b>{displayTotal.toLocaleString()}</b></div>
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
  const [view, setView] = useState<"home" | "studio" | "checkout">("home");
  const [wristCm, setWristCm] = useState(16);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  useEffect(() => { if (window.innerWidth > 1200) setEnergyOpen(true); }, []);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("d");
    if (!code) return;
    const decoded = decodeDesign(code);
    if (!decoded) return;
    setItems(decoded.items);
    setWristCm(decoded.wrist);
    setNotice("已載入分享的設計，可以直接調整或結帳");
    setView("studio");
  }, []);
  const stageRef = useRef<HTMLDivElement>(null);
  const library = tab === "crystal" ? stones : accessories.filter((x) => x.type === tab);
  const visible = library.filter((x) => `${x.zh} ${x.en}`.toLowerCase().includes(query.toLowerCase()));
  const strandMM = useMemo(() => items.reduce((sum, it) => sum + itemMM(it), 0), [items]);
  const capacityMM = wristCm * 10;
  // Adding always succeeds while the max wrist can hold it: the wrist grows
  // automatically to fit. Shrinking is only ever done by hand via the selector.
  const add = (item: DesignItem) => {
    const needMM = strandMM + itemMM(item);
    let cm = wristCm;
    if (needMM > cm * 10) {
      const grown = WRIST_CHOICES.find((c) => c * 10 >= needMM);
      if (!grown) { setNotice(`已達最大手圍 ${WRIST_CHOICES[WRIST_CHOICES.length - 1]} cm，放不下${label(item)}了，請先移除部分素材。`); return; }
      cm = grown; setWristCm(grown);
    }
    const placed = { ...item, uid: nextUid() }; setItems((v) => [...v, placed]); setSelected(placed);
    setNotice(`已加入 ${label(placed)}${placed.kind === "stone" ? `・${sizeLabel(placed.size)}` : ""}${cm !== wristCm ? `・手圍自動放大為 ${cm} cm` : `・已串 ${(needMM / 10).toFixed(1)} / ${cm} cm`}`);
  };
  const shareDesign = async () => {
    if (!items.length) { setNotice("先加入素材，再分享你的設計！"); return; }
    setNotice("正在產生分享卡…");
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
        await navigator.share({ files: [file], title: "OMA CRYSTAL", text: `我的專屬戰力手鍊 ${url}`, url });
        setNotice("已開啟分享面板");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "oma-crystal-design.png";
        a.click();
        URL.revokeObjectURL(a.href);
        await navigator.clipboard?.writeText(url);
        setNotice("分享卡已下載，設計連結已複製 — 貼給朋友就能看到同款");
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") { setNotice(""); return; }
      await navigator.clipboard?.writeText(url).catch(() => {});
      setNotice("分享卡產生失敗，已改為複製設計連結");
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
    setNotice(`已為你搭配「${preset.name}」戰力手鍊，可再自由調整`);
  };
  const changeWrist = (cm: number) => {
    if (strandMM > cm * 10) { setNotice(`目前已串 ${(strandMM / 10).toFixed(1)} cm，超過手圍 ${cm} cm 的容量，請先移除部分素材。`); return; }
    setWristCm(cm); setNotice(`手圍已設定為 ${cm} cm`);
  };
  const removeByUid = (uid: number) => { const item = items.find((x) => x.uid === uid); setItems((v) => v.filter((x) => x.uid !== uid)); if (item) { setSelected(item); setNotice(`已移除 ${label(item)}`); } };
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
  const total = useMemo(() => items.reduce((sum, item) => sum + itemPrice(item), 680), [items]);
  const scores = useMemo(() => energyScores(items), [items]);
  const totalEnergy = ENERGY_META.reduce((sum, m) => sum + scores[m.key], 0);
  const dominant = ENERGY_META.reduce((best, m) => (scores[m.key] > scores[best.key] ? m : best), ENERGY_META[0]);
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
  const r = (capacityMM / (Math.PI * 2)) * PCT_PER_MM;
  const arcs = useMemo(() => { let cum = 0; return items.map((it) => { const w = itemMM(it); const centerMM = cum + w / 2; cum += w; return { w, angle: -Math.PI / 2 + (centerMM / capacityMM) * Math.PI * 2 }; }); }, [items, capacityMM]);
  const selectedInfo = selected.kind === "stone" ? byStone[selected.id] as Stone : byAccessory[selected.id] as Accessory;
  if (view === "home") return <LandingHome onStart={() => { setView("studio"); window.scrollTo({ top: 0 }); }} />;
  return <main className={`studio ${drawerOpen ? "" : "drawer-collapsed"}`}>
    <DesignGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    {previewOpen && <Preview pieces={previewPieces} capacityMM={capacityMM} onClose={() => setPreviewOpen(false)} />}
    <header className="studio-head"><button className="wordmark" onClick={() => setView("home")}>OMA <span>CRYSTAL</span></button><div className="head-note">FORGE YOUR OWN POWER</div><div className="head-actions"><button className="quiet" onClick={() => setShowGuide(true)}>? 設計指南</button><button className="quiet" onClick={() => { setItems([]); setNotice("設計已清空"); }}>清空設計</button></div></header>
    {view === "checkout" ? <Checkout lines={orderLines} baseFee={680} dominant={dominant} totalEnergy={totalEnergy} initialWrist={wristCm} onBack={() => setView("studio")} /> : <>
    <section className="studio-shell" id="top">
      <section className="canvas-panel">
        <div className="canvas-top"><div className="stats"><span><small>WRIST SIZE 手圍</small><b><select className="wrist-select" value={wristCm} onChange={(e) => changeWrist(Number(e.target.value))} aria-label="選擇手圍尺寸">{WRIST_CHOICES.map((cm) => <option key={cm} value={cm}>{cm} cm</option>)}</select></b></span><span><small>STRUNG 已串</small><b>{strung}<i> / {wristCm} cm</i></b><span className={`wrist-bar ${fillRatio >= 1 ? "full" : fillRatio > 0.9 ? "warn" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={wristCm} aria-valuenow={Number(strung)} aria-label="已串長度"><i style={{ width: `${Math.min(100, fillRatio * 100)}%` }} /></span></span><span><small>CHARMS</small><b>{charms}</b></span></div><div className="price"><small>ESTIMATED TOTAL</small><b>NT$ {total.toLocaleString()}</b></div></div>
        <div className="bracelet-stage" ref={stageRef}>
          <div className="table-shadow" />
          <div className="bracelet-string" style={{ left: `${50 - r}%`, top: `${50 - r}%`, width: `${r * 2}%`, height: `${r * 2}%` }} />
          {items.map((item, i) => { const uid = item.uid as number; const isDragging = dragView?.uid === uid; const a = isDragging ? (dragView as { angle: number }).angle : arcs[i].angle; const isCharm = item.kind === "accessory" && (byAccessory[item.id] as Accessory).type === "charm"; const sizePct = isCharm ? 10.5 : arcs[i].w * PCT_PER_MM; const orbit = isCharm ? r + 5 : r; const charmRotation = (a * 180 / Math.PI) - 90; const stoneRotation = (a * 180 / Math.PI) + 90; return <button key={uid} className={`design-item ${isCharm ? "is-charm" : ""} ${isDragging ? "dragging" : ""}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { uid, startX: event.clientX, startY: event.clientY, moved: false }; }} onPointerMove={(event) => { const d = dragRef.current; if (!d || d.uid !== uid) return; if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) <= 9) return; d.moved = true; const angle = angleForPointer(event.clientX, event.clientY); setDragView({ uid, angle }); moveToAngle(uid, angle); }} onPointerUp={() => { const d = dragRef.current; if (!d || d.uid !== uid) return; dragRef.current = null; setDragView(null); if (d.moved) setNotice("已調整素材位置"); else removeByUid(uid); }} onPointerCancel={() => { dragRef.current = null; setDragView(null); }} aria-label={isCharm ? "輕點移除吊飾，按住拖曳調整位置" : "輕點移除素材，按住拖曳調整位置"} title="輕點移除 · 按住拖曳調整位置" style={{ left: `${50 + Math.cos(a) * orbit}%`, top: `${50 + Math.sin(a) * orbit}%`, width: `${sizePct}%`, height: `${sizePct}%`, transform: `translate(-50%,-50%) rotate(${isCharm ? charmRotation : stoneRotation}deg)` }}><ItemVisual item={item} /><span className="remove-mark">−</span></button>; })}
          {beads > 0
            ? <div className="center-intention"><small>DOMINANT POWER</small><b>{dominant.en}</b><span className="ci-score">{dominantDisplay.toLocaleString()}</span><span className="ci-note">{beads} NATURAL STONES · {items.length} PIECES</span></div>
            : <div className="center-intention"><small>OMA CRYSTAL</small><b>START YOUR STORY</b><span className="ci-note">從右側挑選第一顆水晶</span></div>}
          <div className="stage-tip">輕點珠子移除 · 按住拖曳調整位置</div>
        </div>
        <EnergyPanel scores={scores} total={totalEnergy} dominant={dominant} open={energyOpen} onToggle={() => setEnergyOpen((v) => !v)} />
        <div className="canvas-actions"><button onClick={() => { setItems([]); setNotice("設計已清空"); }}>清空全部</button><button onClick={shareDesign}>分享設計</button><button className="pv-open" onClick={() => { if (!items.length) { setNotice("先加入素材，再看立體預覽！"); return; } setPreviewOpen(true); }}>360° 預覽</button><button className="primary" onClick={() => { if (!items.length) { setNotice("手鍊還是空的，先加入素材再結帳吧！"); return; } if (fillRatio < 0.8) { setNotice(`手圍 ${wristCm} cm 目前只串了 ${strung} cm，至少串滿八成（${(wristCm * 0.8).toFixed(1)} cm）配戴才服貼，再加幾顆珠子吧！`); return; } setView("checkout"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>前往結帳 <span>→</span></button></div>
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      </section>
      <aside className={`materials-panel ${drawerOpen ? "" : "collapsed"}`}>
        <button className="drawer-handle" onClick={() => setDrawerOpen((v) => !v)} aria-expanded={drawerOpen} aria-label={drawerOpen ? "收起素材選擇區" : "展開素材選擇區"}><i /><span>{drawerOpen ? "收起選項" : "選擇水晶與配件"}</span></button>
        <div className="drawer-body">
        <div className="materials-head"><p>01 — CHOOSE MATERIAL</p><h1>打造專屬<br /><em>Crystal Story</em></h1><span>點選素材加入手鍊；每一顆天然晶石皆有獨一無二的紋理。</span></div>
        <div className="preset-row" aria-label="一鍵戰力搭配"><span>一鍵<br />搭配</span>{(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => <button key={key} onClick={() => applyPreset(key)}>{PRESETS[key].name}</button>)}</div>
        <div className="tabs" aria-label="素材分類">{([["crystal","天然水晶"],["spacer","精緻隔珠"],["charm","專屬吊飾"]] as const).map(([id, name]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setQuery(""); }}>{name}</button>)}</div>
        <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "crystal" ? "搜尋水晶名稱…" : "搜尋配件名稱…"} /></label>
        <div className="library-label"><span>{tab === "crystal" ? "選擇水晶尺寸" : tab === "spacer" ? "選擇精緻隔珠" : "選擇專屬吊飾"}</span><b>{visible.length} 款素材</b></div>
        <div className="material-grid" key={`${tab}-${query}`}>{visible.length ? visible.map((x: Stone | Accessory) => {
          const item: DesignItem = tab === "crystal" ? { kind: "stone", id: x.id, size: "large" } : { kind: "accessory", id: x.id };
          const tier = rarityOf(x.price);
          if (tab === "crystal") return <article className={`material-card crystal-card rarity-${tier} ${selected.id === item.id ? "selected" : ""}`} key={x.id}><span className="rarity-tag">{RARITY_LABEL[tier]}</span><button className="card-main" onClick={() => add(item)} aria-label={`加入 ${x.zh} 10mm 大珠`}><div className="visual-wrap"><ItemVisual item={item} /><span>＋</span></div><b>{x.zh}</b><small>{x.en}</small><em>NT$ {itemPrice(item)}</em></button><div className="size-actions"><button onClick={() => add({ kind: "stone", id: x.id, size: "xlarge" })} aria-label="加入 20mm 特大主珠">20mm</button><button onClick={() => add({ kind: "stone", id: x.id, size: "large" })} aria-label="加入 10mm 大珠">10mm</button><button onClick={() => add({ kind: "stone", id: x.id, size: "small" })} aria-label="加入 8mm 中珠">8mm</button></div></article>;
          return <button className={`material-card rarity-${tier} ${selected.id === item.id ? "selected" : ""}`} key={x.id} onClick={() => add(item)}><span className="rarity-tag">{RARITY_LABEL[tier]}</span><div className="visual-wrap"><ItemVisual item={item} /><span>＋</span></div><b>{x.zh}</b><small>{x.en}</small><em>NT$ {x.price}</em><i>{(x as Accessory).type === "spacer" ? "精緻小隔珠" : "垂墜吊飾"}</i></button>;
        }) : <div className="empty-library"><b>這個分類暫時沒有符合的素材</b><span>請清除搜尋文字，或切換其他分類。</span></div>}</div>
        <div className="selected-detail"><div className="detail-visual"><ItemVisual item={selected} /></div><div><p>{selected.kind === "stone" ? "NATURAL STONE" : "JEWELRY DETAIL"} · <span className={`sd-rarity rarity-${rarityOf(selectedInfo.price)}`}>{RARITY_LABEL[rarityOf(selectedInfo.price)]}</span></p><b>{selectedInfo.zh}</b><span>{selectedInfo.note}</span></div><button onClick={() => add(selected)}>加入 <strong>＋</strong></button></div>
        </div>
      </aside>
    </section>
    <section className="atelier-note"><p>THE OMA ATELIER</p><h2>把此刻的心願，串成每天看得見的光。</h2><span>所有晶石、隔珠與吊飾都可自由重排；完成後由專人確認手圍與配件細節。</span></section>
    </>}
  </main>;
}
