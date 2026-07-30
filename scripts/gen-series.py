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

def series(sid, zh, en, audience, theme, theme_en, tagline, craft, accent, banner, swatch, tone, pal, sps, charms, rows):
    prods = []
    for i, (style, _row_wrist, nsp, charm_i, pid, name, tag) in enumerate(rows):
        wrist = DEFAULT_WRIST
        spacers = [sps[(i + k) % len(sps)] for k in range(nsp)]
        charm = charms[charm_i] if charm_i is not None else None
        prods.append((pid, name, tag, style, wrist, build(style, wrist, pal, spacers, charm)))
    S.append(dict(id=sid, zh=zh, en=en, audience=audience, theme=theme, themeEn=theme_en,
                  tagline=tagline, craft=craft, accent=accent, banner=banner, swatch=swatch,
                  tone=tone, products=prods))


series("bloom", "綻放", "BLOOM", "women", "愛與關係", "LOVE & RELATING",
       "粉晶與薔薇輝石。寫給願意先對自己溫柔的人。",
       "粉調主石為核心，8mm 細繩到 20mm 大顆都有。", "#c9738e", "/banners/bloom.jpg", "rose", "ENERGY_TONE",
       ["rose", "rhodonite", "moon", "clear", "garnet", "aqua"],
       ["silver-round", "gold-rondelle", "gold-knot", "silver-flower"],
       ["heart", "lock", "butterfly", "lotus", "clover"],
       [("focal", 15.5, 2, 0, "first-love", "初戀告白", "粉水晶主石，剛萌芽的心動"),
        ("uniform", 16, 2, None, "daily-pink", "日常粉語", "10mm 均勻粉調，天天都能戴"),
        ("delicate", 16, 3, 2, "soft-secret", "細語心事", "8mm 細繩，襯衫袖口下的低語"),
        ("focal", 16, 2, 1, "rose-vow", "玫瑰誓約", "薔薇輝石鎖住說出口的承諾"),
        ("duo", 16.5, 2, 0, "twin-hearts", "雙心共鳴", "兩顆主石並列，勢均力敵的關係"),
        ("uniform", 16, 2, 3, "gentle-guard", "溫柔守候", "月光石與粉晶，安靜地在身邊"),
        ("graduated", 16.5, 2, 2, "fading-words", "漸層告白", "由大到小，像慢慢說完的一句話"),
        ("delicate", 15.5, 2, None, "light-kiss", "輕吻微光", "最細的一條，鎖骨鍊般的存在"),
        ("focal", 16, 2, 0, "heartbeat", "心動時刻", "石榴石的熱度，藏不住的悸動"),
        ("chunky", 17, 2, 4, "full-bloom", "盛放宣言", "全 20mm 大顆，開口就很有份量"),
        ("uniform", 16.5, 2, 1, "kindred", "相知相惜", "海藍寶讓對話清澈自在"),
        ("duo", 17, 2, 1, "eternal-vow", "永恆之約", "雙主石並置，走得長遠的關係")])

series("serene", "澄澈", "SERENE", "women", "療癒與呼吸", "HEALING & BREATH",
       "海藍寶、白水晶與螢石。給那些只想好好喘一口氣的日子。",
       "以 10mm 正常款為主，搭配細繩與漸層。", "#3f9aab", "/banners/serene.jpg", "aqua", "ENERGY_TONE",
       ["aqua", "clear", "fluorite", "moon", "moss", "amethyst"],
       ["silver-round", "silver-star", "silver-flower"],
       ["shell", "angel-wing", "moon-charm", "star-charm", "leaf"],
       [("uniform", 16, 2, 0, "deep-breath", "深海呼吸", "海藍寶，像海一樣把人放鬆"),
        ("delicate", 15.5, 3, None, "morning-clarity", "晨霧清明", "細繩白水晶，清晨的第一口空氣"),
        ("uniform", 16, 2, 1, "still-mind", "靜心冥想", "紫水晶安定，適合睡前配戴"),
        ("focal", 16, 2, 4, "forest-breath", "森林呼吸", "苔蘚瑪瑙，回到自己的節奏"),
        ("delicate", 16, 3, 3, "dewlight", "露水微光", "8mm 螢石，透亮不搶戲"),
        ("uniform", 16.5, 2, 2, "moon-healing", "月光療癒", "月光石照亮每一次重新開始"),
        ("graduated", 16.5, 2, 1, "breath-gradient", "澄心漸層", "從主石慢慢收細，像呼吸吐納"),
        ("focal", 16, 2, 3, "pure-halo", "純淨光暈", "白水晶與月光石的柔和層次"),
        ("delicate", 15.5, 2, None, "soft-restart", "溫柔重啟", "卸下再出發，最輕的一條"),
        ("uniform", 16, 2, 0, "blue-wisdom", "藍海智慧", "青金石般的沉靜，把想法說清楚"),
        ("chunky", 17, 2, 0, "deep-pool", "深潭沉靜", "大顆海藍寶，安靜但存在感強"),
        ("duo", 17, 2, 3, "serene-manifesto", "澄澈宣言", "雙主石收尾，系列最完整的一條")])

