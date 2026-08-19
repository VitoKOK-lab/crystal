// Ready-to-wear collections. Each series has its own banner, theme and
// construction character; the four products inside it are deliberately as
// unalike as the palette allows — each takes a different construction (one
// 20mm focal, all-10mm, all-8mm, all-20mm or graduated) AND a different stone
// in the hero slot, so the grid reads like a real collection rather than one
// design recoloured four times.
//
// Specs use the compact notation parseSpec() reads: `.x` = 20mm, `.s` = 8mm,
// bare/`.l` = 10mm, and any accessory id drops in as a spacer or charm.
// They are generated from (style, palette, wrist) rather than typed by hand,
// so every one is guaranteed to fit its wrist and clear the studio's 80%
// fill gate. Prices and dominant energy are computed from the same spec the
// buy buttons build from, so a card can never drift from what gets made.

export type SeriesTone = {
  fab: string;        // collapsed radar button label
  matrixEn: string;   // radar panel heading
  matrixZh: string;
  totalEn: string;    // running total caption
  dominantEn: string; // bracelet-centre caption
  dominantZh: string;
};

// The women's series speak in 能量 (energy); the men's lines keep the 戰力
// (power/gear) framing the original men's site was built around.
const ENERGY_TONE: SeriesTone = { fab: "能量", matrixEn: "ENERGY MATRIX", matrixZh: "能量矩陣", totalEn: "TOTAL ENERGY", dominantEn: "DOMINANT ENERGY", dominantZh: "主能量" };
const POWER_TONE: SeriesTone = { fab: "戰力", matrixEn: "POWER MATRIX", matrixZh: "戰力矩陣", totalEn: "TOTAL POWER", dominantEn: "DOMINANT POWER", dominantZh: "主屬性" };
export const NEUTRAL_TONE = ENERGY_TONE;

export type ConstructionStyle = "focal" | "duo" | "uniform" | "delicate" | "chunky" | "graduated";
export const STYLE_LABEL: Record<ConstructionStyle, string> = {
  focal: "主石款", duo: "雙主石", uniform: "正常款",
  delicate: "細繩款", chunky: "大顆款", graduated: "漸層款",
};

export type Product = { id: string; name: string; tagline: string; style: ConstructionStyle; wrist: number; spec: string };
export type Series = {
  id: string;
  zh: string;
  en: string;
  theme: string;
  audience: "women" | "men";
  tagline: string;
  craft: string;
  accent: string;
  banner: string;
  swatch: string;
  tone: SeriesTone;
  products: Product[];
};

