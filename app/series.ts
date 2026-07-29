// Ready-to-wear collections. Each series holds twelve pre-configured
// bracelets that a customer can buy as-is or open in the studio to adjust
// ("微客制"). Specs are written in the compact notation parseSpec() reads:
// `.x` = 20mm focal bead, `.s` = 8mm accent, bare/`.l` = 10mm, and any
// accessory id drops in as a spacer or charm.
//
// Nothing here hardcodes a price or a dominant energy — both are computed
// from the spec through the same catalogue functions the studio uses, so a
// product card can never drift out of sync with what actually gets built.

export type SeriesTone = {
  fab: string;        // collapsed radar button label
  matrixEn: string;   // radar panel heading
  matrixZh: string;
  totalEn: string;    // running total caption
  dominantEn: string; // bracelet-centre caption
  dominantZh: string;
};

// The women's series speak in 能量 (energy); the men's line keeps the 戰力
// (power/gear) framing it was built around.
const ENERGY_TONE: SeriesTone = { fab: "能量", matrixEn: "ENERGY MATRIX", matrixZh: "能量矩陣", totalEn: "TOTAL ENERGY", dominantEn: "DOMINANT ENERGY", dominantZh: "主能量" };
const POWER_TONE: SeriesTone = { fab: "戰力", matrixEn: "POWER MATRIX", matrixZh: "戰力矩陣", totalEn: "TOTAL POWER", dominantEn: "DOMINANT POWER", dominantZh: "主屬性" };
export const NEUTRAL_TONE = ENERGY_TONE;

export type Product = { id: string; name: string; tagline: string; wrist: number; spec: string };
export type Series = {
  id: string;
  zh: string;
  en: string;
  audience: "women" | "men";
  tagline: string;
  accent: string;
  swatch: string;
  tone: SeriesTone;
  products: Product[];
};

