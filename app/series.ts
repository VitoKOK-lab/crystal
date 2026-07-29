// Ready-to-wear collections. Each series has its own banner, theme and
// construction character; the twelve products inside it deliberately do NOT
// all follow one recipe — a series mixes 主石款 (one 20mm focal), 正常款
// (all 10mm), 細繩款 (all 8mm), 大顆款 (all 20mm), 雙主石 and 漸層款 so the
// grid reads like a real collection rather than one design recoloured.
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
  audience: "women" | "men";
  theme: string;
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
    id: "bloom", zh: "綻放", en: "BLOOM", audience: "women",
    theme: "愛與關係", accent: "#c9738e", banner: "/banners/bloom.jpg", swatch: "rose",
    tagline: "粉晶與薔薇輝石為主調，寫給關係裡的溫柔與勇敢。",
    craft: "以粉調主石為核心，8mm 細繩到 20mm 大顆都有。",
    tone: ENERGY_TONE,
    products: [
      { id: "first-love", name: "初戀告白", tagline: "粉水晶主石，剛萌芽的心動", style: "focal", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-round,rose.l,moon.l,rose.l,clear.l,gold-rondelle,rose.l,garnet.l,rose.l,heart" },
      { id: "daily-pink", name: "日常粉語", tagline: "10mm 均勻粉調，天天都能戴", style: "uniform", wrist: 14, spec: "rose.l,rhodonite.l,rose.l,moon.l,gold-rondelle,rose.l,clear.l,rose.l,garnet.l,rose.l,gold-knot,aqua.l,rose.l,rhodonite.l" },
      { id: "soft-secret", name: "細語心事", tagline: "8mm 細繩，襯衫袖口下的低語", style: "delicate", wrist: 14, spec: "rose.s,rhodonite.s,rose.s,moon.s,gold-knot,rose.s,clear.s,rose.s,garnet.s,silver-flower,rose.s,aqua.s,rose.s,rhodonite.s,silver-round,rose.s,moon.s,butterfly" },
      { id: "rose-vow", name: "玫瑰誓約", tagline: "薔薇輝石鎖住說出口的承諾", style: "focal", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-flower,rose.l,moon.l,rose.l,clear.l,silver-round,rose.l,garnet.l,rose.l,lock" },
      { id: "twin-hearts", name: "雙心共鳴", tagline: "兩顆主石並列，勢均力敵的關係", style: "duo", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-round,rose.l,rhodonite.x,moon.l,rose.l,gold-rondelle,clear.l,rose.l,heart" },
      { id: "gentle-guard", name: "溫柔守候", tagline: "月光石與粉晶，安靜地在身邊", style: "uniform", wrist: 14, spec: "rose.l,rhodonite.l,rose.l,moon.l,gold-rondelle,rose.l,clear.l,rose.l,garnet.l,gold-knot,rose.l,aqua.l,rose.l,lotus" },
      { id: "fading-words", name: "漸層告白", tagline: "由大到小，像慢慢說完的一句話", style: "graduated", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,rose.l,gold-knot,moon.l,rose.l,clear.l,rose.l,silver-flower,garnet.l,rose.l,rhodonite.s,butterfly" },
      { id: "light-kiss", name: "輕吻微光", tagline: "最細的一條，鎖骨鍊般的存在", style: "delicate", wrist: 14, spec: "rose.s,rhodonite.s,rose.s,moon.s,rose.s,silver-flower,clear.s,rose.s,garnet.s,rose.s,aqua.s,rose.s,silver-round,rhodonite.s,rose.s,moon.s,rose.s" },
      { id: "heartbeat", name: "心動時刻", tagline: "石榴石的熱度，藏不住的悸動", style: "focal", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-round,rose.l,moon.l,rose.l,clear.l,gold-rondelle,rose.l,garnet.l,rose.l,heart" },
      { id: "full-bloom", name: "盛放宣言", tagline: "全 20mm 大顆，開口就很有份量", style: "chunky", wrist: 14, spec: "rose.x,rhodonite.x,gold-rondelle,rose.x,moon.x,rose.x,gold-knot,clear.x" },
      { id: "kindred", name: "相知相惜", tagline: "海藍寶讓對話清澈自在", style: "uniform", wrist: 14, spec: "rose.l,rhodonite.l,rose.l,moon.l,gold-knot,rose.l,clear.l,rose.l,garnet.l,silver-flower,rose.l,aqua.l,rose.l,lock" },
      { id: "eternal-vow", name: "永恆之約", tagline: "雙主石並置，走得長遠的關係", style: "duo", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-flower,rose.l,rhodonite.x,moon.l,rose.l,silver-round,clear.l,rose.l,lock" },
    ],
  },
  {
    id: "serene", zh: "澄澈", en: "SERENE", audience: "women",
    theme: "療癒與呼吸", accent: "#3f9aab", banner: "/banners/serene.jpg", swatch: "aqua",
    tagline: "海藍寶、白水晶與螢石，給需要喘口氣的日子。",
    craft: "以 10mm 正常款為主，搭配細繩與漸層。",
    tone: ENERGY_TONE,
    products: [
      { id: "deep-breath", name: "深海呼吸", tagline: "海藍寶，像海一樣把人放鬆", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-round,aqua.l,moon.l,aqua.l,moss.l,silver-star,aqua.l,amethyst.l,aqua.l,shell" },
      { id: "morning-clarity", name: "晨霧清明", tagline: "細繩白水晶，清晨的第一口空氣", style: "delicate", wrist: 14, spec: "aqua.s,clear.s,aqua.s,fluorite.s,silver-star,aqua.s,moon.s,aqua.s,moss.s,silver-flower,aqua.s,amethyst.s,aqua.s,clear.s,silver-round,aqua.s,fluorite.s" },
      { id: "still-mind", name: "靜心冥想", tagline: "紫水晶安定，適合睡前配戴", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-flower,aqua.l,moon.l,aqua.l,moss.l,silver-round,aqua.l,amethyst.l,aqua.l,angel-wing" },
      { id: "forest-breath", name: "森林呼吸", tagline: "苔蘚瑪瑙，回到自己的節奏", style: "focal", wrist: 14, spec: "aqua.x,aqua.l,clear.l,silver-round,aqua.l,fluorite.l,aqua.l,moon.l,silver-star,aqua.l,moss.l,aqua.l,leaf" },
      { id: "dewlight", name: "露水微光", tagline: "8mm 螢石，透亮不搶戲", style: "delicate", wrist: 14, spec: "aqua.s,clear.s,aqua.s,fluorite.s,silver-star,aqua.s,moon.s,aqua.s,moss.s,silver-flower,aqua.s,amethyst.s,aqua.s,clear.s,silver-round,aqua.s,fluorite.s,star-charm" },
      { id: "moon-healing", name: "月光療癒", tagline: "月光石照亮每一次重新開始", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-flower,aqua.l,moon.l,aqua.l,moss.l,silver-round,aqua.l,amethyst.l,aqua.l,moon-charm" },
      { id: "breath-gradient", name: "澄心漸層", tagline: "從主石慢慢收細，像呼吸吐納", style: "graduated", wrist: 14, spec: "aqua.x,aqua.l,clear.l,aqua.l,silver-round,fluorite.l,aqua.l,moon.l,aqua.l,silver-star,moss.l,aqua.l,clear.s,angel-wing" },
      { id: "pure-halo", name: "純淨光暈", tagline: "白水晶與月光石的柔和層次", style: "focal", wrist: 14, spec: "aqua.x,aqua.l,clear.l,silver-star,aqua.l,fluorite.l,aqua.l,moon.l,silver-flower,aqua.l,moss.l,aqua.l,star-charm" },
      { id: "soft-restart", name: "溫柔重啟", tagline: "卸下再出發，最輕的一條", style: "delicate", wrist: 14, spec: "aqua.s,clear.s,aqua.s,fluorite.s,aqua.s,silver-flower,moon.s,aqua.s,moss.s,aqua.s,amethyst.s,aqua.s,silver-round,clear.s,aqua.s,fluorite.s,aqua.s" },
      { id: "blue-wisdom", name: "藍海智慧", tagline: "青金石般的沉靜，把想法說清楚", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-round,aqua.l,moon.l,aqua.l,moss.l,silver-star,aqua.l,amethyst.l,aqua.l,shell" },
      { id: "deep-pool", name: "深潭沉靜", tagline: "大顆海藍寶，安靜但存在感強", style: "chunky", wrist: 14, spec: "aqua.x,clear.x,silver-star,aqua.x,fluorite.x,aqua.x,silver-flower,moon.x" },
      { id: "serene-manifesto", name: "澄澈宣言", tagline: "雙主石收尾，系列最完整的一條", style: "duo", wrist: 14, spec: "aqua.x,aqua.l,clear.l,silver-flower,aqua.l,clear.x,fluorite.l,aqua.l,silver-round,moon.l,aqua.l,star-charm" },
    ],
  },
  {
    id: "aurora", zh: "極光", en: "AURORA", audience: "women",
    theme: "守護與直覺", accent: "#6b5bb0", banner: "/banners/aurora.jpg", swatch: "labradorite",
    tagline: "拉長石與紫水晶的暗色流光，替你擋掉多餘的雜訊。",
    craft: "暗色流光，主石款與大顆款並重。",
    tone: ENERGY_TONE,
    products: [
      { id: "aurora-guard", name: "極光守護", tagline: "拉長石流光，低調而堅定", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-hex,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-round,labradorite.l,lapis.l,labradorite.l,evil-eye" },
      { id: "violet-ward", name: "紫夜結界", tagline: "紫水晶加黑碧璽，雙重界線", style: "uniform", wrist: 14, spec: "labradorite.l,amethyst.l,labradorite.l,tourmaline.l,silver-round,labradorite.l,moon.l,labradorite.l,lapis.l,silver-cube,labradorite.l,obsidian.l,labradorite.l,hamsa" },
      { id: "night-shield", name: "暗夜之盾", tagline: "全 20mm 黑曜石，最硬的一道防線", style: "chunky", wrist: 14, spec: "labradorite.x,amethyst.x,silver-cube,labradorite.x,tourmaline.x,labradorite.x,silver-hex,moon.x" },
      { id: "quiet-boundary", name: "沉靜界線", tagline: "黑碧璽與茶晶，穩穩守住自己", style: "uniform", wrist: 14, spec: "labradorite.l,amethyst.l,labradorite.l,tourmaline.l,silver-hex,labradorite.l,moon.l,labradorite.l,lapis.l,silver-round,labradorite.l,obsidian.l,labradorite.l,cross" },
      { id: "moon-watch", name: "月影守望", tagline: "月光石與拉長石的夜色層次", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-round,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-cube,labradorite.l,lapis.l,labradorite.l,moon-charm" },
      { id: "flowing-gradient", name: "流光漸層", tagline: "由深至淺，像極光散開", style: "graduated", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,labradorite.l,silver-cube,tourmaline.l,labradorite.l,moon.l,labradorite.l,silver-hex,lapis.l,labradorite.l,amethyst.s,angel-wing" },
      { id: "stardust", name: "星塵細語", tagline: "8mm 細繩，護符般的存在", style: "delicate", wrist: 14, spec: "labradorite.s,amethyst.s,labradorite.s,tourmaline.s,silver-hex,labradorite.s,moon.s,labradorite.s,lapis.s,silver-round,labradorite.s,obsidian.s,labradorite.s,amethyst.s,silver-cube,labradorite.s,tourmaline.s" },
      { id: "flowing-insight", name: "靈感流光", tagline: "拉長石配青金石，直覺更敏銳", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-round,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-cube,labradorite.l,lapis.l,labradorite.l,evil-eye" },
      { id: "twin-ward", name: "雙生守護", tagline: "兩顆主石對峙，內外都護住", style: "duo", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-cube,labradorite.l,amethyst.x,tourmaline.l,labradorite.l,silver-hex,moon.l,labradorite.l,hamsa" },
      { id: "violet-barrier", name: "紫霧屏障", tagline: "紫水晶與螢石，安定又清明", style: "uniform", wrist: 14, spec: "labradorite.l,amethyst.l,labradorite.l,tourmaline.l,silver-hex,labradorite.l,moon.l,labradorite.l,lapis.l,silver-round,labradorite.l,obsidian.l,labradorite.l,angel-wing" },
      { id: "bedrock-heart", name: "磐石之心", tagline: "大顆黑碧璽，扎實接地", style: "chunky", wrist: 14, spec: "labradorite.x,amethyst.x,silver-round,labradorite.x,tourmaline.x,labradorite.x,silver-cube,moon.x" },
      { id: "aurora-manifesto", name: "極光宣言", tagline: "系列最完整的守護配置", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-cube,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-hex,labradorite.l,lapis.l,labradorite.l,hamsa" },
    ],
  },
  {
    id: "abundance", zh: "豐盈", en: "ABUNDANCE", audience: "women",
    theme: "財富與機運", accent: "#c8912f", banner: "/banners/abundance.jpg", swatch: "citrine",
    tagline: "黃水晶、虎眼石與金沙石，把好運戴在手上不必含蓄。",
    craft: "金調為主，偏好大顆與雙主石。",
    tone: ENERGY_TONE,
    products: [
      { id: "golden-fortune", name: "金石開運", tagline: "全 20mm 黃水晶，招財不含蓄", style: "chunky", wrist: 14, spec: "citrine.x,tiger.x,gold-crown,citrine.x,goldstone.x,citrine.x,gold-rondelle,sunstone.x" },
      { id: "daily-abundance", name: "豐盛日常", tagline: "10mm 黃水晶，天天招好運", style: "uniform", wrist: 14, spec: "citrine.l,tiger.l,citrine.l,goldstone.l,gold-rondelle,citrine.l,sunstone.l,citrine.l,clear.l,gold-knot,citrine.l,rose.l,citrine.l,clover" },
      { id: "tiger-decision", name: "虎眼決斷", tagline: "虎眼石主石，果斷出手", style: "focal", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-knot,citrine.l,goldstone.l,citrine.l,sunstone.l,gold-pixiu,citrine.l,clear.l,citrine.l,key" },
      { id: "goldstone-night", name: "金沙夜語", tagline: "金沙石雙主石，深藍藏金", style: "duo", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-pixiu,citrine.l,tiger.x,goldstone.l,citrine.l,gold-crown,sunstone.l,citrine.l,compass" },
      { id: "fine-gold", name: "細金鍊語", tagline: "8mm 細繩金調，低調的富足", style: "delicate", wrist: 14, spec: "citrine.s,tiger.s,citrine.s,goldstone.s,gold-crown,citrine.s,sunstone.s,citrine.s,clear.s,gold-rondelle,citrine.s,rose.s,citrine.s,tiger.s,gold-knot,citrine.s,goldstone.s" },
      { id: "warm-harvest", name: "暖陽豐收", tagline: "太陽石與黃水晶，暖金滿手", style: "uniform", wrist: 14, spec: "citrine.l,tiger.l,citrine.l,goldstone.l,gold-rondelle,citrine.l,sunstone.l,citrine.l,clear.l,gold-knot,citrine.l,rose.l,citrine.l,sun-charm" },
      { id: "rising-road", name: "漸富之路", tagline: "由大到小，累積的節奏", style: "graduated", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,citrine.l,gold-knot,goldstone.l,citrine.l,sunstone.l,citrine.l,gold-pixiu,clear.l,citrine.l,tiger.s,clover" },
      { id: "crowned", name: "金冠加冕", tagline: "金皇冠隔珠，為主石加冕", style: "focal", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-pixiu,citrine.l,goldstone.l,citrine.l,sunstone.l,gold-crown,citrine.l,clear.l,citrine.l,key" },
      { id: "cash-flow", name: "財源滾滾", tagline: "大顆金沙石，氣勢直接", style: "chunky", wrist: 14, spec: "citrine.x,tiger.x,gold-crown,citrine.x,goldstone.x,citrine.x,gold-rondelle,sunstone.x" },
      { id: "pixiu-keeper", name: "貔貅守財", tagline: "金貔貅坐鎮，只進不出", style: "focal", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-rondelle,citrine.l,goldstone.l,citrine.l,sunstone.l,gold-knot,citrine.l,clear.l,citrine.l,compass" },
      { id: "clear-chance", name: "清晰生財", tagline: "白水晶放大每一次機會", style: "uniform", wrist: 14, spec: "citrine.l,tiger.l,citrine.l,goldstone.l,gold-knot,citrine.l,sunstone.l,citrine.l,clear.l,gold-pixiu,citrine.l,rose.l,citrine.l,key" },
      { id: "abundance-manifesto", name: "豐盈宣言", tagline: "雙主石收官，系列的集大成", style: "duo", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-pixiu,citrine.l,tiger.x,goldstone.l,citrine.l,gold-crown,sunstone.l,citrine.l,sun-charm" },
    ],
  },
  {
    id: "whisper", zh: "細語", en: "WHISPER", audience: "women",
    theme: "日常疊戴", accent: "#a88b7a", banner: "/banners/whisper.jpg", swatch: "moon",
    tagline: "8mm 為主的細繩款，為每天都戴、也為疊戴而生。",
    craft: "幾乎全是 8mm 細繩款，最輕最不搶戲。",
    tone: ENERGY_TONE,
    products: [
      { id: "plain-days", name: "素日細語", tagline: "8mm 月光石，最日常的一條", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-round,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-star,rose.s,moon.s,clear.s,moon.s" },
      { id: "morning-murmur", name: "晨光微語", tagline: "粉晶細繩，通勤也不突兀", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-round,rose.s,moon.s,clear.s,moon.s" },
      { id: "pure-thread", name: "淨白細鍊", tagline: "全白水晶，襯衫下的隱形存在", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,silver-round,moon.s,aqua.s,moon.s,fluorite.s,silver-star,moon.s,amethyst.s,moon.s,rose.s,silver-round,moon.s,clear.s" },
      { id: "sea-breeze", name: "海風輕語", tagline: "海藍寶細繩，涼爽不張揚", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,silver-round,moon.s,rose.s,moon.s,clear.s,star-charm" },
      { id: "violet-hush", name: "霧紫低語", tagline: "紫水晶 8mm，安靜地陪一天", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-round,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-star,rose.s,moon.s,clear.s,moon.s" },
      { id: "fluor-thread", name: "螢光細鍊", tagline: "螢石透亮，光線下才看得見", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,silver-round,moon.s,rose.s,moon.s,clear.s,moon-charm" },
      { id: "two-tone", name: "雙色細語", tagline: "粉晶配月光石，柔和的雙色", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,silver-round,moon.s,aqua.s,moon.s,fluorite.s,silver-star,moon.s,amethyst.s,moon.s,rose.s,silver-round,moon.s,clear.s" },
      { id: "stack-base", name: "疊戴基礎", tagline: "為疊戴而生，不搶任何一條", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-round,rose.s,moon.s,clear.s,moon.s" },
      { id: "soft-weight", name: "微光日常", tagline: "唯一 10mm 款，稍微有點份量", style: "uniform", wrist: 14, spec: "moon.l,rose.l,moon.l,clear.l,silver-round,moon.l,aqua.l,moon.l,fluorite.l,silver-star,moon.l,amethyst.l,moon.l,star-charm" },
      { id: "gentle-space", name: "溫柔留白", tagline: "隔珠留白，最乾淨的排列", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-round,rose.s,moon.s,clear.s,moon.s" },
      { id: "quiet-murmur", name: "靜謐細語", tagline: "10mm 月光石，正常款的細語版", style: "uniform", wrist: 14, spec: "moon.l,rose.l,moon.l,clear.l,silver-round,moon.l,aqua.l,moon.l,fluorite.l,silver-star,moon.l,amethyst.l,moon.l,moon-charm" },
      { id: "whisper-manifesto", name: "細語宣言", tagline: "系列裡最細的一條，8mm 到底", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,silver-star,moon.s,aqua.s,moon.s,fluorite.s,silver-round,moon.s,amethyst.s,moon.s,rose.s,silver-star,moon.s,clear.s" },
    ],
  },
  {
    id: "forge", zh: "曜石", en: "FORGE", audience: "men",
    theme: "力量與守護", accent: "#b8923f", banner: "/banners/forge.jpg", swatch: "obsidian",
    tagline: "黑曜石、赤鐵礦與貔貅隔珠，固定、扎實、不多話。",
    craft: "黑銀硬派，主石款到大顆款皆有。",
    tone: POWER_TONE,
    products: [
      { id: "polar-night", name: "極夜守護者", tagline: "黑曜石與赤鐵礦，全黑硬派", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,silver-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-hex,obsidian.l,lava.l,obsidian.l,travel-compass" },
      { id: "decisive-investor", name: "決斷投資客", tagline: "金沙石雙主石，盤中不手軟", style: "duo", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,gold-hex,obsidian.l,hematite.x,tiger-eye.l,obsidian.l,gold-pixiu,goldstone.l,obsidian.l,compass" },
      { id: "heavy-bedrock", name: "磐石重裝", tagline: "全 20mm 黑曜石，戴起來有重量", style: "chunky", wrist: 14, spec: "obsidian.x,hematite.x,gold-pixiu,obsidian.x,tiger-eye.x,obsidian.x,silver-tiger-spacer,goldstone.x" },
      { id: "iron-will", name: "鋼鐵意志", tagline: "赤鐵礦領銜，銀隔珠收邊", style: "uniform", wrist: 14, spec: "obsidian.l,hematite.l,obsidian.l,tiger-eye.l,silver-tiger-spacer,obsidian.l,goldstone.l,obsidian.l,lava.l,silver-hex,obsidian.l,smoky.l,obsidian.l,arrow" },
      { id: "pixiu-fortune", name: "貔貅招財", tagline: "金貔貅坐鎮，只進不出", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,silver-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-hex,obsidian.l,lava.l,obsidian.l,compass" },
      { id: "tiger-market", name: "虎嘯商場", tagline: "切面虎眼石與虎首隔珠", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,gold-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-pixiu,obsidian.l,lava.l,obsidian.l,compass" },
      { id: "lava-warrior", name: "熔岩戰士", tagline: "火山岩與石榴石，訓練日戰袍", style: "uniform", wrist: 14, spec: "obsidian.l,hematite.l,obsidian.l,tiger-eye.l,gold-pixiu,obsidian.l,goldstone.l,obsidian.l,lava.l,silver-tiger-spacer,obsidian.l,smoky.l,obsidian.l,arrow" },
      { id: "steady-control", name: "沉穩掌控", tagline: "茶晶與黑曜石，安靜地掌握節奏", style: "uniform", wrist: 14, spec: "obsidian.l,hematite.l,obsidian.l,tiger-eye.l,silver-tiger-spacer,obsidian.l,goldstone.l,obsidian.l,lava.l,silver-hex,obsidian.l,smoky.l,obsidian.l,key" },
      { id: "black-gold", name: "黑金權杖", tagline: "黑曜石壓金沙石，低調的宣示", style: "duo", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,silver-hex,obsidian.l,hematite.x,tiger-eye.l,obsidian.l,gold-hex,goldstone.l,obsidian.l,compass" },
      { id: "dawn-expedition", name: "破曉遠征", tagline: "拉長石般的沉光，出差常備", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,gold-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-pixiu,obsidian.l,lava.l,obsidian.l,travel-compass" },
      { id: "minimal-black", name: "極簡黑線", tagline: "8mm 黑曜石細繩，正式場合也能戴", style: "delicate", wrist: 14, spec: "obsidian.s,hematite.s,obsidian.s,tiger-eye.s,gold-pixiu,obsidian.s,goldstone.s,obsidian.s,lava.s,silver-tiger-spacer,obsidian.s,smoky.s,obsidian.s,hematite.s,silver-hex,obsidian.s,tiger-eye.s" },
      { id: "forge-manifesto", name: "曜石宣言", tagline: "系列最重的一條，鏈環收尾", style: "chunky", wrist: 14, spec: "obsidian.x,hematite.x,silver-tiger-spacer,obsidian.x,tiger-eye.x,obsidian.x,silver-hex,goldstone.x" },
    ],
  },
  {
    id: "bedrock", zh: "磐岩", en: "BEDROCK", audience: "men",
    theme: "沉穩重量", accent: "#5f6b70", banner: "/banners/bedrock.jpg", swatch: "hematite",
    tagline: "以 20mm 大顆為主的重裝路線，戴上就有存在感。",
    craft: "以 20mm 大顆款為主，重量是重點。",
    tone: POWER_TONE,
    products: [
      { id: "true-bedrock", name: "磐岩本色", tagline: "全 20mm 赤鐵礦，純粹的重量", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-cube,hematite.x,smoky.x,hematite.x,silver-rivet,lava.x" },
      { id: "obsidian-rock", name: "黑曜磐石", tagline: "大顆黑曜石，一顆抵三顆", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-rivet,hematite.x,smoky.x,hematite.x,silver-groove,lava.x" },
      { id: "sunken-heart", name: "沉巖之心", tagline: "茶晶大顆，沉穩接地", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-groove,hematite.x,smoky.x,hematite.x,silver-shield,lava.x" },
      { id: "lava-block", name: "熔岩塊壘", tagline: "消光火山岩，粗獷的質地", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-shield,hematite.x,smoky.x,hematite.x,silver-cube,lava.x" },
      { id: "iron-wall", name: "鐵壁防線", tagline: "黑碧璽大顆，最強的界線", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-cube,hematite.x,smoky.x,hematite.x,silver-rivet,lava.x" },
      { id: "twin-rock", name: "雙巖對峙", tagline: "兩顆主石，硬碰硬", style: "duo", wrist: 14, spec: "hematite.x,hematite.l,obsidian.l,silver-rivet,hematite.l,obsidian.x,smoky.l,hematite.l,silver-groove,lava.l,hematite.l,arrow" },
      { id: "strata", name: "岩層漸層", tagline: "由大到小，像地層剖面", style: "graduated", wrist: 14, spec: "hematite.x,hematite.l,obsidian.l,hematite.l,silver-groove,smoky.l,hematite.l,lava.l,hematite.l,silver-shield,tourmaline.l,hematite.l,obsidian.s,travel-compass" },
      { id: "bedrock-daily", name: "磐岩日常", tagline: "10mm 版本，重量減半的入門款", style: "uniform", wrist: 14, spec: "hematite.l,obsidian.l,hematite.l,smoky.l,silver-shield,hematite.l,lava.l,hematite.l,tourmaline.l,silver-cube,hematite.l,labradorite.l,hematite.l,cross" },
      { id: "polar-bedrock", name: "極夜磐石", tagline: "黑曜石配赤鐵礦，全黑大顆", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-cube,hematite.x,smoky.x,hematite.x,silver-rivet,lava.x" },
      { id: "glint-in-stone", name: "流光磐岩", tagline: "拉長石主石，硬派中的一點光", style: "focal", wrist: 14, spec: "hematite.x,hematite.l,obsidian.l,silver-rivet,hematite.l,smoky.l,hematite.l,lava.l,silver-groove,hematite.l,tourmaline.l,hematite.l,travel-compass" },
      { id: "rivet-heavy", name: "鉚釘重裝", tagline: "銀鉚釘隔珠，工業感拉滿", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-groove,hematite.x,smoky.x,hematite.x,silver-shield,lava.x" },
      { id: "bedrock-manifesto", name: "磐岩宣言", tagline: "系列最重，戴上就不想拿下", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-shield,hematite.x,smoky.x,hematite.x,silver-cube,lava.x" },
    ],
  },
  {
    id: "velocity", zh: "疾行", en: "VELOCITY", audience: "men",
    theme: "專注與行動", accent: "#2f6f7a", banner: "/banners/velocity.jpg", swatch: "lapis",
    tagline: "輕、細、俐落——為跑步、通勤與長時間專注而配。",
    craft: "多為 8mm 與 10mm，追求輕與俐落。",
    tone: POWER_TONE,
    products: [
      { id: "fine-line", name: "疾行細線", tagline: "8mm 青金石，跑步戴也不晃", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,lapis.s,silver-groove,smoky.s,lapis.s,hematite.s,lapis.s,sunstone.s,lapis.s,silver-chain,clear.s,lapis.s,tiger-eye.s,lapis.s" },
      { id: "blue-steel", name: "藍鋼日常", tagline: "10mm 正常款，通勤標配", style: "uniform", wrist: 14, spec: "lapis.l,clear.l,lapis.l,tiger-eye.l,silver-chain,lapis.l,smoky.l,lapis.l,hematite.l,lapis.l,silver-hex,sunstone.l,lapis.l,clear.l" },
      { id: "clear-view", name: "清晰視野", tagline: "白水晶細繩，思路乾淨", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,silver-hex,lapis.s,smoky.s,lapis.s,hematite.s,silver-groove,lapis.s,sunstone.s,lapis.s,clear.s,silver-chain,lapis.s,tiger-eye.s" },
      { id: "sharp-call", name: "銳利決斷", tagline: "虎眼石與赤鐵礦，果斷不猶豫", style: "uniform", wrist: 14, spec: "lapis.l,clear.l,lapis.l,tiger-eye.l,silver-groove,lapis.l,smoky.l,lapis.l,hematite.l,silver-chain,lapis.l,sunstone.l,lapis.l,arrow" },
      { id: "silent-focus", name: "靜音專注", tagline: "茶晶 8mm，最安靜的一條", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,lapis.s,silver-chain,smoky.s,lapis.s,hematite.s,lapis.s,sunstone.s,lapis.s,silver-hex,clear.s,lapis.s,tiger-eye.s,lapis.s" },
      { id: "deep-tempo", name: "深藍節奏", tagline: "青金石為主，穩定的節拍", style: "uniform", wrist: 14, spec: "lapis.l,clear.l,lapis.l,tiger-eye.l,silver-hex,lapis.l,smoky.l,lapis.l,hematite.l,silver-groove,lapis.l,sunstone.l,lapis.l,key" },
      { id: "accel-gradient", name: "疾行漸層", tagline: "由大到小，像加速的過程", style: "graduated", wrist: 14, spec: "lapis.x,lapis.l,clear.l,lapis.l,silver-groove,tiger-eye.l,lapis.l,smoky.l,lapis.l,silver-chain,hematite.l,lapis.l,clear.s,star-charm" },
      { id: "chain-minimal", name: "鏈環極簡", tagline: "銀鏈環隔珠，細但有結構", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,silver-chain,lapis.s,smoky.s,lapis.s,hematite.s,silver-hex,lapis.s,sunstone.s,lapis.s,clear.s,silver-groove,lapis.s,tiger-eye.s" },
      { id: "solar-sprint", name: "烈日衝刺", tagline: "太陽石主石，爆發的那一下", style: "focal", wrist: 14, spec: "lapis.x,lapis.l,clear.l,silver-hex,lapis.l,tiger-eye.l,lapis.l,smoky.l,silver-groove,lapis.l,hematite.l,lapis.l,arrow" },
      { id: "light-rig", name: "鋼線輕裝", tagline: "全 8mm，幾乎沒有重量", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,lapis.s,silver-groove,smoky.s,lapis.s,hematite.s,lapis.s,sunstone.s,lapis.s,silver-chain,clear.s,lapis.s,tiger-eye.s,lapis.s" },
      { id: "core-focus", name: "專注核心", tagline: "赤鐵礦與白水晶，收束心緒", style: "uniform", wrist: 14, spec: "lapis.l,clear.l,lapis.l,tiger-eye.l,silver-chain,lapis.l,smoky.l,lapis.l,hematite.l,lapis.l,silver-hex,sunstone.l,lapis.l,clear.l" },
      { id: "velocity-manifesto", name: "疾行宣言", tagline: "系列的集大成，快而不亂", style: "focal", wrist: 14, spec: "lapis.x,lapis.l,clear.l,silver-hex,lapis.l,tiger-eye.l,lapis.l,smoky.l,silver-groove,lapis.l,hematite.l,lapis.l,key" },
    ],
  },
]

export const bySeries = Object.fromEntries(SERIES.map((s) => [s.id, s])) as Record<string, Series>;
export function findProduct(seriesId: string, productId: string) {
  return bySeries[seriesId]?.products.find((p) => p.id === productId) ?? null;
}
