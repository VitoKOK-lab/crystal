#!/usr/bin/env python3
"""Emit app/series.ts.

Specs are computed from a construction style + palette rather than typed by
hand, so every one of the 32 products is guaranteed to fit its wrist and clear
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


def build(style, wrist, pal, spacers, charm, rot=0):
    # Rotating the palette moves a different stone into the hero slot, which is
    # what actually makes four pieces in one collection look unalike — without it
    # every build leads with pal[0] and the whole grid reads as one recolour.
    pal = pal[rot:] + pal[:rot]
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
# (style, palette-rotation, spacer-count, charm-index, id, name, tagline)
S = []

def series(sid, en, theme, audience, tagline, craft, accent, banner, swatch, tone, pal, sps, charms, rows):
    prods = []
    for i, (style, rot, nsp, charm_i, pid, name, tag) in enumerate(rows):
        wrist = DEFAULT_WRIST
        spacers = [sps[(i + k) % len(sps)] for k in range(nsp)]
        charm = charms[charm_i] if charm_i is not None else None
        prods.append((pid, name, tag, style, wrist, build(style, wrist, pal, spacers, charm, rot)))
    S.append(dict(id=sid, en=en, theme=theme, audience=audience,
                  tagline=tagline, craft=craft, accent=accent, banner=banner, swatch=swatch,
                  tone=tone, products=prods))


series("bloom", "BLOOM", "LOVE & RELATING", "women",
       "Rose quartz and rhodonite. For anyone willing to be gentle with herself first.",
       "A 20mm rose focal, a fine moonstone strand, all-20mm rhodonite, and a graduated fade.", "#c9738e", "/banners/bloom.jpg", "rose", "ENERGY_TONE",
       ["rose", "rhodonite", "moon", "clear", "garnet", "aqua"],
       ["silver-round", "gold-rondelle", "gold-knot", "silver-flower"],
       ["heart", "lock", "butterfly", "lotus", "clover"],
       [("focal", 0, 2, 0, "first-love", "First Confession", "20mm rose quartz focal. The very beginning of wanting someone."),
        ("delicate", 2, 3, 2, "soft-secret", "Soft Secret", "8mm moonstone, pale and fine. A whisper under a shirt cuff."),
        ("chunky", 1, 2, 4, "full-bloom", "Full Bloom", "All 20mm rhodonite. Deep pink, and it speaks before you do."),
        ("graduated", 3, 2, 3, "fading-words", "Fading Words", "Clear quartz tapering small, pink surfacing through it.")])

series("serene", "SERENE", "HEALING & BREATH", "women",
       "Aquamarine, clear quartz and fluorite. For the days you only want to breathe.",
       "Even 10mm aquamarine, fine clear quartz, bold amethyst, and a fluorite gradient.", "#3f9aab", "/banners/serene.jpg", "aqua", "ENERGY_TONE",
       ["aqua", "clear", "fluorite", "moon", "moss", "amethyst"],
       ["silver-round", "silver-star", "silver-flower"],
       ["shell", "angel-wing", "moon-charm", "star-charm", "leaf"],
       [("uniform", 0, 2, 0, "deep-breath", "Deep Breath", "Even 10mm aquamarine, loosening you the way the sea does."),
        ("delicate", 1, 3, 2, "morning-clarity", "Morning Clarity", "8mm clear quartz. The first air of the day."),
        ("chunky", 5, 2, 1, "deep-pool", "Deep Pool", "All 20mm amethyst. Quiet, and impossible to miss."),
        ("graduated", 2, 2, 4, "breath-gradient", "Breath Gradient", "Fluorite thinning out, like a long exhale.")])

series("aurora", "AURORA", "PROTECTION & INTUITION", "women",
       "Labradorite and amethyst, dark and shifting. Turns away what isn't yours.",
       "A labradorite focal, fine moonstone, all-20mm obsidian, and a lapis gradient.", "#6b5bb0", "/banners/aurora.jpg", "labradorite", "ENERGY_TONE",
       ["labradorite", "amethyst", "tourmaline", "moon", "lapis", "obsidian"],
       ["silver-hex", "silver-round", "silver-cube"],
       ["evil-eye", "hamsa", "cross", "angel-wing", "moon-charm"],
       [("focal", 0, 2, 0, "aurora-guard", "Aurora Guard", "20mm labradorite focal. Understated, and immovable."),
        ("delicate", 3, 3, 4, "stardust", "Stardust", "8mm moonstone. Worn close, like an amulet."),
        ("chunky", 5, 2, 2, "night-shield", "Night Shield", "All 20mm obsidian. The hardest wall we make."),
        ("graduated", 4, 2, 1, "flowing-gradient", "Flowing Gradient", "Lapis deepening to fine, the way an aurora opens.")])

series("abundance", "ABUNDANCE", "ABUNDANCE & FLOW", "women",
       "Citrine, tiger eye and goldstone. No need to be coy about what you want.",
       "All-20mm citrine, fine clear quartz on gold, a tiger eye focal, and a goldstone gradient.", "#c8912f", "/banners/abundance.jpg", "citrine", "ENERGY_TONE",
       ["citrine", "tiger", "goldstone", "sunstone", "clear", "rose"],
       ["gold-crown", "gold-rondelle", "gold-knot", "gold-pixiu"],
       ["sun-charm", "key", "clover", "compass"],
       [("chunky", 0, 2, 0, "golden-fortune", "Golden Fortune", "All 20mm citrine. Not being coy about it."),
        ("delicate", 4, 2, 3, "fine-gold", "Fine Gold", "8mm clear quartz on gold. Wealth, worn lightly."),
        ("focal", 1, 2, 1, "tiger-decision", "Tiger's Call", "20mm tiger eye focal, for the decision you keep postponing."),
        ("graduated", 2, 2, 2, "rising-road", "Rising Road", "Goldstone stepping down. Midnight blue, flecked gold.")])

series("whisper", "WHISPER", "EVERYDAY LAYERS", "women",
       "Fine 8mm strands. Light enough to forget, and always still there.",
       "Fine moonstone, fine aquamarine, 10mm rose quartz, and an amethyst fade. Nothing heavier.", "#a88b7a", "/banners/whisper.jpg", "moon", "ENERGY_TONE",
       ["moon", "rose", "clear", "aqua", "fluorite", "amethyst"],
       ["silver-round", "silver-star"],
       ["star-charm", "moon-charm"],
       [("delicate", 0, 2, None, "plain-days", "Plain Days", "8mm moonstone. The most ordinary one, on purpose."),
        ("delicate", 3, 2, 1, "sea-breeze", "Sea Breeze", "8mm aquamarine. Cool, and easy to forget."),
        ("uniform", 1, 2, 0, "soft-weight", "Soft Weight", "10mm rose quartz, for when 8mm is not quite enough."),
        ("graduated", 5, 2, 1, "two-tone", "Two Tone", "Amethyst falling away to nothing.")])

series("forge", "FORGE", "STRENGTH & GUARD", "men",
       "Obsidian, hematite and pixiu spacers. Solid, quiet, unexplained.",
       "An obsidian focal, fine hematite, all-20mm lava, and a tiger eye gradient.", "#b8923f", "/banners/forge.jpg", "obsidian", "POWER_TONE",
       ["obsidian", "hematite", "tiger-eye", "goldstone", "lava", "smoky"],
       ["silver-hex", "gold-hex", "gold-pixiu", "silver-tiger-spacer"],
       ["travel-compass", "compass", "arrow", "key"],
       [("focal", 0, 2, 0, "polar-night", "Polar Night", "20mm obsidian focal. All black, no softening."),
        ("delicate", 1, 2, 3, "minimal-black", "Minimal Black", "8mm hematite. The quietest way to wear it."),
        ("chunky", 4, 2, 2, "lava-warrior", "Lava Warrior", "All 20mm matte lava. Heat under the surface."),
        ("graduated", 2, 2, 1, "tiger-market", "Tiger Market", "Tiger eye narrowing down, for reading the room.")])

series("bedrock", "BEDROCK", "WEIGHT & ANCHOR", "men",
       "Built on 20mm stone. The weight is the point.",
       "All-20mm hematite, 10mm smoky quartz, a labradorite focal, and a lava gradient.", "#5f6b70", "/banners/bedrock.jpg", "hematite", "POWER_TONE",
       ["hematite", "obsidian", "smoky", "lava", "tourmaline", "labradorite"],
       ["silver-cube", "silver-rivet", "silver-groove", "silver-shield"],
       ["arrow", "cross", "travel-compass"],
       [("chunky", 0, 2, None, "true-bedrock", "True Bedrock", "All 20mm hematite. Pure weight."),
        ("uniform", 2, 2, 1, "bedrock-daily", "Bedrock Daily", "10mm smoky quartz. Bedrock, for a working week."),
        ("focal", 5, 2, 2, "glint-in-stone", "Glint", "20mm labradorite focal — the one flash of light."),
        ("graduated", 3, 2, 0, "strata", "Strata", "Lava stepping down, like layers in a cliff face.")])

series("velocity", "VELOCITY", "FOCUS & MOTION", "men",
       "Light, fine, quick. Made for long hours of focus.",
       "Fine lapis, a hematite focal, 10mm clear quartz, and a sunstone gradient.", "#2f6f7a", "/banners/velocity.jpg", "lapis", "POWER_TONE",
       ["lapis", "clear", "tiger-eye", "smoky", "hematite", "sunstone"],
       ["silver-groove", "silver-chain", "silver-hex"],
       ["arrow", "key", "star-charm"],
       [("delicate", 0, 2, None, "fine-line", "Fine Line", "8mm lapis. It will not move when you run."),
        ("focal", 4, 2, 0, "core-focus", "Core Focus", "20mm hematite focal. One thing at a time."),
        ("uniform", 1, 2, 2, "deep-tempo", "Deep Tempo", "Even 10mm clear quartz. A steady beat."),
        ("graduated", 5, 2, 1, "accel-gradient", "Acceleration", "Sunstone building as it goes.")])


STYLE_LABEL = {"focal": "Focal", "duo": "Twin", "uniform": "10mm",
               "delicate": "8mm", "chunky": "20mm", "graduated": "Grad"}

head = '''// Ready-to-wear collections. Each series has its own banner, theme and
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