export const SERIES: Series[] = [
  {
    id: "bloom", zh: "綻放", en: "BLOOM", theme: "愛與關係", audience: "women",
    accent: "#c9738e", banner: "/banners/bloom.jpg", swatch: "rose",
    tagline: "粉晶與薔薇輝石。寫給願意先善待自己的人。",
    craft: "20mm 粉晶主石、細繩月光石、全 20mm 薔薇輝石，與一條白水晶漸層。",
    tone: ENERGY_TONE,
    products: [
      { id: "first-love", name: "初戀告白", tagline: "20mm 粉水晶主石。心動剛剛開始。", style: "focal", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-round,rose.l,moon.l,rose.l,clear.l,gold-rondelle,rose.l,garnet.l,rose.l,rose.l,rhodonite.l,silver-round,rose.l,moon.l,heart" },
      { id: "soft-secret", name: "細語心事", tagline: "8mm 月光石，淡而細。襯衫袖口下的低語。", style: "delicate", wrist: 14, spec: "moon.s,clear.s,moon.s,garnet.s,gold-rondelle,moon.s,aqua.s,moon.s,rose.s,gold-knot,moon.s,rhodonite.s,moon.s,clear.s,silver-flower,moon.s,garnet.s,moon.s,clear.s,moon.s,garnet.s,butterfly" },
      { id: "full-bloom", name: "盛放宣言", tagline: "全 20mm 薔薇輝石。深粉色，開口前就先說了話。", style: "chunky", wrist: 14, spec: "rhodonite.x,moon.x,gold-knot,rhodonite.x,clear.x,rhodonite.x,silver-flower,garnet.x,rhodonite.x,moon.x,gold-knot,rhodonite.x" },
      { id: "fading-words", name: "漸層告白", tagline: "白水晶逐漸收細，粉色自其中浮現。", style: "graduated", wrist: 14, spec: "clear.x,clear.l,garnet.l,clear.l,silver-flower,aqua.l,clear.l,rose.l,clear.l,silver-round,rhodonite.l,clear.l,garnet.s,clear.l,garnet.l,clear.l,silver-flower,lotus" },
    ],
  },
  {
    id: "serene", zh: "澄澈", en: "SERENE", theme: "療癒與呼吸", audience: "women",
    accent: "#3f9aab", banner: "/banners/serene.jpg", swatch: "aqua",
    tagline: "海藍寶、白水晶與螢石。給只想好好呼吸的日子。",
    craft: "10mm 海藍寶、細繩白水晶、全 20mm 紫水晶，與螢石漸層。",
    tone: ENERGY_TONE,
    products: [
      { id: "deep-breath", name: "深海呼吸", tagline: "10mm 海藍寶。像海一樣把人鬆開。", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-round,aqua.l,moon.l,aqua.l,moss.l,silver-star,aqua.l,amethyst.l,aqua.l,aqua.l,clear.l,aqua.l,fluorite.l,shell" },
      { id: "morning-clarity", name: "晨霧清明", tagline: "8mm 白水晶。清晨的第一口空氣。", style: "delicate", wrist: 14, spec: "clear.s,fluorite.s,clear.s,moon.s,silver-star,clear.s,moss.s,clear.s,amethyst.s,silver-flower,clear.s,aqua.s,clear.s,fluorite.s,silver-round,clear.s,moon.s,clear.s,fluorite.s,clear.s,moon.s,moon-charm" },
      { id: "deep-pool", name: "深潭沉靜", tagline: "全 20mm 紫水晶。安靜，卻無法忽視。", style: "chunky", wrist: 14, spec: "amethyst.x,aqua.x,silver-flower,amethyst.x,clear.x,amethyst.x,silver-round,fluorite.x,amethyst.x,aqua.x,silver-flower,amethyst.x" },
      { id: "breath-gradient", name: "澄心漸層", tagline: "螢石逐漸收細，像一次長長的吐納。", style: "graduated", wrist: 14, spec: "fluorite.x,fluorite.l,moon.l,fluorite.l,silver-round,moss.l,fluorite.l,amethyst.l,fluorite.l,silver-star,aqua.l,fluorite.l,moon.s,fluorite.l,moon.l,fluorite.l,silver-round,leaf" },
    ],
  },
  {
    id: "aurora", zh: "極光", en: "AURORA", theme: "守護與直覺", audience: "women",
    accent: "#6b5bb0", banner: "/banners/aurora.jpg", swatch: "labradorite",
    tagline: "拉長石與紫水晶的暗色流光。擋下不屬於你的雜訊。",
    craft: "拉長石主石、細繩月光石、全 20mm 黑曜石，與青金石漸層。",
    tone: ENERGY_TONE,
    products: [
      { id: "aurora-guard", name: "極光守護", tagline: "20mm 拉長石主石。低調，且不可撼動。", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-hex,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-round,labradorite.l,lapis.l,labradorite.l,labradorite.l,amethyst.l,silver-hex,labradorite.l,tourmaline.l,evil-eye" },
      { id: "stardust", name: "星塵細語", tagline: "8mm 月光石。貼身佩戴，如同護符。", style: "delicate", wrist: 14, spec: "moon.s,lapis.s,moon.s,obsidian.s,silver-round,moon.s,labradorite.s,moon.s,amethyst.s,silver-cube,moon.s,tourmaline.s,moon.s,lapis.s,silver-hex,moon.s,obsidian.s,moon.s,lapis.s,moon.s,obsidian.s,moon-charm" },
      { id: "night-shield", name: "暗夜之盾", tagline: "全 20mm 黑曜石。最硬的一道牆。", style: "chunky", wrist: 14, spec: "obsidian.x,labradorite.x,silver-cube,obsidian.x,amethyst.x,obsidian.x,silver-hex,tourmaline.x,obsidian.x,labradorite.x,silver-cube,obsidian.x" },
      { id: "flowing-gradient", name: "流光漸層", tagline: "青金石由深轉細，像極光緩緩散開。", style: "graduated", wrist: 14, spec: "lapis.x,lapis.l,obsidian.l,lapis.l,silver-hex,labradorite.l,lapis.l,amethyst.l,lapis.l,silver-round,tourmaline.l,lapis.l,obsidian.s,lapis.l,obsidian.l,lapis.l,silver-hex,hamsa" },
    ],
  },
  {
    id: "abundance", zh: "豐盈", en: "ABUNDANCE", theme: "豐盛與流動", audience: "women",
    accent: "#c8912f", banner: "/banners/abundance.jpg", swatch: "citrine",
    tagline: "黃水晶、虎眼石與金沙石。值得的，不必說得含蓄。",
    craft: "全 20mm 黃水晶、金飾細繩白水晶、虎眼石主石，與金沙石漸層。",
    tone: ENERGY_TONE,
    products: [
      { id: "golden-fortune", name: "金石開運", tagline: "全 20mm 黃水晶。不必含蓄。", style: "chunky", wrist: 14, spec: "citrine.x,tiger.x,gold-crown,citrine.x,goldstone.x,citrine.x,gold-rondelle,sunstone.x,citrine.x,tiger.x,gold-crown,citrine.x" },
      { id: "fine-gold", name: "細金流年", tagline: "8mm 白水晶配金飾。豐盛，輕輕地戴。", style: "delicate", wrist: 14, spec: "clear.s,rose.s,clear.s,citrine.s,clear.s,gold-rondelle,tiger.s,clear.s,goldstone.s,clear.s,sunstone.s,gold-knot,clear.s,rose.s,clear.s,citrine.s,clear.s,rose.s,clear.s,citrine.s,compass" },
      { id: "tiger-decision", name: "虎眼決斷", tagline: "20mm 虎眼石主石。為那個一直拖延的決定。", style: "focal", wrist: 14, spec: "tiger.x,tiger.l,goldstone.l,gold-knot,tiger.l,sunstone.l,tiger.l,clear.l,gold-pixiu,tiger.l,rose.l,tiger.l,tiger.l,goldstone.l,gold-knot,tiger.l,sunstone.l,key" },
      { id: "rising-road", name: "上行之路", tagline: "金沙石逐級收細。深藍夜色，散著金點。", style: "graduated", wrist: 14, spec: "goldstone.x,goldstone.l,sunstone.l,goldstone.l,gold-pixiu,clear.l,goldstone.l,rose.l,goldstone.l,gold-crown,citrine.l,goldstone.l,sunstone.s,goldstone.l,sunstone.l,goldstone.l,gold-pixiu,clover" },
    ],
  },
  {
    id: "whisper", zh: "細語", en: "WHISPER", theme: "日常疊戴", audience: "women",
    accent: "#a88b7a", banner: "/banners/whisper.jpg", swatch: "moon",
    tagline: "以 8mm 為主的細繩款。輕得會忘記，卻始終都在。",
    craft: "細繩月光石、細繩海藍寶、10mm 粉晶，與紫水晶漸層。無一更重。",
    tone: ENERGY_TONE,
    products: [
      { id: "plain-days", name: "素日細語", tagline: "8mm 月光石。刻意做成最平常的一條。", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-round,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-star,rose.s,moon.s,clear.s,moon.s,moon.s,rose.s,moon.s,clear.s" },
      { id: "sea-breeze", name: "海風輕拂", tagline: "8mm 海藍寶。清涼，容易忘記。", style: "delicate", wrist: 14, spec: "aqua.s,fluorite.s,aqua.s,amethyst.s,aqua.s,silver-star,moon.s,aqua.s,rose.s,aqua.s,clear.s,silver-round,aqua.s,fluorite.s,aqua.s,amethyst.s,aqua.s,fluorite.s,aqua.s,amethyst.s,moon-charm" },
      { id: "soft-weight", name: "微重之感", tagline: "10mm 粉水晶。當 8mm 還差一點的時候。", style: "uniform", wrist: 14, spec: "rose.l,clear.l,rose.l,aqua.l,silver-round,rose.l,fluorite.l,rose.l,amethyst.l,silver-star,rose.l,moon.l,rose.l,rose.l,clear.l,rose.l,aqua.l,star-charm" },
      { id: "two-tone", name: "雙色淡出", tagline: "紫水晶一路淡去，直到消失。", style: "graduated", wrist: 14, spec: "amethyst.x,amethyst.l,moon.l,amethyst.l,silver-star,rose.l,amethyst.l,clear.l,amethyst.l,silver-round,aqua.l,amethyst.l,moon.s,amethyst.l,moon.l,amethyst.l,silver-star,moon-charm" },
    ],
  },
  {
    id: "forge", zh: "曜石", en: "FORGE", theme: "力量與守護", audience: "men",
    accent: "#b8923f", banner: "/banners/forge.jpg", swatch: "obsidian",
    tagline: "黑曜石、赤鐵礦與貔貅隔珠。扎實、安靜，無需解釋。",
    craft: "黑曜石主石、細繩赤鐵礦、全 20mm 火山岩，與虎眼石漸層。",
    tone: POWER_TONE,
    products: [
      { id: "polar-night", name: "極夜守護", tagline: "20mm 黑曜石主石。全黑，不作緩和。", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,silver-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-hex,obsidian.l,lava.l,obsidian.l,obsidian.l,hematite.l,silver-hex,obsidian.l,tiger-eye.l,travel-compass" },
      { id: "minimal-black", name: "極簡黑", tagline: "8mm 赤鐵礦。最安靜的戴法。", style: "delicate", wrist: 14, spec: "hematite.s,tiger-eye.s,hematite.s,goldstone.s,hematite.s,gold-hex,lava.s,hematite.s,smoky.s,hematite.s,obsidian.s,gold-pixiu,hematite.s,tiger-eye.s,hematite.s,goldstone.s,hematite.s,tiger-eye.s,hematite.s,goldstone.s,key" },
      { id: "lava-warrior", name: "熔岩戰士", tagline: "全 20mm 消光火山岩。表面之下有熱度。", style: "chunky", wrist: 14, spec: "lava.x,smoky.x,gold-pixiu,lava.x,obsidian.x,lava.x,silver-tiger-spacer,hematite.x,lava.x,smoky.x,gold-pixiu,lava.x" },
      { id: "tiger-market", name: "虎視市場", tagline: "虎眼石逐漸收細。為了讀懂局勢。", style: "graduated", wrist: 14, spec: "tiger-eye.x,tiger-eye.l,goldstone.l,tiger-eye.l,silver-tiger-spacer,lava.l,tiger-eye.l,smoky.l,tiger-eye.l,silver-hex,obsidian.l,tiger-eye.l,goldstone.s,tiger-eye.l,goldstone.l,tiger-eye.l,silver-tiger-spacer,compass" },
    ],
  },
  {
    id: "bedrock", zh: "磐岩", en: "BEDROCK", theme: "沉穩與定錨", audience: "men",
    accent: "#5f6b70", banner: "/banners/bedrock.jpg", swatch: "hematite",
    tagline: "以 20mm 大顆為底。重量本身即是安定。",
    craft: "全 20mm 赤鐵礦、10mm 茶晶、拉長石主石，與火山岩漸層。",
    tone: POWER_TONE,
    products: [
      { id: "true-bedrock", name: "磐岩本色", tagline: "全 20mm 赤鐵礦。純粹的重量。", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-cube,hematite.x,smoky.x,hematite.x,silver-rivet,lava.x,hematite.x,obsidian.x,silver-cube,hematite.x" },
      { id: "bedrock-daily", name: "日常磐岩", tagline: "10mm 茶晶。磐岩，給一週的工作日。", style: "uniform", wrist: 14, spec: "smoky.l,lava.l,smoky.l,tourmaline.l,silver-rivet,smoky.l,labradorite.l,smoky.l,hematite.l,silver-groove,smoky.l,obsidian.l,smoky.l,smoky.l,lava.l,smoky.l,tourmaline.l,cross" },
      { id: "glint-in-stone", name: "石中微光", tagline: "20mm 拉長石主石——唯一的一道光。", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,hematite.l,silver-groove,labradorite.l,obsidian.l,labradorite.l,smoky.l,silver-shield,labradorite.l,lava.l,labradorite.l,labradorite.l,hematite.l,silver-groove,labradorite.l,obsidian.l,travel-compass" },
      { id: "strata", name: "岩層", tagline: "火山岩逐級收細，像崖壁上的層理。", style: "graduated", wrist: 14, spec: "lava.x,lava.l,tourmaline.l,lava.l,silver-shield,labradorite.l,lava.l,hematite.l,lava.l,silver-cube,obsidian.l,lava.l,tourmaline.s,lava.l,tourmaline.l,lava.l,silver-shield,arrow" },
    ],
  },
  {
    id: "velocity", zh: "疾行", en: "VELOCITY", theme: "專注與行動", audience: "men",
    accent: "#2f6f7a", banner: "/banners/velocity.jpg", swatch: "lapis",
    tagline: "輕、細、俐落。為長時間的專注而配。",
    craft: "細繩青金石、赤鐵礦主石、10mm 白水晶，與太陽石漸層。",
    tone: POWER_TONE,
    products: [
      { id: "fine-line", name: "疾行細線", tagline: "8mm 青金石。跑起來也不會晃。", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,lapis.s,silver-groove,smoky.s,lapis.s,hematite.s,lapis.s,sunstone.s,lapis.s,silver-chain,clear.s,lapis.s,tiger-eye.s,lapis.s,lapis.s,clear.s,lapis.s,tiger-eye.s" },
      { id: "core-focus", name: "核心專注", tagline: "20mm 赤鐵礦主石。一次只做一件事。", style: "focal", wrist: 14, spec: "hematite.x,hematite.l,sunstone.l,silver-chain,hematite.l,lapis.l,hematite.l,clear.l,silver-hex,hematite.l,tiger-eye.l,hematite.l,hematite.l,sunstone.l,silver-chain,hematite.l,lapis.l,arrow" },
      { id: "deep-tempo", name: "沉穩節奏", tagline: "10mm 白水晶。穩定的節拍。", style: "uniform", wrist: 14, spec: "clear.l,tiger-eye.l,clear.l,smoky.l,silver-hex,clear.l,hematite.l,clear.l,sunstone.l,silver-groove,clear.l,lapis.l,clear.l,clear.l,tiger-eye.l,clear.l,smoky.l,star-charm" },
      { id: "accel-gradient", name: "加速漸層", tagline: "太陽石一路推進。", style: "graduated", wrist: 14, spec: "sunstone.x,sunstone.l,lapis.l,sunstone.l,silver-groove,clear.l,sunstone.l,tiger-eye.l,sunstone.l,silver-chain,smoky.l,sunstone.l,lapis.s,sunstone.l,lapis.l,sunstone.l,silver-groove,key" },
    ],
  },
]

export const bySeries = Object.fromEntries(SERIES.map((s) => [s.id, s])) as Record<string, Series>;

export function findProduct(seriesId: string, productId: string) {
  return bySeries[seriesId]?.products.find((p) => p.id === productId) ?? null;
}
