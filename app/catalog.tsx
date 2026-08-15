"use client";

// Shared material catalogue for the whole site.
//
// The men's line and the women's line used to be two separate apps with two
// incompatible six-dimension energy systems (女: 豐盛/愛情/療癒/守護/清晰/活力,
// 男: 財富/意志/決斷/守護/專注/力量 — only wealth and protection overlapped).
// Merging them into one storefront meant collapsing those into a single set
// that reads honestly for every series: the two shared axes stay, love and
// healing come across from the women's set, and focus/power absorb the
// near-synonyms from both (清晰≈專注, 活力≈力量). Every stone below carries
// freshly-authored weights on that unified scale rather than a mechanical
// copy of either old table.
//
// page.tsx and shop.tsx both import from here — keeping the data in its own
// module is what stops those two from importing each other in a cycle.

export type EnergyType = "wealth" | "love" | "healing" | "protection" | "focus" | "power";
export type Rarity = "common" | "rare" | "legendary";
export type BeadSize = "xlarge" | "large" | "small";
export type Stone = { id: string; zh: string; en: string; group: string; price: number; note: string; energy: Record<EnergyType, number> };
export type Accessory = { id: string; zh: string; en: string; type: "spacer" | "charm"; metal: "gold" | "silver"; price: number; note: string };
// `mm` is the authoritative diameter when present (admin-defined ladders can
// hold any size); `size` remains for designs authored against the original
// named trio, including every share link already in the wild.
export type DesignItem = { kind: "stone" | "accessory"; id: string; size?: BeadSize; mm?: number; uid?: number };

// Rarity is derived from price rather than hand-tagged per item — keeps the
// tier consistent as the catalogue grows instead of drifting out of sync.
const RARITY_TIER = { common: 280, rare: 450 } as const;
export function rarityOf(price: number): Rarity { return price <= RARITY_TIER.common ? "common" : price <= RARITY_TIER.rare ? "rare" : "legendary"; }
export const RARITY_LABEL: Record<Rarity, string> = { common: "普通", rare: "稀有", legendary: "傳說" };

// Stable per-placement identity so live drag-reordering keeps DOM nodes (and
// their pointer capture) alive while the array order changes underneath.
let uidSeq = 0;
export const nextUid = () => ++uidSeq;

export const ENERGY_META = [
  { key: "wealth", zh: "財富", en: "WEALTH", color: "#c9a355" },
  { key: "love", zh: "愛情", en: "LOVE", color: "#e88aa8" },
  { key: "healing", zh: "療癒", en: "HEALING", color: "#7ec8a5" },
  { key: "protection", zh: "守護", en: "PROTECTION", color: "#7d8896" },
  { key: "focus", zh: "專注", en: "FOCUS", color: "#72c7d6" },
  { key: "power", zh: "力量", en: "POWER", color: "#e0885a" },
] as const satisfies readonly { key: EnergyType; zh: string; en: string; color: string }[];

