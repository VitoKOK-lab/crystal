// Taxonomies over the stone catalogue: the six-dimension energy scoring,
// the colour families for the picker chips, and the seven-chakra system the
// deep-matching quiz builds lineups from.
import { STONE_COLORS } from "./bead-colors";
import { ENERGY_META, byStone, mmOf, sizesFor, stones, type DesignItem, type EnergyType, type Stone } from "./materials";

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

// The stone↔energy lookup, made explicit: which stones carry an energy the
// strongest (the answer to 「我缺 X 能量該選什麼」), and which dimensions a
// design is currently weakest in (what the energy panel flags as gaps).
export function stonesForEnergy(key: EnergyType, count = 3): Stone[] {
  return [...stones].sort((a, b) => b.energy[key] - a.energy[key]).slice(0, count);
}
export function weakestEnergies(scores: Record<EnergyType, number>, count = 2) {
  return [...ENERGY_META].sort((a, b) => scores[a.key] - scores[b.key]).slice(0, count);
}
// A stone's strongest energies, for the badge row on its material card.
export function topEnergiesOf(stone: Stone, count = 2) {
  return [...ENERGY_META].sort((a, b) => stone.energy[b.key] - stone.energy[a.key]).slice(0, count);
}
// The size the studio adds when the customer doesn't pick one: 10mm if the
// ladder offers it, else the second rung (shared by the material grid and
// the energy panel's quick-add).
export function defaultStoneMM(stoneId: string): number {
  const ladder = sizesFor(stoneId);
  return (ladder.find((s) => s.mm === 10) ?? ladder[Math.min(1, ladder.length - 1)]).mm;
}

// Colour families for the picker's filter chips. 109 stones is too long a
// wall to scroll unaided, and colour is how customers actually shop ("我想要
// 一顆綠的"). The group is derived from each stone's sampled photo colour
// (bead-colors.ts) rather than hand-tagged, so newly photographed stones
// classify themselves.
export const COLOR_GROUPS = [
  { key: "white", zh: "白透", dot: "#eeeae1" },
  { key: "pink", zh: "粉", dot: "#e3aebc" },
  { key: "red", zh: "紅", dot: "#b04a52" },
  { key: "warm", zh: "橙黃", dot: "#d9a13f" },
  { key: "green", zh: "綠", dot: "#59805f" },
  { key: "blue", zh: "藍", dot: "#6d8fb2" },
  { key: "purple", zh: "紫", dot: "#8465a8" },
  { key: "brown", zh: "棕", dot: "#8a6647" },
  { key: "dark", zh: "黑灰", dot: "#44444a" },
] as const;
export type ColorGroupKey = (typeof COLOR_GROUPS)[number]["key"];

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

// id → 色群是純函數（STONE_COLORS 是產生的靜態表，hydration 不碰它），
// 快取住讓素材櫃逐字搜尋時不必對每顆石頭重跑 HSL 轉換。
const colorGroupCache = new Map<string, ColorGroupKey>();

export function colorGroupOf(stoneId: string): ColorGroupKey {
  const cached = colorGroupCache.get(stoneId);
  if (cached) return cached;
  const group = colorGroupUncached(stoneId);
  colorGroupCache.set(stoneId, group);
  return group;
}

function colorGroupUncached(stoneId: string): ColorGroupKey {
  const hex = STONE_COLORS[stoneId];
  if (!hex) return "white";
  const [h, s, l] = hexToHsl(hex);
  if (l < 0.18 && s < 0.35) return "dark"; // truly dark — deep saturated stones (石榴石、孔雀石) keep their hue
  if (s < 0.05) return l >= 0.6 ? "white" : "dark"; // pure greys: hue is numeric noise here
  if (s < 0.13) {
    if (l >= 0.6) return "white";
    if (l < 0.42) return "dark";
    // mid-lightness muted stones (綠幽靈、苔蘚瑪瑙) still read as their tint — fall through to hue
  }
  if (s < 0.28 && l >= 0.78) return "white"; // pale pastels read as 白透 on the shelf
  if (l >= 0.78 && h >= 25 && h < 70) return "white"; // cream/champagne (珍珠、和田玉) is 白透 to a shopper, not 橙黃
  if (h < 15 || h >= 345) return l >= 0.6 ? "pink" : "red";
  if (h < 48) return l < 0.42 ? "brown" : "warm";
  if (h < 75) return "warm";
  if (h < 165) return "green";
  if (h < 255) return "blue";
  if (h < 315) return "purple";
  return "pink";
}

