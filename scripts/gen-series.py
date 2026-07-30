#!/usr/bin/env python3
"""Emit app/series.ts.

Specs are computed from a construction style + palette rather than typed by
hand, so every one of the 96 products is guaranteed to fit its wrist and clear
the studio's 80% fill gate by construction.
"""

BEAD = {"x": 20, "l": 10, "s": 8}
# 14 cm is the most common wrist here, so it is both the studio default and
# the size every ready-to-wear product is configured for.
DEFAULT_WRIST = 14
SPACER_MM, CHARM_MM = 5, 3


def fit(cap, unit, fixed, target=0.93):
    """How many `unit`-mm beads fit alongside `fixed` mm of hardware."""
    n = int((cap * target - fixed) // unit)
    while n > 1 and fixed + n * unit > cap:
        n -= 1
    while fixed + (n + 1) * unit <= cap and (fixed + n * unit) / cap < 0.85:
        n += 1
    return max(n, 1)


def weave(pal, n):
    """Hero stone every other bead, accents rotating behind it."""
    out = []
    accents = pal[1:] or pal
    for i in range(n):
        out.append(pal[0] if i % 2 == 0 else accents[(i // 2) % len(accents)])
    return out


def assemble(beads, spacers, charm):
    """Drop spacers at even intervals through the strand, charm at the end."""
    toks = list(beads)
    if spacers:
        for k, sp in enumerate(spacers):
            pos = round(len(toks) * (k + 1) / (len(spacers) + 1)) + k
            toks.insert(min(pos, len(toks)), sp)
    if charm:
        toks.append(charm)
    return ",".join(toks)


def measure(toks, spacers, charm):
    mm = 0
    for t in toks:
        if t in spacers:
            mm += SPACER_MM
        elif charm and t == charm:
            mm += CHARM_MM
        else:
            mm += BEAD[t.split(".")[1]] if "." in t else 10
    return mm


def build(style, wrist, pal, spacers, charm):
    cap = wrist * 10
    ns = len(spacers)
    fixed_hw = ns * SPACER_MM + (CHARM_MM if charm else 0)
    if style == "focal":
        n = fit(cap, 10, fixed_hw + 20)
        beads = [f"{pal[0]}.x"] + [f"{s}.l" for s in weave(pal, n)]
    elif style == "duo":
        n = fit(cap, 10, fixed_hw + 40)
        mid = n // 2
        rest = [f"{s}.l" for s in weave(pal, n)]
        beads = [f"{pal[0]}.x"] + rest[:mid] + [f"{pal[1]}.x"] + rest[mid:]
    elif style == "uniform":
        n = fit(cap, 10, fixed_hw)
        beads = [f"{s}.l" for s in weave(pal, n)]
    elif style == "delicate":
        n = fit(cap, 8, fixed_hw)
        beads = [f"{s}.s" for s in weave(pal, n)]
    elif style == "chunky":
        n = fit(cap, 20, fixed_hw, target=0.95)
        beads = [f"{s}.x" for s in weave(pal, n)]
    elif style == "graduated":
        big = fit(cap, 10, fixed_hw + 20, target=0.55)
        small = fit(cap, 8, fixed_hw + 20 + big * 10)
        beads = [f"{pal[0]}.x"] + [f"{s}.l" for s in weave(pal, big)] + [f"{s}.s" for s in weave(pal[1:] or pal, small)]
    else:
        raise ValueError(style)
    spec = assemble(beads, spacers, charm)
    # A build packed past ~94% leaves no room to add anything in 微客制, which
    # is the whole point of the button. Dropping the charm (3mm) buys that
    # headroom back without changing the stone composition.
    if charm and measure(spec.split(","), spacers, charm) / cap > 0.94:
        spec = assemble(beads, spacers, None)
    return spec


# ── series definitions ────────────────────────────────────────────────────
# (style, wrist, spacer-count-index, charm, name, tagline)
S = []

def series(sid, en, theme, audience, tagline, craft, accent, banner, swatch, tone, pal, sps, charms, rows):
    prods = []
    for i, (style, _row_wrist, nsp, charm_i, pid, name, tag) in enumerate(rows):
        wrist = DEFAULT_WRIST
        spacers = [sps[(i + k) % len(sps)] for k in range(nsp)]
        charm = charms[charm_i] if charm_i is not None else None
        prods.append((pid, name, tag, style, wrist, build(style, wrist, pal, spacers, charm)))
    S.append(dict(id=sid, en=en, theme=theme, audience=audience,
                  tagline=tagline, craft=craft, accent=accent, banner=banner, swatch=swatch,
                  tone=tone, products=prods))


series("bloom", "BLOOM", "LOVE & RELATING", "women",
       "Rose quartz and rhodonite. For anyone willing to be gentle with herself first.",
       "Pink focal stones at the centre — 8mm fine through 20mm bold.", "#c9738e", "/banners/bloom.jpg", "rose", "ENERGY_TONE",
       ["rose", "rhodonite", "moon", "clear", "garnet", "aqua"],
       ["silver-round", "gold-rondelle", "gold-knot", "silver-flower"],
       ["heart", "lock", "butterfly", "lotus", "clover"],
       [("focal", 15.5, 2, 0, "first-love", "First Confession", "Rose quartz focal. The very beginning of wanting someone."),
        ("uniform", 16, 2, None, "daily-pink", "Everyday Rose", "Even 10mm pink. Made to be worn without thinking."),
        ("delicate", 16, 3, 2, "soft-secret", "Soft Secret", "8mm fine strand. A whisper under a shirt cuff."),
        ("focal", 16, 2, 1, "rose-vow", "Rose Vow", "Rhodonite holds the promise you said out loud."),
        ("duo", 16.5, 2, 0, "twin-hearts", "Twin Hearts", "Two focal stones, evenly matched."),
        ("uniform", 16, 2, 3, "gentle-guard", "Gentle Guard", "Moonstone and rose quartz, quietly nearby."),
        ("graduated", 16.5, 2, 2, "fading-words", "Fading Words", "Large to small, like a sentence finished slowly."),
        ("delicate", 15.5, 2, None, "light-kiss", "Light Kiss", "The finest of them. Reads like a collarbone chain."),
        ("focal", 16, 2, 0, "heartbeat", "Heartbeat", "Garnet's heat. Impossible to hide."),
        ("chunky", 17, 2, 4, "full-bloom", "Full Bloom", "All 20mm. It speaks before you do."),
        ("uniform", 16.5, 2, 1, "kindred", "Kindred", "Aquamarine keeps the conversation clear."),
        ("duo", 17, 2, 1, "eternal-vow", "Eternal Vow", "Two focal stones, set for the long way round.")])

series("serene", "SERENE", "HEALING & BREATH", "women",
       "Aquamarine, clear quartz and fluorite. For the days you only want to breathe.",
       "Mostly 10mm, with fine strands and graduated pieces.", "#3f9aab", "/banners/serene.jpg", "aqua", "ENERGY_TONE",
       ["aqua", "clear", "fluorite", "moon", "moss", "amethyst"],
       ["silver-round", "silver-star", "silver-flower"],
       ["shell", "angel-wing", "moon-charm", "star-charm", "leaf"],
       [("uniform", 16, 2, 0, "deep-breath", "Deep Breath", "Aquamarine, loosening you the way the sea does."),
        ("delicate", 15.5, 3, None, "morning-clarity", "Morning Clarity", "Fine clear quartz. The first air of the day."),
        ("uniform", 16, 2, 1, "still-mind", "Still Mind", "Amethyst settles. Wear it before sleep."),
        ("focal", 16, 2, 4, "forest-breath", "Forest Breath", "Moss agate. Back to your own tempo."),
        ("delicate", 16, 3, 3, "dewlight", "Dewlight", "8mm fluorite. Translucent, never loud."),
        ("uniform", 16.5, 2, 2, "moon-healing", "Moon Healing", "Moonstone lights every fresh start."),
        ("graduated", 16.5, 2, 1, "breath-gradient", "Breath Gradient", "Tapering from the focal stone, like an exhale."),
        ("focal", 16, 2, 3, "pure-halo", "Pure Halo", "Clear quartz and moonstone in soft layers."),
        ("delicate", 15.5, 2, None, "soft-restart", "Soft Restart", "Put it down, begin again. The lightest one here."),
        ("uniform", 16, 2, 0, "blue-wisdom", "Blue Wisdom", "Lapis calm. Says the thing plainly."),
        ("chunky", 17, 2, 0, "deep-pool", "Deep Pool", "Large aquamarine. Quiet, and impossible to miss."),
        ("duo", 17, 2, 3, "serene-manifesto", "Serene Manifesto", "Two focal stones. The fullest piece in the series.")])

series("aurora", "AURORA", "PROTECTION & INTUITION", "women",
       "Labradorite and amethyst, dark and shifting. Turns away what isn't yours.",
       "Dark flash. Focal and bold pieces in equal measure.", "#6b5bb0", "/banners/aurora.jpg", "labradorite", "ENERGY_TONE",
       ["labradorite", "amethyst", "tourmaline", "moon", "lapis", "obsidian"],
       ["silver-hex", "silver-round", "silver-cube"],
       ["evil-eye", "hamsa", "cross", "angel-wing", "moon-charm"],
       [("focal", 16, 2, 0, "aurora-guard", "Aurora Guard", "Labradorite flash. Understated and immovable."),
        ("uniform", 16, 2, 1, "violet-ward", "Violet Ward", "Amethyst with black tourmaline. Two lines drawn."),
        ("chunky", 17, 2, 2, "night-shield", "Night Shield", "All 20mm obsidian. The hardest wall we make."),
        ("uniform", 16, 2, 2, "quiet-boundary", "Quiet Boundary", "Tourmaline and smoky quartz, holding the edge."),
        ("focal", 16, 2, 4, "moon-watch", "Moon Watch", "Moonstone over labradorite, layered like dusk."),
        ("graduated", 16.5, 2, 3, "flowing-gradient", "Flowing Gradient", "Deep to pale, the way an aurora opens."),
        ("delicate", 16, 3, None, "stardust", "Stardust", "8mm fine strand. Worn like an amulet."),
        ("focal", 16.5, 2, 0, "flowing-insight", "Flowing Insight", "Labradorite with lapis. Sharpens the instinct."),
        ("duo", 17, 2, 1, "twin-ward", "Twin Ward", "Two focal stones facing out, and in."),
        ("uniform", 16, 2, 3, "violet-barrier", "Violet Barrier", "Amethyst at 20mm. Nothing gets through casually."),
        ("chunky", 16.5, 2, None, "bedrock-heart", "Obsidian Heart", "Black at the centre, light all around it."),
        ("focal", 17, 2, 1, "aurora-manifesto", "Aurora Manifesto", "The series, said in full.")])

series("abundance", "ABUNDANCE", "ABUNDANCE & FLOW", "women",
       "Citrine, tiger eye and goldstone. No need to be coy about what you want.",
       "Gold tones, leaning bold and twin-focal.", "#c8912f", "/banners/abundance.jpg", "citrine", "ENERGY_TONE",
       ["citrine", "tiger", "goldstone", "sunstone", "clear", "rose"],
       ["gold-crown", "gold-rondelle", "gold-knot", "gold-pixiu"],
       ["sun-charm", "key", "clover", "compass"],
       [("chunky", 17, 2, 0, "golden-fortune", "Golden Fortune", "All 20mm citrine. Not being coy about it."),
        ("uniform", 16, 2, 2, "daily-abundance", "Daily Abundance", "Even 10mm gold tones, for ordinary days."),
        ("focal", 16, 2, 1, "tiger-decision", "Tiger's Call", "Tiger eye, for the decision you keep postponing."),
        ("duo", 16.5, 2, 3, "goldstone-night", "Goldstone Night", "Gold flecks across midnight blue."),
        ("delicate", 16, 3, None, "fine-gold", "Fine Gold", "8mm. Wealth, worn lightly."),
        ("uniform", 16, 2, 0, "warm-harvest", "Warm Harvest", "Sunstone and citrine. What you already gathered."),
        ("graduated", 16.5, 2, 2, "rising-road", "Rising Road", "Graduated, like a road going up."),
        ("focal", 16, 2, 1, "crowned", "Crowned", "A gold crown spacer, clearing the stage."),
        ("chunky", 16.5, 2, None, "cash-flow", "Cash Flow", "Movement, not hoarding."),
        ("focal", 16.5, 2, 3, "pixiu-keeper", "Pixiu Keeper", "The wealth beast, standing guard."),
        ("uniform", 16, 2, 1, "clear-chance", "Clear Chance", "Clear quartz opens the way."),
        ("duo", 17, 2, 0, "abundance-manifesto", "Abundance Manifesto", "Two focal stones. The whole argument.")])

series("whisper", "WHISPER", "EVERYDAY LAYERS", "women",
       "Fine 8mm strands. Light enough to forget, and always still there.",
       "Almost entirely 8mm. The lightest, least insistent line.", "#a88b7a", "/banners/whisper.jpg", "moon", "ENERGY_TONE",
       ["moon", "rose", "clear", "aqua", "fluorite", "amethyst"],
       ["silver-round", "silver-star"],
       ["star-charm", "moon-charm"],
       [("delicate", 16, 2, None, "plain-days", "Plain Days", "8mm moonstone. The most ordinary one, on purpose."),
        ("delicate", 15.5, 2, None, "morning-murmur", "Morning Murmur", "First thing, barely there."),
        ("delicate", 16, 3, None, "pure-thread", "Pure Thread", "Clear quartz, fine as a thread."),
        ("delicate", 16, 2, 0, "sea-breeze", "Sea Breeze", "Aquamarine at 8mm. Cool and easy."),
        ("delicate", 15.5, 2, None, "violet-hush", "Violet Hush", "Amethyst, turned all the way down."),
        ("delicate", 16, 2, 1, "fluor-thread", "Fluorite Thread", "Green translucence, almost weightless."),
        ("delicate", 16.5, 3, None, "two-tone", "Two Tone", "Two stones alternating, nothing more."),
        ("delicate", 16, 2, None, "stack-base", "Stack Base", "Built to sit under everything else."),
        ("uniform", 16, 2, 0, "soft-weight", "Soft Weight", "10mm, for when 8mm isn't quite enough."),
        ("delicate", 16.5, 2, None, "gentle-space", "Gentle Space", "Spacers doing most of the talking."),
        ("uniform", 16, 2, 1, "quiet-murmur", "Quiet Murmur", "You'll forget it's on. It still is."),
        ("delicate", 17, 3, None, "whisper-manifesto", "Whisper Manifesto", "The lightest statement in the house.")])

series("forge", "FORGE", "STRENGTH & GUARD", "men",
       "Obsidian, hematite and pixiu spacers. Solid, quiet, unexplained.",
       "Black and silver. Focal through bold.", "#b8923f", "/banners/forge.jpg", "obsidian", "POWER_TONE",
       ["obsidian", "hematite", "tiger-eye", "goldstone", "lava", "smoky"],
       ["silver-hex", "gold-hex", "gold-pixiu", "silver-tiger-spacer"],
       ["travel-compass", "compass", "arrow", "key"],
       [("focal", 16, 2, 0, "polar-night", "Polar Night", "Obsidian and hematite. All black, no softening."),
        ("duo", 16.5, 2, 1, "decisive-investor", "The Decisive", "Tiger eye and goldstone. For calling it."),
        ("chunky", 17, 2, 2, "heavy-bedrock", "Heavy Ground", "20mm hematite. Weight you can feel."),
        ("uniform", 16, 2, 2, "iron-will", "Iron Will", "Hematite throughout. Nothing decorative."),
        ("focal", 16.5, 2, 1, "pixiu-fortune", "Pixiu Fortune", "Gold pixiu against black stone."),
        ("focal", 16, 2, 1, "tiger-market", "Tiger Market", "Tiger eye, for reading the room."),
        ("uniform", 17, 2, 2, "lava-warrior", "Lava Warrior", "Matte volcanic rock. Heat under the surface."),
        ("uniform", 16, 2, 3, "steady-control", "Steady Hand", "Smoky quartz. Holds the line."),
        ("duo", 16.5, 2, 1, "black-gold", "Black Gold", "Obsidian with gold hardware."),
        ("focal", 16, 2, 0, "dawn-expedition", "Dawn Expedition", "Lapis and labradorite. Built to travel."),
        ("delicate", 16, 3, None, "minimal-black", "Minimal Black", "8mm. The quietest way to wear it."),
        ("chunky", 17, 2, 2, "forge-manifesto", "Forge Manifesto", "Two focal stones. The series, stated.")])

series("bedrock", "BEDROCK", "WEIGHT & ANCHOR", "men",
       "Built on 20mm stone. The weight is the point.",
       "Mostly 20mm. Weight above everything.", "#5f6b70", "/banners/bedrock.jpg", "hematite", "POWER_TONE",
       ["hematite", "obsidian", "smoky", "lava", "tourmaline", "labradorite"],
       ["silver-cube", "silver-rivet", "silver-groove", "silver-shield"],
       ["arrow", "cross", "travel-compass"],
       [("chunky", 17, 2, None, "true-bedrock", "True Bedrock", "All 20mm hematite. Pure weight."),
        ("chunky", 16.5, 2, 0, "obsidian-rock", "Obsidian Rock", "Black, at full scale."),
        ("chunky", 17, 2, None, "sunken-heart", "Sunken Core", "Smoky quartz at the centre, dark around it."),
        ("chunky", 16.5, 2, 2, "lava-block", "Lava Block", "Matte and heavy. No shine at all."),
        ("chunky", 17, 2, 1, "iron-wall", "Iron Wall", "Hematite, shoulder to shoulder."),
        ("duo", 16.5, 2, 0, "twin-rock", "Twin Rock", "Two focal stones. Both of them large."),
        ("graduated", 17, 2, 2, "strata", "Strata", "Graduated, like layers in a cliff face."),
        ("uniform", 16, 2, 1, "bedrock-daily", "Bedrock Daily", "10mm. Bedrock, for a working week."),
        ("chunky", 17, 2, 0, "polar-bedrock", "Polar Bedrock", "Tourmaline and hematite. Coldest of the line."),
        ("focal", 16, 2, 2, "glint-in-stone", "Glint", "Labradorite — the one flash of light."),
        ("chunky", 16.5, 2, None, "rivet-heavy", "Rivet", "Silver rivets between 20mm stone."),
        ("chunky", 17, 2, 1, "bedrock-manifesto", "Bedrock Manifesto", "The heaviest thing we will make you.")])

series("velocity", "VELOCITY", "FOCUS & MOTION", "men",
       "Light, fine, quick. Made for long hours of focus.",
       "Mostly 8mm and 10mm, chasing lightness.", "#2f6f7a", "/banners/velocity.jpg", "lapis", "POWER_TONE",
       ["lapis", "clear", "tiger-eye", "smoky", "hematite", "sunstone"],
       ["silver-groove", "silver-chain", "silver-hex"],
       ["arrow", "key", "star-charm"],
       [("delicate", 16, 2, None, "fine-line", "Fine Line", "8mm lapis. Won't move when you run."),
        ("uniform", 16, 2, None, "blue-steel", "Blue Steel", "Lapis and hematite. Cool and quick."),
        ("delicate", 15.5, 3, None, "clear-view", "Clear View", "Clear quartz. Nothing in the way."),
        ("uniform", 16, 2, 0, "sharp-call", "Sharp Call", "Tiger eye, for the fast decision."),
        ("delicate", 16, 2, None, "silent-focus", "Silent Focus", "Smoky quartz. Hours of it."),
        ("uniform", 16.5, 2, 1, "deep-tempo", "Deep Tempo", "Lapis at 10mm. A steady beat."),
        ("graduated", 16.5, 2, 2, "accel-gradient", "Acceleration", "Graduated, building as it goes."),
        ("delicate", 16, 3, None, "chain-minimal", "Chain Minimal", "Silver links, 8mm stone."),
        ("focal", 16, 2, 0, "solar-sprint", "Solar Sprint", "Sunstone. Heat for the last kilometre."),
        ("delicate", 16.5, 2, None, "light-rig", "Light Rig", "The lightest in the men's line."),
        ("uniform", 16, 2, None, "core-focus", "Core Focus", "Lapis focal. One thing at a time."),
        ("focal", 17, 2, 1, "velocity-manifesto", "Velocity Manifesto", "The series, at speed.")])


STYLE_LABEL = {"focal": "Focal", "duo": "Twin", "uniform": "10mm",
               "delicate": "8mm", "chunky": "20mm", "graduated": "Grad"}

head = '''// Ready-to-wear collections. Each series has its own banner, theme and
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
'''

body = []
for s in S:
    body.append("  {")
    body.append(f'    id: "{s["id"]}", en: "{s["en"]}", theme: "{s["theme"]}", audience: "{s["audience"]}",')
    body.append(f'    accent: "{s["accent"]}", banner: "{s["banner"]}", swatch: "{s["swatch"]}",')
    body.append(f'    tagline: "{s["tagline"]}",')
    body.append(f'    craft: "{s["craft"]}",')
    body.append(f'    tone: {s["tone"]},')
    body.append("    products: [")
    for pid, name, tag, style, wrist, spec in s["products"]:
        w = int(wrist) if float(wrist).is_integer() else wrist
        body.append(f'      {{ id: "{pid}", name: "{name}", tagline: "{tag}", style: "{style}", wrist: {w}, spec: "{spec}" }},')
    body.append("    ],")
    body.append("  },")

tail = ''']

export const bySeries = Object.fromEntries(SERIES.map((s) => [s.id, s])) as Record<string, Series>;
export function findProduct(seriesId: string, productId: string) {
  return bySeries[seriesId]?.products.find((p) => p.id === productId) ?? null;
}
'''

open("/home/user/crystal/app/series.ts", "w").write(head + "\n".join(body) + "\n" + tail)
print(f"wrote {len(S)} series, {sum(len(x['products']) for x in S)} products")
for s in S:
    styles = {}
    for _, _, _, st, _, _ in s["products"]:
        styles[STYLE_LABEL[st]] = styles.get(STYLE_LABEL[st], 0) + 1
    print(f"  {s['en']:10s} {s['audience']:5s} " + " ".join(f"{k}×{v}" for k, v in sorted(styles.items())))
