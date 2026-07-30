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
    craft: "A 20mm rose focal, a fine moonstone strand, all-20mm rhodonite, and a graduated fade.",
    tone: ENERGY_TONE,
    products: [
      { id: "first-love", name: "First Confession", tagline: "20mm rose quartz focal. The very beginning of wanting someone.", style: "focal", wrist: 14, spec: "rose.x,rose.l,rhodonite.l,silver-round,rose.l,moon.l,rose.l,clear.l,gold-rondelle,rose.l,garnet.l,rose.l,heart" },
      { id: "soft-secret", name: "Soft Secret", tagline: "8mm moonstone, pale and fine. A whisper under a shirt cuff.", style: "delicate", wrist: 14, spec: "moon.s,clear.s,moon.s,garnet.s,gold-rondelle,moon.s,aqua.s,moon.s,rose.s,gold-knot,moon.s,rhodonite.s,moon.s,clear.s,silver-flower,moon.s,garnet.s,butterfly" },
      { id: "full-bloom", name: "Full Bloom", tagline: "All 20mm rhodonite. Deep pink, and it speaks before you do.", style: "chunky", wrist: 14, spec: "rhodonite.x,moon.x,gold-knot,rhodonite.x,clear.x,rhodonite.x,silver-flower,garnet.x" },
      { id: "fading-words", name: "Fading Words", tagline: "Clear quartz tapering small, pink surfacing through it.", style: "graduated", wrist: 14, spec: "clear.x,clear.l,garnet.l,clear.l,silver-flower,aqua.l,clear.l,rose.l,clear.l,silver-round,rhodonite.l,clear.l,garnet.s,lotus" },
    ],
  },
  {
    id: "serene", en: "SERENE", theme: "HEALING & BREATH", audience: "women",
    accent: "#3f9aab", banner: "/banners/serene.jpg", swatch: "aqua",
    tagline: "Aquamarine, clear quartz and fluorite. For the days you only want to breathe.",
    craft: "Even 10mm aquamarine, fine clear quartz, bold amethyst, and a fluorite gradient.",
    tone: ENERGY_TONE,
    products: [
      { id: "deep-breath", name: "Deep Breath", tagline: "Even 10mm aquamarine, loosening you the way the sea does.", style: "uniform", wrist: 14, spec: "aqua.l,clear.l,aqua.l,fluorite.l,silver-round,aqua.l,moon.l,aqua.l,moss.l,silver-star,aqua.l,amethyst.l,aqua.l,shell" },
      { id: "morning-clarity", name: "Morning Clarity", tagline: "8mm clear quartz. The first air of the day.", style: "delicate", wrist: 14, spec: "clear.s,fluorite.s,clear.s,moon.s,silver-star,clear.s,moss.s,clear.s,amethyst.s,silver-flower,clear.s,aqua.s,clear.s,fluorite.s,silver-round,clear.s,moon.s,moon-charm" },
      { id: "deep-pool", name: "Deep Pool", tagline: "All 20mm amethyst. Quiet, and impossible to miss.", style: "chunky", wrist: 14, spec: "amethyst.x,aqua.x,silver-flower,amethyst.x,clear.x,amethyst.x,silver-round,fluorite.x" },
      { id: "breath-gradient", name: "Breath Gradient", tagline: "Fluorite thinning out, like a long exhale.", style: "graduated", wrist: 14, spec: "fluorite.x,fluorite.l,moon.l,fluorite.l,silver-round,moss.l,fluorite.l,amethyst.l,fluorite.l,silver-star,aqua.l,fluorite.l,moon.s,leaf" },
    ],
  },
  {
    id: "aurora", en: "AURORA", theme: "PROTECTION & INTUITION", audience: "women",
    accent: "#6b5bb0", banner: "/banners/aurora.jpg", swatch: "labradorite",
    tagline: "Labradorite and amethyst, dark and shifting. Turns away what isn't yours.",
    craft: "A labradorite focal, fine moonstone, all-20mm obsidian, and a lapis gradient.",
    tone: ENERGY_TONE,
    products: [
      { id: "aurora-guard", name: "Aurora Guard", tagline: "20mm labradorite focal. Understated, and immovable.", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,amethyst.l,silver-hex,labradorite.l,tourmaline.l,labradorite.l,moon.l,silver-round,labradorite.l,lapis.l,labradorite.l,evil-eye" },
      { id: "stardust", name: "Stardust", tagline: "8mm moonstone. Worn close, like an amulet.", style: "delicate", wrist: 14, spec: "moon.s,lapis.s,moon.s,obsidian.s,silver-round,moon.s,labradorite.s,moon.s,amethyst.s,silver-cube,moon.s,tourmaline.s,moon.s,lapis.s,silver-hex,moon.s,obsidian.s,moon-charm" },
      { id: "night-shield", name: "Night Shield", tagline: "All 20mm obsidian. The hardest wall we make.", style: "chunky", wrist: 14, spec: "obsidian.x,labradorite.x,silver-cube,obsidian.x,amethyst.x,obsidian.x,silver-hex,tourmaline.x" },
      { id: "flowing-gradient", name: "Flowing Gradient", tagline: "Lapis deepening to fine, the way an aurora opens.", style: "graduated", wrist: 14, spec: "lapis.x,lapis.l,obsidian.l,lapis.l,silver-hex,labradorite.l,lapis.l,amethyst.l,lapis.l,silver-round,tourmaline.l,lapis.l,obsidian.s,hamsa" },
    ],
  },
  {
    id: "abundance", en: "ABUNDANCE", theme: "ABUNDANCE & FLOW", audience: "women",
    accent: "#c8912f", banner: "/banners/abundance.jpg", swatch: "citrine",
    tagline: "Citrine, tiger eye and goldstone. No need to be coy about what you want.",
    craft: "All-20mm citrine, fine clear quartz on gold, a tiger eye focal, and a goldstone gradient.",
    tone: ENERGY_TONE,
    products: [
      { id: "golden-fortune", name: "Golden Fortune", tagline: "All 20mm citrine. Not being coy about it.", style: "chunky", wrist: 14, spec: "citrine.x,tiger.x,gold-crown,citrine.x,goldstone.x,citrine.x,gold-rondelle,sunstone.x" },
      { id: "fine-gold", name: "Fine Gold", tagline: "8mm clear quartz on gold. Wealth, worn lightly.", style: "delicate", wrist: 14, spec: "clear.s,rose.s,clear.s,citrine.s,clear.s,gold-rondelle,tiger.s,clear.s,goldstone.s,clear.s,sunstone.s,gold-knot,clear.s,rose.s,clear.s,citrine.s,compass" },
      { id: "tiger-decision", name: "Tiger's Call", tagline: "20mm tiger eye focal, for the decision you keep postponing.", style: "focal", wrist: 14, spec: "tiger.x,tiger.l,goldstone.l,gold-knot,tiger.l,sunstone.l,tiger.l,clear.l,gold-pixiu,tiger.l,rose.l,tiger.l,key" },
      { id: "rising-road", name: "Rising Road", tagline: "Goldstone stepping down. Midnight blue, flecked gold.", style: "graduated", wrist: 14, spec: "goldstone.x,goldstone.l,sunstone.l,goldstone.l,gold-pixiu,clear.l,goldstone.l,rose.l,goldstone.l,gold-crown,citrine.l,goldstone.l,sunstone.s,clover" },
    ],
  },
  {
    id: "whisper", en: "WHISPER", theme: "EVERYDAY LAYERS", audience: "women",
    accent: "#a88b7a", banner: "/banners/whisper.jpg", swatch: "moon",
    tagline: "Fine 8mm strands. Light enough to forget, and always still there.",
    craft: "Fine moonstone, fine aquamarine, 10mm rose quartz, and an amethyst fade. Nothing heavier.",
    tone: ENERGY_TONE,
    products: [
      { id: "plain-days", name: "Plain Days", tagline: "8mm moonstone. The most ordinary one, on purpose.", style: "delicate", wrist: 14, spec: "moon.s,rose.s,moon.s,clear.s,moon.s,silver-round,aqua.s,moon.s,fluorite.s,moon.s,amethyst.s,moon.s,silver-star,rose.s,moon.s,clear.s,moon.s" },
      { id: "sea-breeze", name: "Sea Breeze", tagline: "8mm aquamarine. Cool, and easy to forget.", style: "delicate", wrist: 14, spec: "aqua.s,fluorite.s,aqua.s,amethyst.s,aqua.s,silver-star,moon.s,aqua.s,rose.s,aqua.s,clear.s,silver-round,aqua.s,fluorite.s,aqua.s,amethyst.s,moon-charm" },
      { id: "soft-weight", name: "Soft Weight", tagline: "10mm rose quartz, for when 8mm is not quite enough.", style: "uniform", wrist: 14, spec: "rose.l,clear.l,rose.l,aqua.l,silver-round,rose.l,fluorite.l,rose.l,amethyst.l,silver-star,rose.l,moon.l,rose.l,star-charm" },
      { id: "two-tone", name: "Two Tone", tagline: "Amethyst falling away to nothing.", style: "graduated", wrist: 14, spec: "amethyst.x,amethyst.l,moon.l,amethyst.l,silver-star,rose.l,amethyst.l,clear.l,amethyst.l,silver-round,aqua.l,amethyst.l,moon.s,moon-charm" },
    ],
  },
  {
    id: "forge", en: "FORGE", theme: "STRENGTH & GUARD", audience: "men",
    accent: "#b8923f", banner: "/banners/forge.jpg", swatch: "obsidian",
    tagline: "Obsidian, hematite and pixiu spacers. Solid, quiet, unexplained.",
    craft: "An obsidian focal, fine hematite, all-20mm lava, and a tiger eye gradient.",
    tone: POWER_TONE,
    products: [
      { id: "polar-night", name: "Polar Night", tagline: "20mm obsidian focal. All black, no softening.", style: "focal", wrist: 14, spec: "obsidian.x,obsidian.l,hematite.l,silver-hex,obsidian.l,tiger-eye.l,obsidian.l,goldstone.l,gold-hex,obsidian.l,lava.l,obsidian.l,travel-compass" },
      { id: "minimal-black", name: "Minimal Black", tagline: "8mm hematite. The quietest way to wear it.", style: "delicate", wrist: 14, spec: "hematite.s,tiger-eye.s,hematite.s,goldstone.s,hematite.s,gold-hex,lava.s,hematite.s,smoky.s,hematite.s,obsidian.s,gold-pixiu,hematite.s,tiger-eye.s,hematite.s,goldstone.s,key" },
      { id: "lava-warrior", name: "Lava Warrior", tagline: "All 20mm matte lava. Heat under the surface.", style: "chunky", wrist: 14, spec: "lava.x,smoky.x,gold-pixiu,lava.x,obsidian.x,lava.x,silver-tiger-spacer,hematite.x" },
      { id: "tiger-market", name: "Tiger Market", tagline: "Tiger eye narrowing down, for reading the room.", style: "graduated", wrist: 14, spec: "tiger-eye.x,tiger-eye.l,goldstone.l,tiger-eye.l,silver-tiger-spacer,lava.l,tiger-eye.l,smoky.l,tiger-eye.l,silver-hex,obsidian.l,tiger-eye.l,goldstone.s,compass" },
    ],
  },
  {
    id: "bedrock", en: "BEDROCK", theme: "WEIGHT & ANCHOR", audience: "men",
    accent: "#5f6b70", banner: "/banners/bedrock.jpg", swatch: "hematite",
    tagline: "Built on 20mm stone. The weight is the point.",
    craft: "All-20mm hematite, 10mm smoky quartz, a labradorite focal, and a lava gradient.",
    tone: POWER_TONE,
    products: [
      { id: "true-bedrock", name: "True Bedrock", tagline: "All 20mm hematite. Pure weight.", style: "chunky", wrist: 14, spec: "hematite.x,obsidian.x,silver-cube,hematite.x,smoky.x,hematite.x,silver-rivet,lava.x" },
      { id: "bedrock-daily", name: "Bedrock Daily", tagline: "10mm smoky quartz. Bedrock, for a working week.", style: "uniform", wrist: 14, spec: "smoky.l,lava.l,smoky.l,tourmaline.l,silver-rivet,smoky.l,labradorite.l,smoky.l,hematite.l,silver-groove,smoky.l,obsidian.l,smoky.l,cross" },
      { id: "glint-in-stone", name: "Glint", tagline: "20mm labradorite focal — the one flash of light.", style: "focal", wrist: 14, spec: "labradorite.x,labradorite.l,hematite.l,silver-groove,labradorite.l,obsidian.l,labradorite.l,smoky.l,silver-shield,labradorite.l,lava.l,labradorite.l,travel-compass" },
      { id: "strata", name: "Strata", tagline: "Lava stepping down, like layers in a cliff face.", style: "graduated", wrist: 14, spec: "lava.x,lava.l,tourmaline.l,lava.l,silver-shield,labradorite.l,lava.l,hematite.l,lava.l,silver-cube,obsidian.l,lava.l,tourmaline.s,arrow" },
    ],
  },
  {
    id: "velocity", en: "VELOCITY", theme: "FOCUS & MOTION", audience: "men",
    accent: "#2f6f7a", banner: "/banners/velocity.jpg", swatch: "lapis",
    tagline: "Light, fine, quick. Made for long hours of focus.",
    craft: "Fine lapis, a hematite focal, 10mm clear quartz, and a sunstone gradient.",
    tone: POWER_TONE,
    products: [
      { id: "fine-line", name: "Fine Line", tagline: "8mm lapis. It will not move when you run.", style: "delicate", wrist: 14, spec: "lapis.s,clear.s,lapis.s,tiger-eye.s,lapis.s,silver-groove,smoky.s,lapis.s,hematite.s,lapis.s,sunstone.s,lapis.s,silver-chain,clear.s,lapis.s,tiger-eye.s,lapis.s" },
      { id: "core-focus", name: "Core Focus", tagline: "20mm hematite focal. One thing at a time.", style: "focal", wrist: 14, spec: "hematite.x,hematite.l,sunstone.l,silver-chain,hematite.l,lapis.l,hematite.l,clear.l,silver-hex,hematite.l,tiger-eye.l,hematite.l,arrow" },
      { id: "deep-tempo", name: "Deep Tempo", tagline: "Even 10mm clear quartz. A steady beat.", style: "uniform", wrist: 14, spec: "clear.l,tiger-eye.l,clear.l,smoky.l,silver-hex,clear.l,hematite.l,clear.l,sunstone.l,silver-groove,clear.l,lapis.l,clear.l,star-charm" },
      { id: "accel-gradient", name: "Acceleration", tagline: "Sunstone building as it goes.", style: "graduated", wrist: 14, spec: "sunstone.x,sunstone.l,lapis.l,sunstone.l,silver-groove,clear.l,sunstone.l,tiger-eye.l,sunstone.l,silver-chain,smoky.l,sunstone.l,lapis.s,key" },
    ],
  },
]

export const bySeries = Object.fromEntries(SERIES.map((s) => [s.id, s])) as Record<string, Series>;
export function findProduct(seriesId: string, productId: string) {
  return bySeries[seriesId]?.products.find((p) => p.id === productId) ?? null;
}
