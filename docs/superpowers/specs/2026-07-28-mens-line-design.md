# OMA CRYSTAL — Men's Line (`/men`) Design

## Context

OMA CRYSTAL (https://vitokok-lab.github.io/crystal/) is a Chinese-language
crystal energy-bracelet DIY builder: wrist-size-first bracelet designer,
energy-matrix radar, one-tap presets, checkout, shareable design cards, and a
physics-based 360° preview. It currently targets a feminine aesthetic
(pastel/gold, rose quartz, love/wealth framing).

The user wants a second, fully independent version of the site aimed at a
male audience — same feature set, new material library, new visual theme —
while the existing feminine version stays exactly as-is. Reference for tone
and visual direction: an AWNL men's beaded bracelet product page (tiger
eye + black onyx), and a user-supplied hero photo ("Bennett") of a man
wearing a black-and-gold faceted bead bracelet against a dark, gold-flecked
backdrop.

## Goals

- A second bracelet-builder experience, reachable at
  `https://vitokok-lab.github.io/crystal/men/`, with full feature parity to
  the existing DIY system (wrist-size flow, drag-to-reorder, energy radar,
  presets, 360° physics preview with bead-collision sound, share card,
  checkout).
- New masculine-coded material library (faceted/polygon-cut stones, round
  stones, silver-toned stones, gold/silver hardware).
- New masculine-coded energy dimension set and copy.
- Dark, minimalist-luxury visual theme distinct from the existing pastel
  theme, anchored on the user-provided Bennett hero photo.
- Zero risk to the existing feminine site: no shared mutable files, no
  shared runtime state, no cross-navigation between the two.

## Non-goals

- No cross-linking or shared brand-switcher UI between the two versions —
  they are fully independent pages (per explicit user decision).
- No abstraction/parameterization of shared logic into a common library for
  this pass — the men's version is a duplicated, independently-editable
  copy, matching the user's framing ("複製一個這樣的網站").
- No changes to the existing feminine site's code, content, or behavior.

## Architecture

The current app has no client-side router — `pages-static/main.tsx` is a
single Vite build entry that always mounts `app/page.tsx`'s `Home` export.
`vite.pages.config.ts` builds that entry to `dist-pages/`, base
`/crystal/`, with `scripts/fix-pages-base.sh` rewriting root-absolute asset
string literals (`/materials/...`, `/hero-banner.png`) to `/crystal/...`
after build (Vite's `base` only rewrites CSS `url()`s, not JS string
literals).

To get a real, independently-deployable `/men/` URL without introducing a
router, add a **second static build entry**, mirroring the existing
pattern:

- `app-men/` — a duplicate of `app/`'s component tree
  (`page.tsx`, `home.tsx`, `preview.tsx`, `checkout.tsx`,
  `design-guide.tsx`, `share-card.ts`, `globals.css`), rewritten with the
  men's material library, energy dimensions, copy, and dark theme CSS.
  `chatgpt-auth.ts` is dead code in the current app and is not duplicated.
- `pages-static-men/` — a duplicate of `pages-static/`
  (`index.html`, `main.tsx`), mounting `app-men/page.tsx`'s `Home` export.
- `vite.pages-men.config.ts` — new Vite config: `root: "pages-static-men"`,
  `base: "/crystal/men/"`, `outDir: "../dist-pages/men"`,
  **`publicDir: false`** (the public folder is already copied once by the
  root config's build; men's new images live under `public/materials/men/`
  and are referenced by absolute path `/materials/men/...`, so they don't
  need a second copy under `dist-pages/men/`).
- `package.json`'s `build:pages` script builds both configs in sequence,
  then runs `fix-pages-base.sh` once over both output directories (root
  `dist-pages/assets` and `dist-pages/men/assets`), rewriting root-absolute
  asset paths to `/crystal/...` (not `/crystal/men/...` — public assets are
  only ever served from the site root).
- Deploy step (manual sync into repo root, per existing workflow) copies
  `dist-pages/men/` into a new `men/` folder at the repo root alongside the
  existing `index.html`/`assets/`. GitHub Pages ("deploy from branch")
  serves it at `/crystal/men/` with no further configuration.

This keeps the two versions physically and logically separate: editing
`app-men/*` can never affect `app/*`, and a broken build in one entry does
not block the other (each `vite build` invocation is independent).

## Content changes

### Energy dimensions (radar chart axes)