export const stones: Stone[] = ([
  ["obsidian","切面黑曜石","Faceted Black Obsidian","守護",280,"深邃切面，隔絕雜訊，穩住心神",{wealth:3,love:2,healing:5,protection:10,focus:6,power:6}],
  ["tiger-eye","切面虎眼石","Faceted Tiger Eye","財富",290,"琥珀光澤流動，帶來判斷力與行動的勇氣",{wealth:8,love:3,healing:5,protection:5,focus:7,power:7}],
  ["hematite","切面赤鐵礦","Faceted Hematite","守護",260,"金屬光澤沉穩接地，強化意志與防禦",{wealth:3,love:3,healing:6,protection:8,focus:5,power:7}],
  ["smoky","圓珠茶晶","Round Smoky Quartz","專注",250,"沉穩落地，釋放雜訊，收束專注力",{wealth:4,love:3,healing:7,protection:7,focus:9,power:5}],
  ["lava","圓珠消光火山岩","Round Matte Lava Rock","力量",220,"原始火山岩質地，釋放爆發力",{wealth:2,love:2,healing:5,protection:5,focus:4,power:10}],
  ["goldstone","切面金沙石","Faceted Blue Goldstone","財富",310,"深藍夜空中的金色星芒，象徵野心與機運",{wealth:10,love:4,healing:4,protection:3,focus:5,power:7}],
  ["rose","粉水晶","Rose Quartz","愛情",260,"溫柔、親密與自我接納",{wealth:2,love:9,healing:7,protection:3,focus:4,power:5}],
  ["clear","白水晶","Clear Quartz","專注",230,"清晰思緒，放大你的意圖",{wealth:6,love:5,healing:6,protection:7,focus:10,power:8}],
  ["amethyst","紫水晶","Amethyst","守護",280,"安定心緒，保持內在平衡",{wealth:4,love:6,healing:8,protection:9,focus:9,power:7}],
  ["citrine","黃水晶","Citrine","財富",300,"邀請豐盛與自信前來",{wealth:10,love:4,healing:5,protection:4,focus:6,power:8}],
  ["aqua","海藍寶","Aquamarine","療癒",360,"像海一樣清澈、自在",{wealth:3,love:8,healing:9,protection:5,focus:8,power:6}],
  ["tourmaline","黑碧璽","Black Tourmaline","守護",290,"穩定界線，沉靜守護",{wealth:2,love:3,healing:6,protection:10,focus:5,power:5}],
  ["sunstone","太陽石","Sunstone","力量",330,"把勇氣帶到每一步",{wealth:7,love:5,healing:8,protection:4,focus:6,power:9}],
  ["moon","月光石","Moonstone","療癒",320,"柔和直覺，照亮新開始",{wealth:3,love:7,healing:8,protection:6,focus:7,power:6}],
  ["moss","苔蘚瑪瑙","Moss Agate","療癒",290,"穩定生長，回到自己的節奏",{wealth:6,love:4,healing:9,protection:7,focus:5,power:5}],
  ["lapis","青金石","Lapis Lazuli","專注",330,"誠實表達，連結內在智慧",{wealth:5,love:6,healing:7,protection:8,focus:8,power:7}],
  ["garnet","石榴石","Garnet","力量",310,"熱情與持續前進的力量",{wealth:7,love:7,healing:6,protection:5,focus:4,power:10}],
  ["tiger","圓珠虎眼石","Round Tiger Eye","財富",260,"圓潤金棕紋理，專注果斷不拖泥帶水",{wealth:8,love:3,healing:7,protection:6,focus:7,power:7}],
  ["fluorite","螢石","Fluorite","專注",320,"整理思緒，溫柔淨化",{wealth:3,love:5,healing:8,protection:7,focus:9,power:6}],
  ["rhodonite","薔薇輝石","Rhodonite","愛情",350,"修復關係與勇敢去愛",{wealth:2,love:10,healing:7,protection:5,focus:5,power:6}],
  ["labradorite","拉長石","Labradorite","守護",380,"低調光芒，守護你的能量",{wealth:4,love:5,healing:6,protection:10,focus:7,power:7}],
] as const).map(([id,zh,en,group,price,note,energy]) => ({ id,zh,en,group,price,note,energy } as Stone));