series("aurora", "極光", "AURORA", "women", "守護與直覺", "PROTECTION & INTUITION",
       "拉長石與紫水晶的暗色流光。替你擋掉不屬於你的雜訊。",
       "暗色流光，主石款與大顆款並重。", "#6b5bb0", "/banners/aurora.jpg", "labradorite", "ENERGY_TONE",
       ["labradorite", "amethyst", "tourmaline", "moon", "lapis", "obsidian"],
       ["silver-hex", "silver-round", "silver-cube"],
       ["evil-eye", "hamsa", "cross", "angel-wing", "moon-charm"],
       [("focal", 16, 2, 0, "aurora-guard", "極光守護", "拉長石流光，低調而堅定"),
        ("uniform", 16, 2, 1, "violet-ward", "紫夜結界", "紫水晶加黑碧璽，雙重界線"),
        ("chunky", 17, 2, 2, "night-shield", "暗夜之盾", "全 20mm 黑曜石，最硬的一道防線"),
        ("uniform", 16, 2, 2, "quiet-boundary", "沉靜界線", "黑碧璽與茶晶，穩穩守住自己"),
        ("focal", 16, 2, 4, "moon-watch", "月影守望", "月光石與拉長石的夜色層次"),
        ("graduated", 16.5, 2, 3, "flowing-gradient", "流光漸層", "由深至淺，像極光散開"),
        ("delicate", 16, 3, None, "stardust", "星塵細語", "8mm 細繩，護符般的存在"),
        ("focal", 16.5, 2, 0, "flowing-insight", "靈感流光", "拉長石配青金石，直覺更敏銳"),
        ("duo", 17, 2, 1, "twin-ward", "雙生守護", "兩顆主石對峙，內外都護住"),
        ("uniform", 16, 2, 3, "violet-barrier", "紫霧屏障", "紫水晶與螢石，安定又清明"),
        ("chunky", 16.5, 2, None, "bedrock-heart", "磐石之心", "大顆黑碧璽，扎實接地"),
        ("focal", 17, 2, 1, "aurora-manifesto", "極光宣言", "系列最完整的守護配置")])

series("abundance", "豐盈", "ABUNDANCE", "women", "豐盛與流動", "ABUNDANCE & FLOW",
       "黃水晶、虎眼石與金沙石。值得的，不必說得含蓄。",
       "金調為主，偏好大顆與雙主石。", "#c8912f", "/banners/abundance.jpg", "citrine", "ENERGY_TONE",
       ["citrine", "tiger", "goldstone", "sunstone", "clear", "rose"],
       ["gold-crown", "gold-rondelle", "gold-knot", "gold-pixiu"],
       ["sun-charm", "key", "clover", "compass"],
       [("chunky", 17, 2, 0, "golden-fortune", "金石開運", "全 20mm 黃水晶，招財不含蓄"),
        ("uniform", 16, 2, 2, "daily-abundance", "豐盛日常", "10mm 黃水晶，天天招好運"),
        ("focal", 16, 2, 1, "tiger-decision", "虎眼決斷", "虎眼石主石，果斷出手"),
        ("duo", 16.5, 2, 3, "goldstone-night", "金沙夜語", "金沙石雙主石，深藍藏金"),
        ("delicate", 16, 3, None, "fine-gold", "細金鍊語", "8mm 細繩金調，低調的富足"),
        ("uniform", 16, 2, 0, "warm-harvest", "暖陽豐收", "太陽石與黃水晶，暖金滿手"),
        ("graduated", 16.5, 2, 2, "rising-road", "漸富之路", "由大到小，累積的節奏"),
        ("focal", 16, 2, 1, "crowned", "金冠加冕", "金皇冠隔珠，為主石加冕"),
        ("chunky", 16.5, 2, None, "cash-flow", "財源滾滾", "大顆金沙石，氣勢直接"),
        ("focal", 16.5, 2, 3, "pixiu-keeper", "貔貅守財", "金貔貅坐鎮，只進不出"),
        ("uniform", 16, 2, 1, "clear-chance", "清晰生財", "白水晶放大每一次機會"),
        ("duo", 17, 2, 0, "abundance-manifesto", "豐盈宣言", "雙主石收官，系列的集大成")])