| Feminine (unchanged) | Men's | Concept |
|---|---|---|
| 豐盛 WEALTH | 財富 WEALTH | career / money luck |
| 愛情 LOVE | 意志 WILL | willpower / self-control |
| 療癒 HEALTH | 決斷 DECISION | judgment / decisiveness |
| 守護 PROTECTION | 守護 PROTECTION | unchanged — deflecting negative energy |
| 清晰 CLARITY | 專注 FOCUS | focus / goal orientation |
| 活力 ENERGY | 力量 POWER | willpower burst / presence |

Per-material energy weightings are redefined from scratch for the new
material set (not inherited from the feminine mapping).

### Material library (`app-men/page.tsx` stones/accessories data)

Main stones (mix of faceted/polygon-cut and round, matching the user's
"圓形／多邊形／銀色" spec):

1. 切面黑曜石 Faceted Black Obsidian — 守護／決斷
2. 切面虎眼石 Faceted Tiger Eye — 決斷／財富
3. 切面赤鐵礦 Faceted Hematite (silver-grey metallic — covers "銀色") — 意志／守護
4. 圓珠茶晶 Round Smoky Quartz — 專注／力量
5. 圓珠消光火山岩 Round Matte Lava Rock — 力量／意志
6. 切面金沙石 Faceted Blue Goldstone — 財富／力量

Hardware/spacers:

7. 金色六角框隔珠
8. 銀色六角框隔珠

Charms:

9. 金色羅盤吊飾 — 決斷／專注
10. 金屬箭頭吊飾 — 力量／意志

Presets are redefined to match (e.g. a "career/決斷" preset built around
tiger eye + hematite + obsidian, mirroring the existing preset pattern in
`app/page.tsx`'s `PRESETS`).

### Material photography

New bead/hardware images are AI-generated (not user-supplied), matching
the existing photo style convention (true-to-scale, consistent lighting)
but re-lit/re-processed for the dark theme, and saved under
`public/materials/men/*.png`. Sizing/scale conventions (`PCT_PER_MM`,
bead-size categories) carry over unchanged from the feminine version's
math — only the imagery and material metadata differ.

### Visual theme

- Background: dark gradient, `#0a0a0a` → `#161513` (warm-black, not pure
  black).
- Text: white/off-white body copy, gold accent (`#c9a355`-family — the
  same brand gold used in the feminine version, kept for brand
  continuity) for emphasis/energy numbers.
- Typography: Georgia serif retained for the "OMA CRYSTAL" wordmark;
  body/UI type moves to a heavier-weight sans-serif for a more structured,
  masculine feel.
- Hero: the user-supplied Bennett photo as a full-bleed hero background,
  headline/CTA composited over the darker left-hand region of the photo.
  Saved as a public asset (e.g. `public/men-hero.jpg`) and added to
  `fix-pages-base.sh`'s path-rewrite list.
- Slogan: new English slogan in the same restrained, "quiet strength"
  register as the AWNL reference copy (exact wording finalized during
  implementation, in the same spot the feminine version's hero slogan
  occupies).
- Energy/material descriptive copy: keeps the existing pattern of pairing
  a geological fact with a meaning/intention line, rewritten in the more
  clipped, declarative tone observed on the reference page (vs. the softer
  tone used on the feminine version).

### Feature parity

Every existing interactive feature is retained 1:1 in the men's version,
reskinned only: wrist-size-first flow (13–22cm), drag-to-reorder,
energy-matrix radar, one-tap presets, checkout flow, shareable design
card + link, and the physics-based 360° preview (free trackball rotation,
soft cord, bead-collision sound — including the just-fixed tangent-following
bead-hole rotation and audio-unlock fix, both of which apply equally to
the duplicated `app-men/preview.tsx` and `app-men/share-card.ts`).

## Testing

Same headless-Playwright verification pattern already used throughout this
project: screenshots at desktop and mobile (390×664) viewports for the new
hero/landing/studio/checkout screens, an emoji-sweep check (the existing
"no AI-feeling icons" design mandate applies equally to the men's version),
and a rotation/audio sanity check on the duplicated preview/share-card
code paths. Deploy verification follows the existing poll-until-stable
pattern against the new `/crystal/men/assets/...` bundle URL.

## Open items resolved during brainstorming

- Routing: single site, `/men` subpage, second static build entry (no
  router library needed).
- Feature scope: full 1:1 clone of the DIY system, reskinned.
- Cross-linking: none — fully independent pages, no shared brand-switcher.
- Material photography: AI-generated, not user-supplied.
- Material list: proposed by Claude, approved by user (see table above).
- Energy dimensions: renamed to a masculine framing, approved by user.