export const accessories: Accessory[] = ([
  ["gold-hex","金色六角框隔珠","Gold Hex Frame Spacer","spacer","gold",150,"俐落線條，界定每段能量"],
  ["silver-hex","銀色六角框隔珠","Silver Hex Frame Spacer","spacer","silver",140,"冷冽金屬感，中和石材重量"],
  ["compass","金色羅盤吊飾","Gold Compass Charm","charm","gold",460,"讓決斷始終指向目標"],
  ["arrow","金屬箭頭吊飾","Metal Arrow Charm","charm","gold",420,"直線前進，象徵意志與力量"],
  ["silver-round","銀圓隔珠","Sterling Silver Round","spacer","silver",90,"鏡面拋光，簡練俐落的分段"],
  ["silver-heart","銀立體隔珠","Sterling Silver Heart","spacer","silver",160,"低調立體造型，作為視覺焦點"],
  ["gold-rondelle","鍍金方鑽隔珠","Gold Crystal Rondelle","spacer","gold",140,"光線下細微閃爍，增添層次"],
  ["silver-flower","銀雕花隔珠","Silver Filigree","spacer","silver",120,"手工雕花紋理，粗獷中見細節"],
  ["gold-knot","金繩結隔珠","Gold Knot Spacer","spacer","gold",130,"繩結造型，象徵牢牢守住的目標"],
  ["silver-star","銀星芒隔珠","Silver Star Spacer","spacer","silver",120,"細小星芒，暗夜中的座標"],
  ["gold-crown","金皇冠隔珠","Gold Crown Spacer","spacer","gold",160,"皇冠輪廓，為主石留出焦點"],
  ["silver-cube","銀方塊隔珠","Silver Cube Spacer","spacer","silver",110,"俐落切角，穩固不晃動的存在感"],
  ["silver-groove","銀刻紋隔珠","Silver Ridged Spacer","spacer","silver",90,"簡練刻紋，低調卻紮實的存在"],
  ["silver-rivet","銀鉚釘隔珠","Silver Rivet Spacer","spacer","silver",100,"工業鉚釘感，粗獷中透出精工"],
  ["silver-chain","銀鏈環隔珠","Silver Chain-Link Spacer","spacer","silver",130,"鏈環相扣，穩穩串起每一段決心"],
  ["silver-shield","銀盾牌隔珠","Silver Shield Spacer","spacer","silver",150,"盾形輪廓，象徵扛下風浪的肩膀"],
  ["silver-dragon","銀鱗紋隔珠","Silver Dragon-Scale Spacer","spacer","silver",170,"鱗紋刻痕，蓄勢待發的沉穩力量"],
  ["silver-skull","銀骷髏隔珠","Silver Skull Spacer","spacer","silver",180,"強悍圖騰，提醒自己無畏向前"],
  ["silver-tiger-spacer","銀虎首隔珠","Silver Tiger Head Spacer","spacer","silver",190,"虎首鎮守，果斷出擊不留餘地"],
  ["silver-pixiu","銀貔貅隔珠","Silver Pixiu Spacer","spacer","silver",220,"招財神獸，只進不出的守財象徵"],
  ["gold-pixiu","金貔貅隔珠","Gold Pixiu Spacer","spacer","gold",240,"金色神獸，鎮守財路的低調宣言"],
  ["leaf","金葉吊飾","Golden Leaf Charm","charm","gold",390,"破土而生的姿態，象徵持續成長"],
  ["moon-charm","月亮吊飾","Moon Charm","charm","silver",390,"夜行者的座標，沉靜中蓄積力量"],
  ["lotus","蓮花吊飾","Lotus Charm","charm","gold",490,"泥中不染，淬鍊後的從容"],
  ["heart","赤誠吊飾","Heart Charm","charm","gold",420,"純粹的初衷，提醒自己為何出發"],
  ["cross","守護十字吊飾","Cross Charm","charm","silver",490,"低調堅定，扛住每一次風浪"],
  ["key","掌控鑰匙吊飾","Lucky Key Charm","charm","gold",450,"掌握開啟下一步的主動權"],
  ["butterfly","蛻變吊飾","Butterfly Charm","charm","gold",520,"破繭姿態，提醒自己敢於蛻變"],
  ["evil-eye","守護之眼吊飾","Evil Eye Charm","charm","silver",480,"警醒之眼，阻擋來自四面的干擾"],
  ["sun-charm","太陽吊飾","Sunray Charm","charm","gold",470,"每天為自己點亮一次氣場"],
  ["star-charm","目標星吊飾","Wish Star Charm","charm","silver",430,"把目標釘進日常，時刻可見"],
  ["shell","遠航貝殼吊飾","Seashell Charm","charm","gold",460,"見過風浪，依然自在前行"],
  ["travel-compass","旅行羅盤吊飾","Travel Compass Charm","charm","silver",540,"無論走到哪，心裡有一個方向"],
  ["angel-wing","守護之翼吊飾","Angel Wing Charm","charm","silver",510,"低調的後盾，安靜地在背後撐著"],
  ["clover","幸運草吊飾","Four Leaf Clover Charm","charm","gold",500,"收下恰到好處的運氣，其餘靠實力"],
  ["lock","承諾鎖頭吊飾","Love Lock Charm","charm","gold",490,"鎖住說出口的承諾"],
  ["hamsa","平安手掌吊飾","Hamsa Charm","charm","silver",520,"掌心向外，擋下多餘的雜訊"],
] as const).map(([id,zh,en,type,metal,price,note]) => ({ id,zh,en,type,metal,price,note } as Accessory));

