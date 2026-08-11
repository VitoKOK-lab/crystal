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

def series(sid, zh, en, theme, audience, tagline, craft, accent, banner, swatch, tone, pal, sps, charms, rows):
    prods = []
    for i, (style, rot, nsp, charm_i, pid, name, tag) in enumerate(rows):
        wrist = DEFAULT_WRIST
        spacers = [sps[(i + k) % len(sps)] for k in range(nsp)]
        charm = charms[charm_i] if charm_i is not None else None
        prods.append((pid, name, tag, style, wrist, build(style, wrist, pal, spacers, charm, rot)))
    S.append(dict(id=sid, zh=zh, en=en, theme=theme, audience=audience,
                  tagline=tagline, craft=craft, accent=accent, banner=banner, swatch=swatch,
                  tone=tone, products=prods))


series("bloom", "綻放", "BLOOM", "愛與關係", "women",
       "粉晶與薔薇輝石。寫給願意先善待自己的人。",
       "20mm 粉晶主石、細繩月光石、全 20mm 薔薇輝石，與一條白水晶漸層。", "#c9738e", "/banners/bloom.jpg", "rose", "ENERGY_TONE",
       ["rose", "rhodonite", "moon", "clear", "garnet", "aqua"],
       ["silver-round", "gold-rondelle", "gold-knot", "silver-flower"],
       ["heart", "lock", "butterfly", "lotus", "clover"],
       [("focal", 0, 2, 0, "first-love", "初戀告白", "20mm 粉水晶主石。心動剛剛開始。"),
        ("delicate", 2, 3, 2, "soft-secret", "細語心事", "8mm 月光石，淡而細。襯衫袖口下的低語。"),
        ("chunky", 1, 2, 4, "full-bloom", "盛放宣言", "全 20mm 薔薇輝石。深粉色，開口前就先說了話。"),
        ("graduated", 3, 2, 3, "fading-words", "漸層告白", "白水晶逐漸收細，粉色自其中浮現。")])

series("serene", "澄澈", "SERENE", "療癒與呼吸", "women",
       "海藍寶、白水晶與螢石。給只想好好呼吸的日子。",
       "10mm 海藍寶、細繩白水晶、全 20mm 紫水晶，與螢石漸層。", "#3f9aab", "/banners/serene.jpg", "aqua", "ENERGY_TONE",
       ["aqua", "clear", "fluorite", "moon", "moss", "amethyst"],
       ["silver-round", "silver-star", "silver-flower"],
       ["shell", "angel-wing", "moon-charm", "star-charm", "leaf"],
       [("uniform", 0, 2, 0, "deep-breath", "深海呼吸", "10mm 海藍寶。像海一樣把人鬆開。"),
        ("delicate", 1, 3, 2, "morning-clarity", "晨霧清明", "8mm 白水晶。清晨的第一口空氣。"),
        ("chunky", 5, 2, 1, "deep-pool", "深潭沉靜", "全 20mm 紫水晶。安靜，卻無法忽視。"),
        ("graduated", 2, 2, 4, "breath-gradient", "澄心漸層", "螢石逐漸收細，像一次長長的吐納。")])

series("aurora", "極光", "AURORA", "守護與直覺", "women",
       "拉長石與紫水晶的暗色流光。擋下不屬於你的雜訊。",
       "拉長石主石、細繩月光石、全 20mm 黑曜石，與青金石漸層。", "#6b5bb0", "/banners/aurora.jpg", "labradorite", "ENERGY_TONE",
       ["labradorite", "amethyst", "tourmaline", "moon", "lapis", "obsidian"],
       ["silver-hex", "silver-round", "silver-cube"],
       ["evil-eye", "hamsa", "cross", "angel-wing", "moon-charm"],
       [("focal", 0, 2, 0, "aurora-guard", "極光守護", "20mm 拉長石主石。低調，且不可撼動。"),
        ("delicate", 3, 3, 4, "stardust", "星塵細語", "8mm 月光石。貼身佩戴，如同護符。"),
        ("chunky", 5, 2, 2, "night-shield", "暗夜之盾", "全 20mm 黑曜石。最硬的一道牆。"),
        ("graduated", 4, 2, 1, "flowing-gradient", "流光漸層", "青金石由深轉細，像極光緩緩散開。")])

series("abundance", "豐盈", "ABUNDANCE", "豐盛與流動", "women",
       "黃水晶、虎眼石與金沙石。值得的，不必說得含蓄。",
       "全 20mm 黃水晶、金飾細繩白水晶、虎眼石主石，與金沙石漸層。", "#c8912f", "/banners/abundance.jpg", "citrine", "ENERGY_TONE",
       ["citrine", "tiger", "goldstone", "sunstone", "clear", "rose"],
       ["gold-crown", "gold-rondelle", "gold-knot", "gold-pixiu"],
       ["sun-charm", "key", "clover", "compass"],
       [("chunky", 0, 2, 0, "golden-fortune", "金石開運", "全 20mm 黃水晶。不必含蓄。"),
        ("delicate", 4, 2, 3, "fine-gold", "細金流年", "8mm 白水晶配金飾。豐盛，輕輕地戴。"),
        ("focal", 1, 2, 1, "tiger-decision", "虎眼決斷", "20mm 虎眼石主石。為那個一直拖延的決定。"),
        ("graduated", 2, 2, 2, "rising-road", "上行之路", "金沙石逐級收細。深藍夜色，散著金點。")])