export const SERIES: Series[] = [
  {
    id: "bloom", zh: "綻放", en: "BLOOM", audience: "women", accent: "#c9738e", swatch: "rose",
    tagline: "粉晶與薔薇輝石為主調，寫給關係裡的溫柔與勇敢。",
    tone: ENERGY_TONE,
    products: [
      { id: "first-love", name: "初戀告白", tagline: "粉水晶配月光石，剛萌芽的心動", wrist: 15.5, spec: "rose.x,rose.l,rose.l,moon.l,silver-round,rose.l,clear.l,rose.l,silver-round,moon.l,rose.l,clear.l,rose.l,heart" },
      { id: "rose-vow", name: "玫瑰誓約", tagline: "薔薇輝石鎖住說出口的承諾", wrist: 16, spec: "rhodonite.x,rhodonite.l,rose.l,rhodonite.l,gold-knot,rose.l,moon.l,rhodonite.l,gold-knot,rose.l,rhodonite.l,moon.l,rose.l,rhodonite.l,lock" },
      { id: "gentle-guard", name: "溫柔守候", tagline: "月光石的柔光，安靜地在身邊", wrist: 16, spec: "moon.x,rose.l,moon.l,rose.l,silver-flower,moon.l,amethyst.l,rose.l,silver-flower,moon.l,rose.l,amethyst.l,moon.l,rose.l,lotus" },
      { id: "heartbeat", name: "心動時刻", tagline: "石榴石的熱度，藏不住的悸動", wrist: 16, spec: "garnet.x,garnet.l,rose.l,garnet.l,gold-rondelle,rose.l,rhodonite.l,garnet.l,gold-rondelle,rose.l,garnet.l,rhodonite.l,rose.l,garnet.l,heart" },
      { id: "sweet-glow", name: "蜜語微光", tagline: "白水晶放大每一句甜言", wrist: 16, spec: "rose.x,rose.l,clear.l,rose.l,gold-rondelle,clear.l,rose.l,moon.l,gold-rondelle,rose.l,clear.l,rose.l,moon.l,rose.l,butterfly" },
      { id: "kindred", name: "相知相惜", tagline: "海藍寶讓對話清澈自在", wrist: 16.5, spec: "rhodonite.x,rhodonite.l,aqua.l,rhodonite.l,silver-round,aqua.l,rose.l,rhodonite.l,silver-round,aqua.l,rhodonite.l,rose.l,aqua.l,rhodonite.l,rose.l,lock" },
      { id: "spring-bloom", name: "春日告白", tagline: "苔蘚瑪瑙，慢慢長成的關係", wrist: 16, spec: "rose.x,rose.l,moss.l,rose.l,silver-flower,moss.l,clear.l,rose.l,silver-flower,moss.l,rose.l,clear.l,rose.l,moss.l,clover" },
      { id: "pink-mist", name: "粉霧輕盈", tagline: "螢石淨化，讓心事不再沉重", wrist: 16, spec: "rose.x,fluorite.l,rose.l,fluorite.l,silver-star,rose.l,moon.l,fluorite.l,silver-star,rose.l,fluorite.l,moon.l,rose.l,fluorite.l,butterfly" },
      { id: "eternal-vow", name: "永恆之約", tagline: "拉長石守護走得長遠的關係", wrist: 16.5, spec: "rhodonite.x,labradorite.l,rhodonite.l,labradorite.l,gold-knot,rhodonite.l,rose.l,labradorite.l,gold-knot,rhodonite.l,labradorite.l,rose.l,rhodonite.l,labradorite.l,rose.l,lock" },
      { id: "sweet-resonance", name: "甜蜜共鳴", tagline: "石榴石與薔薇輝石的雙主調", wrist: 16, spec: "garnet.x,rhodonite.l,garnet.l,rhodonite.l,gold-rondelle,garnet.l,rose.l,rhodonite.l,gold-rondelle,garnet.l,rhodonite.l,rose.l,garnet.l,rhodonite.l,heart" },
      { id: "heart-compass", name: "心之所向", tagline: "青金石，把真心誠實說出口", wrist: 16, spec: "rose.x,lapis.l,rose.l,lapis.l,silver-round,rose.l,moon.l,lapis.l,silver-round,rose.l,lapis.l,moon.l,rose.l,lapis.l,key" },
      { id: "bloom-manifesto", name: "綻放宣言", tagline: "黃水晶點亮，為自己盛開一次", wrist: 17, spec: "rhodonite.x,citrine.l,rhodonite.l,citrine.l,gold-crown,rhodonite.l,rose.l,citrine.l,gold-crown,rhodonite.l,citrine.l,rose.l,rhodonite.l,citrine.l,rose.l,sun-charm" },
    ],
  },
  {
    id: "serene", zh: "澄澈", en: "SERENE", audience: "women", accent: "#3f9aab", swatch: "aqua",
    tagline: "海藍寶、白水晶與螢石，給需要喘口氣的日子。",
    tone: ENERGY_TONE,
    products: [
      { id: "deep-breath", name: "深海呼吸", tagline: "海藍寶，像海一樣把人放鬆", wrist: 16, spec: "aqua.x,aqua.l,clear.l,aqua.l,silver-round,clear.l,moon.l,aqua.l,silver-round,clear.l,aqua.l,moon.l,aqua.l,clear.l,shell" },
      { id: "morning-clarity", name: "晨霧清明", tagline: "白水晶開場的一天，思緒乾淨", wrist: 15.5, spec: "clear.x,clear.l,fluorite.l,clear.l,silver-star,fluorite.l,moon.l,clear.l,silver-star,fluorite.l,clear.l,moon.l,clear.l,star-charm" },
      { id: "still-mind", name: "靜心冥想", tagline: "紫水晶安定，適合睡前配戴", wrist: 16, spec: "amethyst.x,amethyst.l,fluorite.l,amethyst.l,silver-flower,fluorite.l,clear.l,amethyst.l,silver-flower,fluorite.l,amethyst.l,clear.l,amethyst.l,fluorite.l,angel-wing" },
      { id: "forest-breath", name: "森林呼吸", tagline: "苔蘚瑪瑙，回到自己的節奏", wrist: 16, spec: "moss.x,moss.l,aqua.l,moss.l,silver-round,aqua.l,clear.l,moss.l,silver-round,aqua.l,moss.l,clear.l,moss.l,aqua.l,leaf" },
      { id: "moon-healing", name: "月光療癒", tagline: "月光石照亮每一次重新開始", wrist: 16, spec: "moon.x,moon.l,aqua.l,moon.l,silver-star,aqua.l,clear.l,moon.l,silver-star,aqua.l,moon.l,clear.l,moon.l,aqua.l,moon-charm" },
      { id: "clear-spring", name: "澄心之泉", tagline: "螢石溫柔淨化，整理雜訊", wrist: 16, spec: "fluorite.x,fluorite.l,clear.l,fluorite.l,silver-round,clear.l,aqua.l,fluorite.l,silver-round,clear.l,fluorite.l,aqua.l,fluorite.l,clear.l,shell" },
      { id: "blue-wisdom", name: "藍海智慧", tagline: "青金石，把想法說得更清楚", wrist: 16.5, spec: "lapis.x,lapis.l,aqua.l,lapis.l,silver-hex,aqua.l,clear.l,lapis.l,silver-hex,aqua.l,lapis.l,clear.l,lapis.l,aqua.l,clear.l,star-charm" },
      { id: "pure-halo", name: "純淨光暈", tagline: "白水晶與月光石的柔和層次", wrist: 16, spec: "clear.x,moon.l,clear.l,moon.l,silver-flower,clear.l,amethyst.l,moon.l,silver-flower,clear.l,moon.l,amethyst.l,clear.l,moon.l,angel-wing" },
      { id: "soft-restart", name: "溫柔重啟", tagline: "海藍寶配螢石，卸下再出發", wrist: 16, spec: "aqua.x,fluorite.l,aqua.l,fluorite.l,silver-round,aqua.l,moon.l,fluorite.l,silver-round,aqua.l,fluorite.l,moon.l,aqua.l,fluorite.l,shell" },
      { id: "green-calm", name: "綠意安放", tagline: "苔蘚瑪瑙與海藍寶，把心放下", wrist: 16, spec: "moss.x,aqua.l,moss.l,aqua.l,silver-flower,moss.l,fluorite.l,aqua.l,silver-flower,moss.l,aqua.l,fluorite.l,moss.l,aqua.l,leaf" },
      { id: "starlit-still", name: "星夜沉靜", tagline: "青金石與月光石的夜間對話", wrist: 16.5, spec: "lapis.x,moon.l,lapis.l,moon.l,silver-star,lapis.l,clear.l,moon.l,silver-star,lapis.l,moon.l,clear.l,lapis.l,moon.l,clear.l,moon-charm" },
      { id: "serene-manifesto", name: "澄澈宣言", tagline: "全系列最清透的一條，日常百搭", wrist: 17, spec: "clear.x,aqua.l,clear.l,aqua.l,silver-hex,clear.l,fluorite.l,aqua.l,silver-hex,clear.l,aqua.l,fluorite.l,clear.l,aqua.l,fluorite.l,star-charm" },
    ],
  },
  {
    id: "aurora", zh: "極光", en: "AURORA", audience: "women", accent: "#6b5bb0", swatch: "labradorite",
    tagline: "拉長石與紫水晶的暗色流光，替你擋掉多餘的雜訊。",
    tone: ENERGY_TONE,
    products: [
      { id: "aurora-guard", name: "極光守護", tagline: "拉長石流光，低調而堅定", wrist: 16, spec: "labradorite.x,labradorite.l,amethyst.l,labradorite.l,silver-hex,amethyst.l,moon.l,labradorite.l,silver-hex,amethyst.l,labradorite.l,moon.l,labradorite.l,amethyst.l,evil-eye" },
      { id: "violet-ward", name: "紫夜結界", tagline: "紫水晶加黑碧璽，雙重界線", wrist: 16, spec: "amethyst.x,amethyst.l,tourmaline.l,amethyst.l,silver-round,tourmaline.l,labradorite.l,amethyst.l,silver-round,tourmaline.l,amethyst.l,labradorite.l,amethyst.l,tourmaline.l,hamsa" },
      { id: "quiet-boundary", name: "沉靜界線", tagline: "黑碧璽與茶晶，穩穩守住自己", wrist: 16, spec: "tourmaline.x,tourmaline.l,smoky.l,tourmaline.l,silver-cube,smoky.l,labradorite.l,tourmaline.l,silver-cube,smoky.l,tourmaline.l,labradorite.l,tourmaline.l,smoky.l,cross" },
      { id: "night-shield", name: "暗夜之盾", tagline: "切面黑曜石，最硬的一道防線", wrist: 16, spec: "obsidian.x,obsidian.l,tourmaline.l,obsidian.l,silver-shield,tourmaline.l,labradorite.l,obsidian.l,silver-shield,tourmaline.l,obsidian.l,labradorite.l,obsidian.l,tourmaline.l,evil-eye" },
      { id: "moon-watch", name: "月影守望", tagline: "月光石與拉長石的夜色層次", wrist: 16, spec: "labradorite.x,moon.l,labradorite.l,moon.l,silver-star,labradorite.l,amethyst.l,moon.l,silver-star,labradorite.l,moon.l,amethyst.l,labradorite.l,moon.l,moon-charm" },
      { id: "flowing-insight", name: "靈感流光", tagline: "拉長石配青金石，直覺更敏銳", wrist: 16.5, spec: "labradorite.x,lapis.l,labradorite.l,lapis.l,silver-hex,labradorite.l,amethyst.l,lapis.l,silver-hex,labradorite.l,lapis.l,amethyst.l,labradorite.l,lapis.l,amethyst.l,angel-wing" },
      { id: "rooted-earth", name: "大地扎根", tagline: "茶晶與赤鐵礦，把人穩穩接地", wrist: 16, spec: "smoky.x,smoky.l,tourmaline.l,smoky.l,silver-groove,tourmaline.l,hematite.l,smoky.l,silver-groove,tourmaline.l,smoky.l,hematite.l,smoky.l,tourmaline.l,cross" },
      { id: "violet-barrier", name: "紫霧屏障", tagline: "紫水晶與螢石，安定又清明", wrist: 16, spec: "amethyst.x,tourmaline.l,amethyst.l,tourmaline.l,silver-flower,amethyst.l,fluorite.l,tourmaline.l,silver-flower,amethyst.l,tourmaline.l,fluorite.l,amethyst.l,tourmaline.l,hamsa" },
      { id: "stardust-charm", name: "星塵護符", tagline: "拉長石與白水晶，隨身的護符", wrist: 16, spec: "labradorite.x,moon.l,labradorite.l,moon.l,silver-round,labradorite.l,clear.l,moon.l,silver-round,labradorite.l,moon.l,clear.l,labradorite.l,moon.l,star-charm" },
      { id: "deep-ward", name: "深海結界", tagline: "青金石領銜的深藍守護", wrist: 16.5, spec: "lapis.x,labradorite.l,lapis.l,labradorite.l,silver-hex,lapis.l,amethyst.l,labradorite.l,silver-hex,lapis.l,labradorite.l,amethyst.l,lapis.l,labradorite.l,amethyst.l,evil-eye" },
      { id: "silent-eye", name: "靜謐之眼", tagline: "紫水晶與黑曜石，剛柔並濟", wrist: 16, spec: "amethyst.x,obsidian.l,amethyst.l,obsidian.l,silver-round,amethyst.l,labradorite.l,obsidian.l,silver-round,amethyst.l,obsidian.l,labradorite.l,amethyst.l,obsidian.l,evil-eye" },
      { id: "aurora-manifesto", name: "極光宣言", tagline: "系列最完整的守護配置", wrist: 17, spec: "labradorite.x,amethyst.l,labradorite.l,amethyst.l,silver-hex,labradorite.l,moon.l,amethyst.l,silver-hex,labradorite.l,amethyst.l,moon.l,labradorite.l,amethyst.l,moon.l,hamsa" },
    ],
  },
  {
    id: "forge", zh: "曜石", en: "FORGE", audience: "men", accent: "#b8923f", swatch: "obsidian",
    tagline: "黑曜石、赤鐵礦與貔貅隔珠，固定、扎實、不多話。",
    tone: POWER_TONE,
    products: [
      { id: "polar-night", name: "極夜守護者", tagline: "黑曜石與赤鐵礦，全黑硬派", wrist: 16, spec: "obsidian.x,obsidian.l,hematite.l,obsidian.l,silver-hex,hematite.l,tourmaline.l,obsidian.l,silver-hex,hematite.l,obsidian.l,tourmaline.l,obsidian.l,hematite.l,travel-compass" },
      { id: "decisive-investor", name: "決斷投資客", tagline: "金沙石配金貔貅，盤中不手軟", wrist: 16.5, spec: "goldstone.x,goldstone.l,tiger-eye.l,goldstone.l,gold-pixiu,tiger-eye.l,citrine.l,goldstone.l,gold-hex,tiger-eye.l,goldstone.l,citrine.l,goldstone.l,tiger-eye.l,citrine.l,compass" },
      { id: "lava-warrior", name: "熔岩戰士", tagline: "火山岩與石榴石，訓練日戰袍", wrist: 17, spec: "garnet.x,lava.l,garnet.l,lava.l,silver-skull,garnet.l,sunstone.l,lava.l,silver-skull,garnet.l,lava.l,sunstone.l,garnet.l,lava.l,sunstone.l,arrow" },
      { id: "iron-will", name: "鋼鐵意志", tagline: "赤鐵礦領銜，銀鉚釘收邊", wrist: 16, spec: "hematite.x,hematite.l,obsidian.l,hematite.l,silver-rivet,obsidian.l,smoky.l,hematite.l,silver-rivet,obsidian.l,hematite.l,smoky.l,hematite.l,obsidian.l,arrow" },
      { id: "pixiu-fortune", name: "貔貅招財", tagline: "金銀雙貔貅，只進不出", wrist: 16.5, spec: "goldstone.x,citrine.l,goldstone.l,citrine.l,gold-pixiu,goldstone.l,tiger.l,citrine.l,silver-pixiu,goldstone.l,citrine.l,tiger.l,goldstone.l,citrine.l,tiger.l,compass" },
      { id: "tiger-market", name: "虎嘯商場", tagline: "切面虎眼石與虎首隔珠", wrist: 16, spec: "tiger-eye.x,tiger-eye.l,goldstone.l,tiger-eye.l,silver-tiger-spacer,goldstone.l,citrine.l,tiger-eye.l,silver-tiger-spacer,goldstone.l,tiger-eye.l,citrine.l,tiger-eye.l,goldstone.l,compass" },
      { id: "blazing-edge", name: "烈日鋒芒", tagline: "太陽石與鱗紋隔珠，氣場全開", wrist: 17, spec: "sunstone.x,garnet.l,sunstone.l,garnet.l,silver-dragon,sunstone.l,lava.l,garnet.l,silver-dragon,sunstone.l,garnet.l,lava.l,sunstone.l,garnet.l,lava.l,arrow" },
      { id: "steady-control", name: "沉穩掌控", tagline: "茶晶與黑曜石，安靜地掌握節奏", wrist: 16, spec: "smoky.x,smoky.l,obsidian.l,smoky.l,silver-cube,obsidian.l,hematite.l,smoky.l,silver-cube,obsidian.l,smoky.l,hematite.l,smoky.l,obsidian.l,key" },
      { id: "black-gold", name: "黑金權杖", tagline: "黑曜石壓金沙石，低調的宣示", wrist: 16.5, spec: "obsidian.x,goldstone.l,obsidian.l,goldstone.l,gold-pixiu,obsidian.l,tiger-eye.l,goldstone.l,gold-hex,obsidian.l,goldstone.l,tiger-eye.l,obsidian.l,goldstone.l,tiger-eye.l,compass" },
      { id: "dawn-expedition", name: "破曉遠征", tagline: "拉長石與盾牌隔珠，出差常備", wrist: 16, spec: "labradorite.x,obsidian.l,labradorite.l,obsidian.l,silver-shield,labradorite.l,tourmaline.l,obsidian.l,silver-shield,labradorite.l,obsidian.l,tourmaline.l,labradorite.l,obsidian.l,travel-compass" },
      { id: "tiger-unleashed", name: "猛虎出柙", tagline: "虎眼石加火山岩，衝一波", wrist: 17, spec: "tiger-eye.x,lava.l,tiger-eye.l,lava.l,silver-tiger-spacer,tiger-eye.l,garnet.l,lava.l,silver-skull,tiger-eye.l,lava.l,garnet.l,tiger-eye.l,lava.l,garnet.l,arrow" },
      { id: "forge-manifesto", name: "曜石宣言", tagline: "系列最重的一條，鏈環收尾", wrist: 17, spec: "obsidian.x,hematite.l,obsidian.l,hematite.l,silver-chain,obsidian.l,lava.l,hematite.l,silver-chain,obsidian.l,hematite.l,lava.l,obsidian.l,hematite.l,lava.l,arrow" },
    ],
  },
];

export const bySeries = Object.fromEntries(SERIES.map((s) => [s.id, s])) as Record<string, Series>;
export function findProduct(seriesId: string, productId: string) {
  return bySeries[seriesId]?.products.find((p) => p.id === productId) ?? null;
}