// 七脈輪體系：每顆石頭歸一個主脈輪，深度配對測驗用它組「七輪平衡」
// 陣容。跟顏色分類同一套做法——規則從 id 自動歸類＋少數例外表，
// 後台新增的石頭照礦物名關鍵字自動歸位。
export const CHAKRA_META = [
  { key: "root", zh: "海底輪", en: "Root", color: "#b0413e", body: "安全感與落地" },
  { key: "sacral", zh: "臍輪", en: "Sacral", color: "#d8752e", body: "活力與感受力" },
  { key: "solar", zh: "太陽神經叢", en: "Solar Plexus", color: "#d9a13f", body: "自信與行動力" },
  { key: "heart", zh: "心輪", en: "Heart", color: "#4e9a6e", body: "愛與關係" },
  { key: "throat", zh: "喉輪", en: "Throat", color: "#4f8fc0", body: "表達與溝通" },
  { key: "third-eye", zh: "眉心輪", en: "Third Eye", color: "#5a5aa8", body: "直覺與清明" },
  { key: "crown", zh: "頂輪", en: "Crown", color: "#8f6bb8", body: "連結與整合" },
] as const;
export type ChakraKey = (typeof CHAKRA_META)[number]["key"];
export const byChakra = Object.fromEntries(CHAKRA_META.map((c) => [c.key, c])) as Record<ChakraKey, (typeof CHAKRA_META)[number]>;

// 例外表優先於關鍵字規則：這些 id 用礦物學慣例指定。
const CHAKRA_OVERRIDES: Record<string, ChakraKey> = {
  "red-agate": "sacral", "sunstone": "sacral", "carved-amethyst-fox": "third-eye",
  "garnet": "root", "rhodochrosite": "heart", "rhodonite": "heart",
  "amazonite": "throat", "kyanite": "throat", "larimar": "throat",
  "lapis": "third-eye", "labradorite": "third-eye", "blue-sheen": "third-eye",
  "kunzite": "heart", "moss": "heart", "malachite": "heart",
  "goldstone": "root", "tiger": "solar", "tiger-eye": "solar",
  "black-gold-super-seven": "crown", "seraphinite": "heart",
  "hetian-jade": "heart", "green-grape-xiuyan-jade": "heart",
  "moon": "third-eye", "blue-tiger-eye": "third-eye", "black-rutilated-quartz": "root",
  "red-hair-quartz": "sacral", "faceted-sakura-agate": "heart", "garden-quartz-dt": "heart",
};

export function chakraOf(stoneId: string): ChakraKey {
  const o = CHAKRA_OVERRIDES[stoneId];
  if (o) return o;
  const id = stoneId.toLowerCase();
  // 順序即優先序：先比對最專一的礦物名，最後才落到顏色語感。
  if (/obsidian|hematite|lava|tourmaline|smoky|garnet/.test(id)) return "root";
  if (/pearl|carnelian|red-agate|fire-quartz|hematoid|blood|strawberry/.test(id)) return "sacral";
  if (/citrine|golden|tiger-eye|lemon|sunstone|yellow/.test(id)) return "solar";
  if (/rose|rhodonite|rhodochrosite|prehnite|green|jade|malachite|moss|kunzite|cherry|lavender-rose/.test(id)) return "heart";
  if (/aqua|larimar|amazonite|kyanite|blue-lace|blue-tiger/.test(id)) return "throat";
  if (/amethyst|fluorite|lapis|labradorite|moonstone|blue|purple|grey/.test(id)) return "third-eye";
  return "crown"; // clear/white/milky 水晶家族與其餘高頻白透系
}

// 某脈輪的可選石頭，依該石與 preferEnergy 的權重排序（深度配對用：
// 同輪多顆時，優先挑跟客人命盤能量對頻的那顆）。
export function stonesForChakra(key: ChakraKey, preferEnergy?: EnergyType): Stone[] {
  return stones.filter((s) => chakraOf(s.id) === key)
    .sort((a, b) => (preferEnergy ? (b.energy[preferEnergy] ?? 0) - (a.energy[preferEnergy] ?? 0) : 0));
}

