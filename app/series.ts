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
  totalEn: string;    // running total caption
  dominantEn: string; // bracelet-centre caption
};

// The women's series speak in 能量 (energy); the men's lines keep the 戰力
// (power/gear) framing the original men's site was built around.
const ENERGY_TONE: SeriesTone = { fab: "ENERGY", matrixEn: "ENERGY MATRIX", totalEn: "TOTAL ENERGY", dominantEn: "DOMINANT ENERGY" };
const POWER_TONE: SeriesTone = { fab: "POWER", matrixEn: "POWER MATRIX", totalEn: "TOTAL POWER", dominantEn: "DOMINANT POWER" };
export const NEUTRAL_TONE = ENERGY_TONE;

export type ConstructionStyle = "focal" | "duo" | "uniform" | "delicate" | "chunky" | "graduated";
export const STYLE_LABEL: Record<ConstructionStyle, string> = {
  focal: "Single Focal", duo: "Twin Focal", uniform: "Uniform 10mm",
  delicate: "Fine 8mm", chunky: "Bold 20mm", graduated: "Graduated",
};

export type Product = { id: string; name: string; tagline: string; style: ConstructionStyle; wrist: number; spec: string };
export type Series = {
  id: string;
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
    id: "bloom", en: "BLOOM", theme: "LOVE & RELATING", audience: "women",
    accent: "#c9738e", banner: "/banners/bloom.jpg", swatch: "rose",
    tagline: "Rose quartz and rhodonite. For anyone willing to be gentle with herself first.",
    craft: "Pink focal stones at the centre — 8mm fine through 20mm bold.",
    tone: ENERGY_TONE,
    products: [
      { id: "first-love", name: "First Confession", tagline: "Rose quartz focal. The very beginning of wanting someone.", style: "focal", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-round,rose.l,moon.l,rose.l,clear.l,gold-rondelle,rose.l,garnet.l,rose.l,heart" },
      { id: "daily-pink", name: "Everyday Rose", tagline: "Even 10mm pink. Made to be worn without thinking.", style: "uniform", wrist: 14, spec: "rose.l,rhodonite.l,rose.l,moon.l,gold-rondelle,rose.l,clear.l,rose.l,garnet.l,rose.l,gold-knot,aqua.l,rose.l,rhodonite.l" },
      { id: "soft-secret", name: "Soft Secret", tagline: "8mm fine strand. A whisper under a shirt cuff.", style: "delicate", wrist: 14, spec: "rose.s,rhodonite.s,rose.s,moon.s,gold-knot,rose.s,clear.s,rose.s,garnet.s,silver-flower,rose.s,aqua.s,rose.s,rhodonite.s,silver-round,rose.s,moon.s,butterfly" },
      { id: "rose-vow", name: "Rose Vow", tagline: "Rhodonite holds the promise you said out loud.", style: "focal", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-flower,rose.l,moon.l,rose.l,clear.l,silver-round,rose.l,garnet.l,rose.l,lock" },
      { id: "twin-hearts", name: "Twin Hearts", tagline: "Two focal stones, evenly matched.", style: "duo", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-round,rose.l,rhodonite.x,moon.l,rose.l,gold-rondelle,clear.l,rose.l,heart" },
      { id: "gentle-guard", name: "Gentle Guard", tagline: "Moonstone and rose quartz, quietly nearby.", style: "uniform", wrist: 14, spec: "rose.l,rhodonite.l,rose.l,moon.l,gold-rondelle,rose.l,clear.l,rose.l,garnet.l,gold-knot,rose.l,aqua.l,rose.l,lotus" },
      { id: "fading-words", name: "Fading Words", tagline: "Large to small, like a sentence finished slowly.", style: "graduated", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,rose.l,gold-knot,moon.l,rose.l,clear.l,rose.l,silver-flower,garnet.l,rose.l,rhodonite.s,butterfly" },
      { id: "light-kiss", name: "Light Kiss", tagline: "The finest of them. Reads like a collarbone chain.", style: "delicate", wrist: 14, spec: "rose.s,rhodonite.s,rose.s,moon.s,rose.s,silver-flower,clear.s,rose.s,garnet.s,rose.s,aqua.s,rose.s,silver-round,rhodonite.s,rose.s,moon.s,rose.s" },
      { id: "heartbeat", name: "Heartbeat", tagline: "Garnet's heat. Impossible to hide.", style: "focal", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-round,rose.l,moon.l,rose.l,clear.l,gold-rondelle,rose.l,garnet.l,rose.l,heart" },
      { id: "full-bloom", name: "Full Bloom", tagline: "All 20mm. It speaks before you do.", style: "chunky", wrist: 14, spec: "rose.x,rhodonite.x,gold-rondelle,rose.x,moon.x,rose.x,gold-knot,clear.x" },
      { id: "kindred", name: "Kindred", tagline: "Aquamarine keeps the conversation clear.", style: "uniform", wrist: 14, spec: "rose.l,rhodonite.l,rose.l,moon.l,gold-knot,rose.l,clear.l,rose.l,garnet.l,silver-flower,rose.l,aqua.l,rose.l,lock" },
      { id: "eternal-vow", name: "Eternal Vow", tagline: "Two focal stones, set for the long way round.", style: "duo", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-flower,rose.l,rhodonite.x,moon.l,rose.l,silver-round,clear.l,rose.l,lock" },
    ],
  },
  {
    id: "serene", en: "SERENE", theme: "HEALING & BREATH", audience: "women",
    accent: "#3f9aab", banner: "/banners/serene.jpg", swatch: "aqua",
    tagline: "Aquamarine, clear quartz and fluorite. For the days you only want to breathe.",
    craft: "Mostly 10mm, with fine strands and graduated pieces.",
    tone: ENERGY_TONE,
    products: [
      { id: "deep-breath", name: "Deep Breath", tagline: "Aquamarine, loosening you the way the sea does.", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-round,aqua.l,moon.l,aqua.l,moss.l,silver-star,aqua.l,amethyst.l,aqua.l,shell" },
      { id: "morning-clarity", name: "Morning Clarity", tagline: "Fine clear quartz. The first air of the day.", style: "delicate", wrist: 14, spec: "aqua.s,clear.s,aqua.s,fluorite.s,silver-star,aqua.s,moon.s,aqua.s,moss.s,silver-flower,aqua.s,amethyst.s,aqua.s,clear.s,silver-round,aqua.s,fluorite.s" },
      { id: "still-mind", name: "Still Mind", tagline: "Amethyst settles. Wear it before sleep.", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-flower,aqua.l,moon.l,aqua.l,moss.l,silver-round,aqua.l,amethyst.l,aqua.l,angel-wing" },
      { id: "forest-breath", name: "Forest Breath", tagline: "Moss agate. Back to your own tempo.", style: "focal", wrist: 14, spec: "aqua.x,aqua.l,clear.l,silver-round,aqua.l,fluorite.l,aqua.l,moon.l,silver-star,aqua.l,moss.l,aqua.l,leaf" },
      { id: "dewlight", name: "Dewlight", tagline: "8mm fluorite. Translucent, never loud.", style: "delicate", wrist: 14, spec: "aqua.s,clear.s,aqua.s,fluorite.s,silver-star,aqua.s,moon.s,aqua.s,moss.s,silver-flower,aqua.s,amethyst.s,aqua.s,clear.s,silver-round,aqua.s,fluorite.s,star-charm" },
      { id: "moon-healing", name: "Moon Healing", tagline: "Moonstone lights every fresh start.", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-flower,aqua.l,moon.l,aqua.l,moss.l,silver-round,aqua.l,amethyst.l,aqua.l,moon-charm" },
      { id: "breath-gradient", name: "Breath Gradient", tagline: "Tapering from the focal stone, like an exhale.", style: "graduated", wrist: 14, spec: "aqua.x,aqua.l,clear.l,aqua.l,silver-round,fluorite.l,aqua.l,moon.l,aqua.l,silver-star,moss.l,aqua.l,clear.s,angel-wing" },
      { id: "pure-halo", name: "Pure Halo", tagline: "Clear quartz and moonstone in soft layers.", style: "focal", wrist: 14, spec: "aqua.x,aqua.l,clear.l,silver-star,aqua.l,fluorite.l,aqua.l,moon.l,silver-flower,aqua.l,moss.l,aqua.l,star-charm" },
      { id: "soft-restart", name: "Soft Restart", tagline: "Put it down, begin again. The lightest one here.", style: "delicate", wrist: 14, spec: "aqua.s,clear.s,aqua.s,fluorite.s,aqua.s,silver-flower,moon.s,aqua.s,moss.s,aqua.s,amethyst.s,aqua.s,silver-round,clear.s,aqua.s,fluorite.s,aqua.s" },
      { id: "blue-wisdom", name: "Blue Wisdom", tagline: "Lapis calm. Says the thing plainly.", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-round,aqua.l,moon.l,aqua.l,moss.l,silver-star,aqua.l,amethyst.l,aqua.l,shell" },
      { id: "deep-pool", name: "Deep Pool", tagline: "Large aquamarine. Quiet, and impossible to miss.", style: "chunky", wrist: 14, spec: "aqua.x,clear.x,silver-star,aqua.x,fluorite.x,aqua.x,silver-flower,moon.x" },
      { id: "serene-manifesto", name: "Serene Manifesto", tagline: "Two focal stones. The fullest piece in the series.", style: "duo", wrist: 14, spec: "aqua.x,aqua.l,clear.l,silver-flower,aqua.l,clear.x,fluorite.l,aqua.l,silver-round,moon.l,aqua.l,star-charm" },
    ],
  },
  {
    id: "aurora", en: "AURORA", theme: "PROTECTION & INTUITION", audience: "women",
    accent: "#6b5bb0", banner: "/banners/aurora.jpg", swatch: "labradorite",
    tagline: "Labradorite and amethyst, dark and shifting. Turns away what isn't yours.",
    craft: "Dark flash. Focal and bold pieces in equal measure.",
    tone: ENERGY_TONE,
    products: [
      { id: "aurora-guard", name: "Aurora Guard", tagline: "Labradorite flash. Understated and immovable.", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-hex,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-round,labradorite.l,lapis.l,labradorite.l,evil-eye" },
      { id: "violet-ward", name: "Violet Ward", tagline: "Amethyst with black tourmaline. Two lines drawn.", style: "uniform", wrist: 14, spec: "labradorite.l,amethyst.l,labradorite.l,tourmaline.l,silver-round,labradorite.l,moon.l,labradorite.l,lapis.l,silver-cube,labradorite.l,obsidian.l,labradorite.l,hamsa" },
      { id: "night-shield", name: "Night Shield", tagline: "All 20mm obsidian. The hardest wall we make.", style: "chunky", wrist: 14, spec: "labradorite.x,amethyst.x,silver-cube,labradorite.x,tourmaline.x,labradorite.x,silver-hex,moon.x" },
      { id: "quiet-boundary", name: "Quiet Boundary", tagline: "Tourmaline and smoky quartz, holding the edge.", style: "uniform", wrist: 14, spec: "labradorite.l,amethyst.l,labradorite.l,tourmaline.l,silver-hex,labradorite.l,moon.l,labradorite.l,lapis.l,silver-round,labradorite.l,obsidian.l,labradorite.l,cross" },
      { id: "moon-watch", name: "Moon Watch", tagline: "Moonstone over labradorite, layered like dusk.", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-round,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-cube,labradorite.l,lapis.l,labradorite.l,moon-charm" },
      { id: "flowing-gradient", name: "Flowing Gradient", tagline: "Deep to pale, the way an aurora opens.", style: "graduated", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,labradorite.l,silver-cube,tourmaline.l,labradorite.l,moon.l,labradorite.l,silver-hex,lapis.l,labradorite.l,amethyst.s,angel-wing" },
      { id: "stardust", name: "Stardust", tagline: "8mm fine strand. Worn like an amulet.", style: "delicate", wrist: 14, spec: "labradorite.s,amethyst.s,labradorite.s,tourmaline.s,silver-hex,labradorite.s,moon.s,labradorite.s,lapis.s,silver-round,labradorite.s,obsidian.s,labradorite.s,amethyst.s,silver-cube,labradorite.s,tourmaline.s" },
      { id: "flowing-insight", name: "Flowing Insight", tagline: "Labradorite with lapis. Sharpens the instinct.", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-round,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-cube,labradorite.l,lapis.l,labradorite.l,evil-eye" },
      { id: "twin-ward", name: "Twin Ward", tagline: "Two focal stones facing out, and in.", style: "duo", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-cube,labradorite.l,amethyst.x,tourmaline.l,labradorite.l,silver-hex,moon.l,labradorite.l,hamsa" },
      { id: "violet-barrier", name: "Violet Barrier", tagline: "Amethyst at 20mm. Nothing gets through casually.", style: "uniform", wrist: 14, spec: "labradorite.l,amethyst.l,labradorite.l,tourmaline.l,silver-hex,labradorite.l,moon.l,labradorite.l,lapis.l,silver-round,labradorite.l,obsidian.l,labradorite.l,angel-wing" },
      { id: "bedrock-heart", name: "Obsidian Heart", tagline: "Black at the centre, light all around it.", style: "chunky", wrist: 14, spec: "labradorite.x,amethyst.x,silver-round,labradorite.x,tourmaline.x,labradorite.x,silver-cube,moon.x" },
      { id: "aurora-manifesto", name: "Aurora Manifesto", tagline: "The series, said in full.", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-cube,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-hex,labradorite.l,lapis.l,labradorite.l,hamsa" },
    ],
  },
  {
    id: "abundance", en: "ABUNDANCE", theme: "ABUNDANCE & FLOW", audience: "women",
    accent: "#c8912f", banner: "/banners/abundance.jpg", swatch: "citrine",
    tagline: "Citrine, tiger eye and goldstone. No need to be coy about what you want.",
    craft: "Gold tones, leaning bold and twin-focal.",
    tone: ENERGY_TONE,
    products: [
      { id: "golden-fortune", name: "Golden Fortune", tagline: "All 20mm citrine. Not being coy about it.", style: "chunky", wrist: 14, spec: "citrine.x,tiger.x,gold-crown,citrine.x,goldstone.x,citrine.x,gold-rondelle,sunstone.x" },
      { id: "daily-abundance", name: "Daily Abundance", tagline: "Even 10mm gold tones, for ordinary days.", style: "uniform", wrist: 14, spec: "citrine.l,tiger.l,citrine.l,goldstone.l,gold-rondelle,citrine.l,sunstone.l,citrine.l,clear.l,gold-knot,citrine.l,rose.l,citrine.l,clover" },
      { id: "tiger-decision", name: "Tiger's Call", tagline: "Tiger eye, for the decision you keep postponing.", style: "focal", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-knot,citrine.l,goldstone.l,citrine.l,sunstone.l,gold-pixiu,citrine.l,clear.l,citrine.l,key" },
      { id: "goldstone-night", name: "Goldstone Night", tagline: "Gold flecks across midnight blue.", style: "duo", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-pixiu,citrine.l,tiger.x,goldstone.l,citrine.l,gold-crown,sunstone.l,citrine.l,compass" },
      { id: "fine-gold", name: "Fine Gold", tagline: "8mm. Wealth, worn lightly.", style: "delicate", wrist: 14, spec: "citrine.s,tiger.s,citrine.s,goldstone.s,gold-crown,citrine.s,sunstone.s,citrine.s,clear.s,gold-rondelle,citrine.s,rose.s,citrine.s,tiger.s,gold-knot,citrine.s,goldstone.s" },
      { id: "warm-harvest", name: "Warm Harvest", tagline: "Sunstone and citrine. What you already gathered.", style: "uniform", wrist: 14, spec: "citrine.l,tiger.l,citrine.l,goldstone.l,gold-rondelle,citrine.l,sunstone.l,citrine.l,clear.l,gold-knot,citrine.l,rose.l,citrine.l,sun-charm" },
      { id: "rising-road", name: "Rising Road", tagline: "Graduated, like a road going up.", style: "graduated", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,citrine.l,gold-knot,goldstone.l,citrine.l,sunstone.l,citrine.l,gold-pixiu,clear.l,citrine.l,tiger.s,clover" },
      { id: "crowned", name: "Crowned", tagline: "A gold crown spacer, clearing the stage.", style: "focal", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-pixiu,citrine.l,goldstone.l,citrine.l,sunstone.l,gold-crown,citrine.l,clear.l,citrine.l,key" },
      { id: "cash-flow", name: "Cash Flow", tagline: "Movement, not hoarding.", style: "chunky", wrist: 14, spec: "citrine.x,tiger.x,gold-crown,citrine.x,goldstone.x,citrine.x,gold-rondelle,sunstone.x" },
      { id: "pixiu-keeper", name: "Pixiu Keeper", tagline: "The wealth beast, standing guard.", style: "focal", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-rondelle,citrine.l,goldstone.l,citrine.l,sunstone.l,gold-knot,citrine.l,clear.l,citrine.l,compass" },
      { id: "clear-chance", name: "Clear Chance", tagline: "Clear quartz opens the way.", style: "uniform", wrist: 14, spec: "citrine.l,tiger.l,citrine.l,goldstone.l,gold-knot,citrine.l,sunstone.l,citrine.l,clear.l,gold-pixiu,citrine.l,rose.l,citrine.l,key" },
      { id: "abundance-manifesto", name: "Abundance Manifesto", tagline: "Two focal stones. The whole argument.", style: "duo", wrist: 14, spec: "citrine.x,citrine.l,tiger.l,gold-pixiu,citrine.l,tiger.x,goldstone.l,citrine.l,gold-crown,sunstone.l,citrine.l,sun-charm" },
    ],
  },
  {
    id: "whisper", en: "WHISPER", theme: "EVERYDAY LAYERS", audience: "women",
    accent: "#a88b7a", banner: "/banners/whisper.jpg", swatch: "moon",
    tagline: "Fine 8mm strands. Light enough to forget, and always still there.",
    craft: "Almost entirely 8mm. The lightest, least insistent line.",
    tone: ENERGY_TONE,
    products: [
      { id: "plain-days", name: "Plain Days", tagline: "8mm moonstone. The most ordinary one, on purpose.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-round,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-star,rose.s,moon.s,clear.s,moon.s" },
      { id: "morning-murmur", name: "Morning Murmur", tagline: "First thing, barely there.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-round,rose.s,moon.s,clear.s,moon.s" },
      { id: "pure-thread", name: "Pure Thread", tagline: "Clear quartz, fine as a thread.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,silver-round,moon.s,aqua.s,moon.s,fluorite.s,silver-star,moon.s,amethyst.s,moon.s,rose.s,silver-round,moon.s,clear.s" },
      { id: "sea-breeze", name: "Sea Breeze", tagline: "Aquamarine at 8mm. Cool and easy.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,silver-round,moon.s,rose.s,moon.s,clear.s,star-charm" },
      { id: "violet-hush", name: "Violet Hush", tagline: "Amethyst, turned all the way down.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-round,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-star,rose.s,moon.s,clear.s,moon.s" },
      { id: "fluor-thread", name: "Fluorite Thread", tagline: "Green translucence, almost weightless.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,silver-round,moon.s,rose.s,moon.s,clear.s,moon-charm" },
      { id: "two-tone", name: "Two Tone", tagline: "Two stones alternating, nothing more.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,silver-round,moon.s,aqua.s,moon.s,fluorite.s,silver-star,moon.s,amethyst.s,moon.s,rose.s,silver-round,moon.s,clear.s" },
      { id: "stack-base", name: "Stack Base", tagline: "Built to sit under everything else.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-round,rose.s,moon.s,clear.s,moon.s" },
      { id: "soft-weight", name: "Soft Weight", tagline: "10mm, for when 8mm isn't quite enough.", style: "uniform", wrist: 14, spec: "moon.l,rose.l,moon.l,clear.l,silver-round,moon.l,aqua.l,moon.l,fluorite.l,silver-star,moon.l,amethyst.l,moon.l,star-charm" },
      { id: "gentle-space", name: "Gentle Space", tagline: "Spacers doing most of the talking.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-star,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-round,rose.s,moon.s,clear.s,moon.s" },
      { id: "quiet-murmur", name: "Quiet Murmur", tagline: "You'll forget it's on. It still is.", style: "uniform", wrist: 14, spec: "moon.l,rose.l,moon.l,clear.l,silver-round,moon.l,aqua.l,moon.l,fluorite.l,silver-star,moon.l,amethyst.l,moon.l,moon-charm" },
      { id: "whisper-manifesto", name: "Whisper Manifesto", tagline: "The lightest statement in the house.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,silver-star,moon.s,aqua.s,moon.s,fluorite.s,silver-round,moon.s,amethyst.s,moon.s,rose.s,silver-star,moon.s,clear.s" },
    ],
  },
  {
    id: "forge", en: "FORGE", theme: "STRENGTH & GUARD", audience: "men",
    accent: "#b8923f", banner: "/banners/forge.jpg", swatch: "obsidian",
    tagline: "Obsidian, hematite and pixiu spacers. Solid, quiet, unexplained.",
    craft: "Black and silver. Focal through bold.",
    tone: POWER_TONE,
    products: [
      { id: "polar-night", name: "Polar Night", tagline: "Obsidian and hematite. All black, no softening.", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,silver-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-hex,obsidian.l,lava.l,obsidian.l,travel-compass" },
      { id: "decisive-investor", name: "The Decisive", tagline: "Tiger eye and goldstone. For calling it.", style: "duo", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,gold-hex,obsidian.l,hematite.x,tiger-eye.l,obsidian.l,gold-pixiu,goldstone.l,obsidian.l,compass" },
      { id: "heavy-bedrock", name: "Heavy Ground", tagline: "20mm hematite. Weight you can feel.", style: "chunky", wrist: 14, spec: "obsidian.x,hematite.x,gold-pixiu,obsidian.x,tiger-eye.x,obsidian.x,silver-tiger-spacer,goldstone.x" },
      { id: "iron-will", name: "Iron Will", tagline: "Hematite throughout. Nothing decorative.", style: "uniform", wrist: 14, spec: "obsidian.l,hematite.l,obsidian.l,tiger-eye.l,silver-tiger-spacer,obsidian.l,goldstone.l,obsidian.l,lava.l,silver-hex,obsidian.l,smoky.l,obsidian.l,arrow" },
      { id: "pixiu-fortune", name: "Pixiu Fortune", tagline: "Gold pixiu against black stone.", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,silver-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-hex,obsidian.l,lava.l,obsidian.l,compass" },
      { id: "tiger-market", name: "Tiger Market", tagline: "Tiger eye, for reading the room.", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,gold-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-pixiu,obsidian.l,lava.l,obsidian.l,compass" },
      { id: "lava-warrior", name: "Lava Warrior", tagline: "Matte volcanic rock. Heat under the surface.", style: "uniform", wrist: 14, spec: "obsidian.l,hematite.l,obsidian.l,tiger-eye.l,gold-pixiu,obsidian.l,goldstone.l,obsidian.l,lava.l,silver-tiger-spacer,obsidian.l,smoky.l,obsidian.l,arrow" },
      { id: "steady-control", name: "Steady Hand", tagline: "Smoky quartz. Holds the line.", style: "uniform", wrist: 14, spec: "obsidian.l,hematite.l,obsidian.l,tiger-eye.l,silver-tiger-spacer,obsidian.l,goldstone.l,obsidian.l,lava.l,silver-hex,obsidian.l,smoky.l,obsidian.l,key" },
      { id: "black-gold", name: "Black Gold", tagline: "Obsidian with gold hardware.", style: "duo", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,silver-hex,obsidian.l,hematite.x,tiger-eye.l,obsidian.l,gold-hex,goldstone.l,obsidian.l,compass" },
      { id: "dawn-expedition", name: "Dawn Expedition", tagline: "Lapis and labradorite. Built to travel.", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,gold-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-pixiu,obsidian.l,lava.l,obsidian.l,travel-compass" },
      { id: "minimal-black", name: "Minimal Black", tagline: "8mm. The quietest way to wear it.", style: "delicate", wrist: 14, spec: "obsidian.s,hematite.s,obsidian.s,tiger-eye.s,gold-pixiu,obsidian.s,goldstone.s,obsidian.s,lava.s,silver-tiger-spacer,obsidian.s,smoky.s,obsidian.s,hematite.s,silver-hex,obsidian.s,tiger-eye.s" },
      { id: "forge-manifesto", name: "Forge Manifesto", tagline: "Two focal stones. The series, stated.", style: "chunky", wrist: 14, spec: "obsidian.x,hematite.x,silver-tiger-spacer,obsidian.x,tiger-eye.x,obsidian.x,silver-hex,goldstone.x" },
    ],
  },
  {
    id: "bedrock", en: "BEDROCK", theme: "WEIGHT & ANCHOR", audience: "men",
    accent: "#5f6b70", banner: "/banners/bedrock.jpg", swatch: "hematite",
    tagline: "Built on 20mm stone. The weight is the point.",
    craft: "Mostly 20mm. Weight above everything.",
    tone: POWER_TONE,
    products: [
      { id: "true-bedrock", name: "True Bedrock", tagline: "All 20mm hematite. Pure weight.", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-cube,hematite.x,smoky.x,hematite.x,silver-rivet,lava.x" },
      { id: "obsidian-rock", name: "Obsidian Rock", tagline: "Black, at full scale.", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-rivet,hematite.x,smoky.x,hematite.x,silver-groove,lava.x" },
      { id: "sunken-heart", name: "Sunken Core", tagline: "Smoky quartz at the centre, dark around it.", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-groove,hematite.x,smoky.x,hematite.x,silver-shield,lava.x" },
      { id: "lava-block", name: "Lava Block", tagline: "Matte and heavy. No shine at all.", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-shield,hematite.x,smoky.x,hematite.x,silver-cube,lava.x" },
      { id: "iron-wall", name: "Iron Wall", tagline: "Hematite, shoulder to shoulder.", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-cube,hematite.x,smoky.x,hematite.x,silver-rivet,lava.x" },
      { id: "twin-rock", name: "Twin Rock", tagline: "Two focal stones. Both of them large.", style: "duo", wrist: 14, spec: "hematite.x,hematite.l,obsidian.l,silver-rivet,hematite.l,obsidian.x,smoky.l,hematite.l,silver-groove,lava.l,hematite.l,arrow" },
      { id: "strata", name: "Strata", tagline: "Graduated, like layers in a cliff face.", style: "graduated", wrist: 14, spec: "hematite.x,hematite.l,obsidian.l,hematite.l,silver-groove,smoky.l,hematite.l,lava.l,hematite.l,silver-shield,tourmaline.l,hematite.l,obsidian.s,travel-compass" },
      { id: "bedrock-daily", name: "Bedrock Daily", tagline: "10mm. Bedrock, for a working week.", style: "uniform", wrist: 14, spec: "hematite.l,obsidian.l,hematite.l,smoky.l,silver-shield,hematite.l,lava.l,hematite.l,tourmaline.l,silver-cube,hematite.l,labradorite.l,hematite.l,cross" },
      { id: "polar-bedrock", name: "Polar Bedrock", tagline: "Tourmaline and hematite. Coldest of the line.", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-cube,hematite.x,smoky.x,hematite.x,silver-rivet,lava.x" },
      { id: "glint-in-stone", name: "Glint", tagline: "Labradorite — the one flash of light.", style: "focal", wrist: 14, spec: "hematite.x,hematite.l,obsidian.l,silver-rivet,hematite.l,smoky.l,hematite.l,lava.l,silver-groove,hematite.l,tourmaline.l,hematite.l,travel-compass" },
      { id: "rivet-heavy", name: "Rivet", tagline: "Silver rivets between 20mm stone.", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-groove,hematite.x,smoky.x,hematite.x,silver-shield,lava.x" },
      { id: "bedrock-manifesto", name: "Bedrock Manifesto", tagline: "The heaviest thing we will make you.", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-shield,hematite.x,smoky.x,hematite.x,silver-cube,lava.x" },
    ],
  },
  {
    id: "velocity", en: "VELOCITY", theme: "FOCUS & MOTION", audience: "men",
    accent: "#2f6f7a", banner: "/banners/velocity.jpg", swatch: "lapis",
    tagline: "Light, fine, quick. Made for long hours of focus.",
    craft: "Mostly 8mm and 10mm, chasing lightness.",
    tone: POWER_TONE,
    products: [
      { id: "fine-line", name: "Fine Line", tagline: "8mm lapis. Won't move when you run.", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,lapis.s,silver-groove,smoky.s,lapis.s,hematite.s,lapis.s,sunstone.s,lapis.s,silver-chain,clear.s,lapis.s,tiger-eye.s,lapis.s" },
      { id: "blue-steel", name: "Blue Steel", tagline: "Lapis and hematite. Cool and quick.", style: "uniform", wrist: 14, spec: "lapis.l,clear.l,lapis.l,tiger-eye.l,silver-chain,lapis.l,smoky.l,lapis.l,hematite.l,lapis.l,silver-hex,sunstone.l,lapis.l,clear.l" },
      { id: "clear-view", name: "Clear View", tagline: "Clear quartz. Nothing in the way.", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,silver-hex,lapis.s,smoky.s,lapis.s,hematite.s,silver-groove,lapis.s,sunstone.s,lapis.s,clear.s,silver-chain,lapis.s,tiger-eye.s" },
      { id: "sharp-call", name: "Sharp Call", tagline: "Tiger eye, for the fast decision.", style: "uniform", wrist: 14, spec: "lapis.l,clear.l,lapis.l,tiger-eye.l,silver-groove,lapis.l,smoky.l,lapis.l,hematite.l,silver-chain,lapis.l,sunstone.l,lapis.l,arrow" },
      { id: "silent-focus", name: "Silent Focus", tagline: "Smoky quartz. Hours of it.", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,lapis.s,silver-chain,smoky.s,lapis.s,hematite.s,lapis.s,sunstone.s,lapis.s,silver-hex,clear.s,lapis.s,tiger-eye.s,lapis.s" },
      { id: "deep-tempo", name: "Deep Tempo", tagline: "Lapis at 10mm. A steady beat.", style: "uniform", wrist: 14, spec: "lapis.l,clear.l,lapis.l,tiger-eye.l,silver-hex,lapis.l,smoky.l,lapis.l,hematite.l,silver-groove,lapis.l,sunstone.l,lapis.l,key" },
      { id: "accel-gradient", name: "Acceleration", tagline: "Graduated, building as it goes.", style: "graduated", wrist: 14, spec: "lapis.x,lapis.l,clear.l,lapis.l,silver-groove,tiger-eye.l,lapis.l,smoky.l,lapis.l,silver-chain,hematite.l,lapis.l,clear.s,star-charm" },
      { id: "chain-minimal", name: "Chain Minimal", tagline: "Silver links, 8mm stone.", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,silver-chain,lapis.s,smoky.s,lapis.s,hematite.s,silver-hex,lapis.s,sunstone.s,lapis.s,clear.s,silver-groove,lapis.s,tiger-eye.s" },
      { id: "solar-sprint", name: "Solar Sprint", tagline: "Sunstone. Heat for the last kilometre.", style: "focal", wrist: 14, spec: "lapis.x,lapis.l,clear.l,silver-hex,lapis.l,tiger-eye.l,lapis.l,smoky.l,silver-groove,lapis.l,hematite.l,lapis.l,arrow" },
      { id: "light-rig", name: "Light Rig", tagline: "The lightest in the men's line.", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,lapis.s,silver-groove,smoky.s,lapis.s,hematite.s,lapis.s,sunstone.s,lapis.s,silver-chain,clear.s,lapis.s,tiger-eye.s,lapis.s" },
      { id: "core-focus", name: "Core Focus", tagline: "Lapis focal. One thing at a time.", style: "uniform", wrist: 14, spec: "lapis.l,clear.l,lapis.l,tiger-eye.l,silver-chain,lapis.l,smoky.l,lapis.l,hematite.l,lapis.l,silver-hex,sunstone.l,lapis.l,clear.l" },
      { id: "velocity-manifesto", name: "Velocity Manifesto", tagline: "The series, at speed.", style: "focal", wrist: 14, spec: "lapis.x,lapis.l,clear.l,silver-hex,lapis.l,tiger-eye.l,lapis.l,smoky.l,silver-groove,lapis.l,hematite.l,lapis.l,key" },
    ],
  },
]

export const bySeries = Object.fromEntries(SERIES.map((s) => [s.id, s])) as Record<string, Series>;
export function findProduct(seriesId: string, productId: string) {
  return bySeries[seriesId]?.products.find((p) => p.id === productId) ?? null;
}