export const byStone = Object.fromEntries(stones.map((x) => [x.id, x])) as Record<string, Stone>;
export const byAccessory = Object.fromEntries(accessories.map((x) => [x.id, x])) as Record<string, Accessory>;

// Original top-down product renders shot for the OMA material library.
// They can be replaced one-for-one with final photographed files later.
export const stonePhotos: Record<string, string> = {
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
export const accessoryPhotos: Record<string, string> = {
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
  "silver-cube": "/materials/men/silver-cube.png",
  "silver-groove": "/materials/men/silver-groove.png",
  "silver-rivet": "/materials/men/silver-rivet.png",
  "silver-chain": "/materials/men/silver-chain.png",
  "silver-shield": "/materials/men/silver-shield.png",
  "silver-dragon": "/materials/men/silver-dragon.png",
  "silver-skull": "/materials/men/silver-skull.png",
  "silver-tiger-spacer": "/materials/men/silver-tiger-spacer.png",
  "silver-pixiu": "/materials/men/silver-pixiu.png",
  "gold-pixiu": "/materials/men/gold-pixiu.png",
  butterfly: "/materials/men/butterfly.png",
  "evil-eye": "/materials/men/evil-eye.png",
  "sun-charm": "/materials/men/sun-charm.png",
  "star-charm": "/materials/men/star-charm.png",
  shell: "/materials/men/shell.png",
  "travel-compass": "/materials/men/travel-compass.png",
  "angel-wing": "/materials/men/angel-wing.png",
  clover: "/materials/men/clover.png",
  lock: "/materials/men/lock.png",
  hamsa: "/materials/men/hamsa.png",
};

// Crystal/Hardware render straight from these maps with no procedural
// fallback (see below), so a catalogue entry added without a photo would
// otherwise render a blank <img> with no error. Fail at module load instead.
{
  const missingStones = stones.filter((s) => !stonePhotos[s.id]).map((s) => s.id);
  const missingAccessories = accessories.filter((a) => !accessoryPhotos[a.id]).map((a) => a.id);
  if (missingStones.length || missingAccessories.length) {
    throw new Error(`catalog.tsx: missing photos for ${[...missingStones, ...missingAccessories].join(", ")}`);
  }
}

// Physical width each piece occupies on the strand, in millimetres. The user
// picks a wrist size first; its circumference (cm × 10) is the fixed capacity
// that beads fill up.
export const BEAD_MM: Record<BeadSize, number> = { xlarge: 20, large: 10, small: 8 };

// Per-stone size ladders. Empty at build time and filled from the database
// by catalog-live at boot, so the owner can give a stone any set of
// diameters in the admin (6mm, 12mm…) and the studio offers exactly those,
// priced and stocked per size. Everything downstream — bead diameters on
// the 2D stage, the 3D preview, strand capacity, price, energy weight —
// already keys off millimetres, so a new ladder changes all of them at
// once. DEFAULT_SIZES reproduces the original hard-coded 8/10/20 trio for
// any stone the database hasn't described (and for the static build).
export type StoneSize = { mm: number; priceDelta: number; stock: number };
export const DEFAULT_SIZES: StoneSize[] = [
  { mm: BEAD_MM.small, priceDelta: 0, stock: Infinity },
  { mm: BEAD_MM.large, priceDelta: 80, stock: Infinity },
  { mm: BEAD_MM.xlarge, priceDelta: 320, stock: Infinity },
];
export const stoneSizes: Record<string, StoneSize[]> = {};
export const accessoryStock: Record<string, number> = {};

export function sizesFor(stoneId: string): StoneSize[] {
  const rows = stoneSizes[stoneId];
  return rows?.length ? rows : DEFAULT_SIZES;
}
/** Millimetres an item occupies, resolved from its explicit mm when the
 *  design carries one, else the legacy named ladder. */
export function mmOf(item: DesignItem): number {
  return item.mm ?? BEAD_MM[item.size ?? "large"];
}
export function stockOf(item: DesignItem): number {
  if (item.kind === "accessory") return accessoryStock[item.id] ?? Infinity;
  const mm = mmOf(item);
  const row = sizesFor(item.id).find((s) => s.mm === mm);
  return row ? row.stock : Infinity;
}
export const inStock = (item: DesignItem) => stockOf(item) > 0;
export const WRIST_CHOICES = Array.from({ length: 19 }, (_, i) => 13 + i * 0.5);
// Rendering scale: stage percent per physical millimetre. Ring radius and
// bead diameters share it, so beads sit tangent along the cord — a 20mm bead
// truly draws twice as wide as a 10mm one and neighbours never overlap.
export const PCT_PER_MM = 0.95;
// Design/stringing fee charged on every order regardless of materials —
// the studio, shop cards and checkout all price off this one constant so a
// displayed total can never drift from what checkout actually charges.
export const BASE_FEE = 680;

export function itemMM(item: DesignItem) { if (item.kind === "stone") return mmOf(item); return byAccessory[item.id].type === "spacer" ? 5 : 3; }
export function itemPrice(item: DesignItem) {
  if (item.kind === "accessory") return byAccessory[item.id].price;
  const mm = mmOf(item);
  const row = sizesFor(item.id).find((s) => s.mm === mm);
  // A size the ladder no longer lists (an old share link, say) still needs
  // a price: fall back to the default ladder's nearest step.
  const delta = row ? row.priceDelta : (DEFAULT_SIZES.find((s) => s.mm === mm)?.priceDelta ?? Math.round((mm - BEAD_MM.small) * 32));
  return byStone[item.id].price + delta;
}
export function label(item: DesignItem) { return item.kind === "stone" ? byStone[item.id].zh : byAccessory[item.id].zh; }
export function sizeLabel(item: DesignItem | BeadSize = "large") {
  const mm = typeof item === "string" ? BEAD_MM[item] : mmOf(item);
  const noun = mm >= 16 ? "特大主珠" : mm >= 10 ? "大珠" : mm >= 8 ? "中珠" : "小珠";
  return `${mm}mm ${noun}`;
}

// Bigger beads carry more of the stone's energy into the design. Weight is
// millimetre-based so a custom size slots into the same curve: linear up to
// 10mm, then gentler, which reproduces the original 0.8/1.0/1.6 for the
// 8/10/20 ladder exactly.
export function sizeWeight(mm: number) { return mm <= 10 ? mm / 10 : 1 + (mm - 10) * 0.06; }
export function energyScores(items: DesignItem[]) {
  const scores = { wealth: 0, love: 0, healing: 0, protection: 0, focus: 0, power: 0 } as Record<EnergyType, number>;
  items.forEach((item) => {
    if (item.kind !== "stone") return;
    const stone = byStone[item.id];
    const w = sizeWeight(mmOf(item));
    ENERGY_META.forEach((m) => { scores[m.key] += stone.energy[m.key] * w * 36; });
  });
  ENERGY_META.forEach((m) => { scores[m.key] = Math.round(scores[m.key]); });
  return scores;
}
export function dominantOf(scores: Record<EnergyType, number>) {
  return ENERGY_META.reduce((best, m) => (scores[m.key] > scores[best.key] ? m : best), ENERGY_META[0]);
}

// Strand geometry shared by every renderer that arranges items around a
// ring: the studio stage, shop-card thumbnails, the share-card canvas and
// the 360° preview. Converts cumulative widths into the angle each item's
// centre falls at — the arithmetic that four call sites used to reimplement
// (and drift on) independently. Scale, orbit radius and charm sizing stay
// cosmetic choices local to each renderer.
export function centersForWidths(widths: number[]): number[] {
  let cum = 0;
  return widths.map((mm) => { const center = cum + mm / 2; cum += mm; return center; });
}
export function anglesForWidths(widths: number[], capacityMM: number): number[] {
  return centersForWidths(widths).map((center) => -Math.PI / 2 + (center / capacityMM) * Math.PI * 2);
}

// DesignItem-aware convenience wrapper for the studio stage and shop-card
// thumbnails; share-card.ts and preview.tsx render already-decoupled
// {mm, isCharm} tuples instead of DesignItem, so they call
// anglesForWidths() directly.
export type StrandPlacement = { item: DesignItem; mm: number; isCharm: boolean; angle: number };
export function layoutStrand(items: DesignItem[], capacityMM: number): StrandPlacement[] {
  const widths = items.map(itemMM);
  const angles = anglesForWidths(widths, capacityMM);
  return items.map((item, i) => ({
    item, mm: widths[i], angle: angles[i],
    isCharm: item.kind === "accessory" && byAccessory[item.id].type === "charm",
  }));
}

export const buildSpec = (spec: [string, BeadSize?][]): DesignItem[] => spec.map(([id, size]) => byAccessory[id]
  ? ({ kind: "accessory", id, uid: nextUid() } as DesignItem)
  : ({ kind: "stone", id, size: size ?? "large", uid: nextUid() } as DesignItem));

// Size suffix in the compact notation: the original letters (`.x` 20mm,
// `.s` 8mm, anything else 10mm) or a plain number for admin-defined sizes
// (`.12` = 12mm). Letters are kept forever so every share link and product
// spec written before custom sizes existed still decodes.
function stoneToken(id: string, sz: string | undefined): DesignItem {
  const mm = sz && /^\d+(\.\d+)?$/.test(sz) ? Number(sz) : undefined;
  if (mm && mm > 0 && mm <= 40) return { kind: "stone", id, mm, uid: nextUid() };
  return { kind: "stone", id, size: sz === "x" ? "xlarge" : sz === "s" ? "small" : "large", uid: nextUid() };
}
const sizeSuffix = (it: DesignItem) => it.mm !== undefined
  ? String(it.mm)
  : it.size === "xlarge" ? "x" : it.size === "small" ? "s" : "l";

// Compact spec notation used by the series catalogue: "obsidian.x,obsidian.l,gold-hex".
export function parseSpec(spec: string): DesignItem[] {
  return spec.split(",").map((token) => {
    const [id, sz] = token.trim().split(".");
    if (byAccessory[id]) return { kind: "accessory", id, uid: nextUid() } as DesignItem;
    return stoneToken(id, sz);
  });
}

// Shareable design links: ?d=<wrist>|<id>.<size>,<id>,…
export const encodeDesign = (items: DesignItem[], wristCm: number) => `${wristCm}|` + items.map((it) => it.kind === "stone" ? `${it.id}.${sizeSuffix(it)}` : it.id).join(",");
export function decodeDesign(code: string): { wrist: number; items: DesignItem[] } | null {
  try {
    const [w, list] = code.split("|");
    const wrist = Number(w);
    if (!WRIST_CHOICES.includes(wrist) || !list) return null;
    const items: DesignItem[] = [];
    for (const token of list.split(",")) {
      const [id, sz] = token.split(".");
      if (byStone[id]) items.push(stoneToken(id, sz));
      else if (byAccessory[id]) items.push({ kind: "accessory", id, uid: nextUid() });
      else return null;
    }
    if (!items.length || items.length > 42) return null;
    if (items.reduce((sum, it) => sum + itemMM(it), 0) > wrist * 10) return null;
    return { wrist, items };
  } catch { return null; }
}

// draggable={false}: the browser's native image drag hijacks the pointer
// stream (firing pointercancel) and kills bead drag-reordering. Every stone
// and accessory is required (see the coverage check above) to have a photo,
// so there is no procedural-render fallback to keep in sync here.
export function Crystal({ stone, size = "large" }: { stone: Stone; size?: BeadSize }) {
  return <span className={`crystal photo ${size}`}><img src={stonePhotos[stone.id]} alt={`${stone.zh} 正面實物圖`} draggable={false} /></span>;
}
export function Hardware({ a, small = false }: { a: Accessory; small?: boolean }) {
  return <span className={`hardware photo ${a.type} ${small ? "small" : ""}`}><img src={accessoryPhotos[a.id]} alt={`${a.zh} 正面實物圖`} draggable={false} /></span>;
}
export function ItemVisual({ item, small = false }: { item: DesignItem; small?: boolean }) {
  const stoneSize: BeadSize = small ? "small" : item.size ?? "large";
  return item.kind === "stone" ? <Crystal stone={byStone[item.id]} size={stoneSize} /> : <Hardware a={byAccessory[item.id]} small={small || byAccessory[item.id].type === "spacer"} />;
}