series("whisper", "細語", "WHISPER", "日常疊戴", "women",
       "以 8mm 為主的細繩款。輕得會忘記，卻始終都在。",
       "細繩月光石、細繩海藍寶、10mm 粉晶，與紫水晶漸層。無一更重。", "#a88b7a", "/banners/whisper.jpg", "moon", "ENERGY_TONE",
       ["moon", "rose", "clear", "aqua", "fluorite", "amethyst"],
       ["silver-round", "silver-star"],
       ["star-charm", "moon-charm"],
       [("delicate", 0, 2, None, "plain-days", "素日細語", "8mm 月光石。刻意做成最平常的一條。"),
        ("delicate", 3, 2, 1, "sea-breeze", "海風輕拂", "8mm 海藍寶。清涼，容易忘記。"),
        ("uniform", 1, 2, 0, "soft-weight", "微重之感", "10mm 粉水晶。當 8mm 還差一點的時候。"),
        ("graduated", 5, 2, 1, "two-tone", "雙色淡出", "紫水晶一路淡去，直到消失。")])

series("forge", "曜石", "FORGE", "力量與守護", "men",
       "黑曜石、赤鐵礦與貔貅隔珠。扎實、安靜，無需解釋。",
       "黑曜石主石、細繩赤鐵礦、全 20mm 火山岩，與虎眼石漸層。", "#b8923f", "/banners/forge.jpg", "obsidian", "POWER_TONE",
       ["obsidian", "hematite", "tiger-eye", "goldstone", "lava", "smoky"],
       ["silver-hex", "gold-hex", "gold-pixiu", "silver-tiger-spacer"],
       ["travel-compass", "compass", "arrow", "key"],
       [("focal", 0, 2, 0, "polar-night", "極夜守護", "20mm 黑曜石主石。全黑，不作緩和。"),
        ("delicate", 1, 2, 3, "minimal-black", "極簡黑", "8mm 赤鐵礦。最安靜的戴法。"),
        ("chunky", 4, 2, 2, "lava-warrior", "熔岩戰士", "全 20mm 消光火山岩。表面之下有熱度。"),
        ("graduated", 2, 2, 1, "tiger-market", "虎視市場", "虎眼石逐漸收細。為了讀懂局勢。")])

series("bedrock", "磐岩", "BEDROCK", "沉穩與定錨", "men",
       "以 20mm 大顆為底。重量本身即是安定。",
       "全 20mm 赤鐵礦、10mm 茶晶、拉長石主石，與火山岩漸層。", "#5f6b70", "/banners/bedrock.jpg", "hematite", "POWER_TONE",
       ["hematite", "obsidian", "smoky", "lava", "tourmaline", "labradorite"],
       ["silver-cube", "silver-rivet", "silver-groove", "silver-shield"],
       ["arrow", "cross", "travel-compass"],
       [("chunky", 0, 2, None, "true-bedrock", "磐岩本色", "全 20mm 赤鐵礦。純粹的重量。"),
        ("uniform", 2, 2, 1, "bedrock-daily", "日常磐岩", "10mm 茶晶。磐岩，給一週的工作日。"),
        ("focal", 5, 2, 2, "glint-in-stone", "石中微光", "20mm 拉長石主石——唯一的一道光。"),
        ("graduated", 3, 2, 0, "strata", "岩層", "火山岩逐級收細，像崖壁上的層理。")])

series("velocity", "疾行", "VELOCITY", "專注與行動", "men",
       "輕、細、俐落。為長時間的專注而配。",
       "細繩青金石、赤鐵礦主石、10mm 白水晶，與太陽石漸層。", "#2f6f7a", "/banners/velocity.jpg", "lapis", "POWER_TONE",
       ["lapis", "clear", "tiger-eye", "smoky", "hematite", "sunstone"],
       ["silver-groove", "silver-chain", "silver-hex"],
       ["arrow", "key", "star-charm"],
       [("delicate", 0, 2, None, "fine-line", "疾行細線", "8mm 青金石。跑起來也不會晃。"),
        ("focal", 4, 2, 0, "core-focus", "核心專注", "20mm 赤鐵礦主石。一次只做一件事。"),
        ("uniform", 1, 2, 2, "deep-tempo", "沉穩節奏", "10mm 白水晶。穩定的節拍。"),
        ("graduated", 5, 2, 1, "accel-gradient", "加速漸層", "太陽石一路推進。")])


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
'''

body = []
for s in S:
    body.append("  {")
    body.append(f'    id: "{s["id"]}", zh: "{s["zh"]}", en: "{s["en"]}", theme: "{s["theme"]}", audience: "{s["audience"]}",')
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
    print(f"  {s['zh']:4s} {s['en']:10s} {s['audience']:5s} " + " ".join(f"{k}×{v}" for k, v in sorted(styles.items())))