series("whisper", "細語", "WHISPER", "women", "日常與疊戴", "EVERYDAY LAYERS",
       "8mm 為主的細繩款。輕到你會忘記，但它一直在。",
       "幾乎全是 8mm 細繩款，最輕、最不搶戲。", "#a88b7a", "/banners/whisper.jpg", "moon", "ENERGY_TONE",
       ["moon", "rose", "clear", "aqua", "fluorite", "amethyst"],
       ["silver-round", "silver-star"],
       ["star-charm", "moon-charm"],
       [("delicate", 16, 2, None, "plain-days", "素日細語", "8mm 月光石，最日常的一條"),
        ("delicate", 15.5, 2, None, "morning-murmur", "晨光微語", "粉晶細繩，通勤也不突兀"),
        ("delicate", 16, 3, None, "pure-thread", "淨白細鍊", "全白水晶，襯衫下的隱形存在"),
        ("delicate", 16, 2, 0, "sea-breeze", "海風輕語", "海藍寶細繩，涼爽不張揚"),
        ("delicate", 15.5, 2, None, "violet-hush", "霧紫低語", "紫水晶 8mm，安靜地陪一天"),
        ("delicate", 16, 2, 1, "fluor-thread", "螢光細鍊", "螢石透亮，光線下才看得見"),
        ("delicate", 16.5, 3, None, "two-tone", "雙色細語", "粉晶配月光石，柔和的雙色"),
        ("delicate", 16, 2, None, "stack-base", "疊戴基礎", "為疊戴而生，不搶任何一條"),
        ("uniform", 16, 2, 0, "soft-weight", "微光日常", "唯一 10mm 款，稍微有點份量"),
        ("delicate", 16.5, 2, None, "gentle-space", "溫柔留白", "隔珠留白，最乾淨的排列"),
        ("uniform", 16, 2, 1, "quiet-murmur", "靜謐細語", "10mm 月光石，正常款的細語版"),
        ("delicate", 17, 3, None, "whisper-manifesto", "細語宣言", "系列裡最細的一條，8mm 到底")])

series("forge", "曜石", "FORGE", "men", "力量與守護", "STRENGTH & GUARD",
       "黑曜石、赤鐵礦與貔貅隔珠。扎實、安靜、不需要解釋。",
       "黑銀硬派，主石款到大顆款皆有。", "#b8923f", "/banners/forge.jpg", "obsidian", "POWER_TONE",
       ["obsidian", "hematite", "tiger-eye", "goldstone", "lava", "smoky"],
       ["silver-hex", "gold-hex", "gold-pixiu", "silver-tiger-spacer"],
       ["travel-compass", "compass", "arrow", "key"],
       [("focal", 16, 2, 0, "polar-night", "極夜守護者", "黑曜石與赤鐵礦，全黑硬派"),
        ("duo", 16.5, 2, 1, "decisive-investor", "決斷投資客", "金沙石雙主石，盤中不手軟"),
        ("chunky", 17, 2, 2, "heavy-bedrock", "磐石重裝", "全 20mm 黑曜石，戴起來有重量"),
        ("uniform", 16, 2, 2, "iron-will", "鋼鐵意志", "赤鐵礦領銜，銀隔珠收邊"),
        ("focal", 16.5, 2, 1, "pixiu-fortune", "貔貅招財", "金貔貅坐鎮，只進不出"),
        ("focal", 16, 2, 1, "tiger-market", "虎嘯商場", "切面虎眼石與虎首隔珠"),
        ("uniform", 17, 2, 2, "lava-warrior", "熔岩戰士", "火山岩與石榴石，訓練日戰袍"),
        ("uniform", 16, 2, 3, "steady-control", "沉穩掌控", "茶晶與黑曜石，安靜地掌握節奏"),
        ("duo", 16.5, 2, 1, "black-gold", "黑金權杖", "黑曜石壓金沙石，低調的宣示"),
        ("focal", 16, 2, 0, "dawn-expedition", "破曉遠征", "拉長石般的沉光，出差常備"),
        ("delicate", 16, 3, None, "minimal-black", "極簡黑線", "8mm 黑曜石細繩，正式場合也能戴"),
        ("chunky", 17, 2, 2, "forge-manifesto", "曜石宣言", "系列最重的一條，鏈環收尾")])

series("bedrock", "磐岩", "BEDROCK", "men", "沉穩與定錨", "WEIGHT & ANCHOR",
       "以 20mm 大顆為主。重量本身就是一種安定。",
       "以 20mm 大顆款為主，重量是重點。", "#5f6b70", "/banners/bedrock.jpg", "hematite", "POWER_TONE",
       ["hematite", "obsidian", "smoky", "lava", "tourmaline", "labradorite"],
       ["silver-cube", "silver-rivet", "silver-groove", "silver-shield"],
       ["arrow", "cross", "travel-compass"],
       [("chunky", 17, 2, None, "true-bedrock", "磐岩本色", "全 20mm 赤鐵礦，純粹的重量"),
        ("chunky", 16.5, 2, 0, "obsidian-rock", "黑曜磐石", "大顆黑曜石，一顆抵三顆"),
        ("chunky", 17, 2, None, "sunken-heart", "沉巖之心", "茶晶大顆，沉穩接地"),
        ("chunky", 16.5, 2, 2, "lava-block", "熔岩塊壘", "消光火山岩，粗獷的質地"),
        ("chunky", 17, 2, 1, "iron-wall", "鐵壁防線", "黑碧璽大顆，最強的界線"),
        ("duo", 16.5, 2, 0, "twin-rock", "雙巖對峙", "兩顆主石，硬碰硬"),
        ("graduated", 17, 2, 2, "strata", "岩層漸層", "由大到小，像地層剖面"),
        ("uniform", 16, 2, 1, "bedrock-daily", "磐岩日常", "10mm 版本，重量減半的入門款"),
        ("chunky", 17, 2, 0, "polar-bedrock", "極夜磐石", "黑曜石配赤鐵礦，全黑大顆"),
        ("focal", 16, 2, 2, "glint-in-stone", "流光磐岩", "拉長石主石，硬派中的一點光"),
        ("chunky", 16.5, 2, None, "rivet-heavy", "鉚釘重裝", "銀鉚釘隔珠，工業感拉滿"),
        ("chunky", 17, 2, 1, "bedrock-manifesto", "磐岩宣言", "系列最重，戴上就不想拿下")])

series("velocity", "疾行", "VELOCITY", "men", "專注與行動", "FOCUS & MOTION",
       "輕、細、俐落。為長時間專注而配。",
       "多為 8mm 與 10mm，追求輕與俐落。", "#2f6f7a", "/banners/velocity.jpg", "lapis", "POWER_TONE",
       ["lapis", "clear", "tiger-eye", "smoky", "hematite", "sunstone"],
       ["silver-groove", "silver-chain", "silver-hex"],
       ["arrow", "key", "star-charm"],
       [("delicate", 16, 2, None, "fine-line", "疾行細線", "8mm 青金石，跑步戴也不晃"),
        ("uniform", 16, 2, None, "blue-steel", "藍鋼日常", "10mm 正常款，通勤標配"),
        ("delicate", 15.5, 3, None, "clear-view", "清晰視野", "白水晶細繩，思路乾淨"),
        ("uniform", 16, 2, 0, "sharp-call", "銳利決斷", "虎眼石與赤鐵礦，果斷不猶豫"),
        ("delicate", 16, 2, None, "silent-focus", "靜音專注", "茶晶 8mm，最安靜的一條"),
        ("uniform", 16.5, 2, 1, "deep-tempo", "深藍節奏", "青金石為主，穩定的節拍"),
        ("graduated", 16.5, 2, 2, "accel-gradient", "疾行漸層", "由大到小，像加速的過程"),
        ("delicate", 16, 3, None, "chain-minimal", "鏈環極簡", "銀鏈環隔珠，細但有結構"),
        ("focal", 16, 2, 0, "solar-sprint", "烈日衝刺", "太陽石主石，爆發的那一下"),
        ("delicate", 16.5, 2, None, "light-rig", "鋼線輕裝", "全 8mm，幾乎沒有重量"),
        ("uniform", 16, 2, None, "core-focus", "專注核心", "赤鐵礦與白水晶，收束心緒"),
        ("focal", 17, 2, 1, "velocity-manifesto", "疾行宣言", "系列的集大成，快而不亂")])


STYLE_LABEL = {"focal": "主石款", "duo": "雙主石", "uniform": "正常款",
               "delicate": "細繩款", "chunky": "大顆款", "graduated": "漸層款"}

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
  themeEn: string;
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
    body.append(f'    id: "{s["id"]}", zh: "{s["zh"]}", en: "{s["en"]}", audience: "{s["audience"]}",')
    body.append(f'    theme: "{s["theme"]}", themeEn: "{s["themeEn"]}",')
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
    print(f"  {s['zh']:4s} {s['audience']:5s} " + " ".join(f"{k}×{v}" for k, v in sorted(styles.items())))
