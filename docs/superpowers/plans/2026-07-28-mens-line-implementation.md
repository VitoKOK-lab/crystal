# OMA CRYSTAL Men's Line (`/men`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully independent, dark-themed men's bracelet-builder line at `https://vitokok-lab.github.io/crystal/men/`, with full feature parity to the existing feminine site, a new masculine material library, and zero changes to the existing feminine site's code or behavior.

**Architecture:** A second static Vite build entry (`pages-static-men/` → `dist-pages/men/`, base `/crystal/men/`) mounts a duplicated component tree (`app-men/`) that is byte-identical to `app/` at first, then has its material data, energy dimensions, copy, and CSS palette rewritten in place. The existing `app/`, `pages-static/`, and `vite.pages.config.ts` are never touched.

**Tech Stack:** Vite 8, React 19, plain CSS (no CSS-in-JS/Tailwind at runtime for this app — Tailwind import in `globals.css` is unused by this component tree), Playwright (`playwright-core` + the pre-installed Chromium at `/opt/pw-browsers/chromium`) for headless verification, Higgsfield MCP `generate_image` for new material photography.

Reference doc: `docs/superpowers/specs/2026-07-28-mens-line-design.md`.

---

## Before you start

Confirm you're on branch `claude/new-session-vt45nn` in `/home/user/crystal`, and that `npm run build:pages` currently succeeds (baseline). The Bennett hero photo is already saved at
`/root/.claude/uploads/e81cbe57-9492-578b-a151-8cade00334b3/c2786299-4AC1DB07B7264BA093BB073BD446E565.png` — Task 3 copies it into the repo.

Verification pattern used throughout (matches how the rest of this project has been built and deployed all session): `npm run build:pages` → serve `dist-pages/` locally → headless Playwright screenshot/assert → fix → re-verify. Only after Task 10 passes does anything get synced into the live repo root / GitHub Pages.

---

### Task 1: Scaffold the second build entry

**Files:**
- Create: `pages-static-men/index.html`
- Create: `pages-static-men/main.tsx`
- Create: `vite.pages-men.config.ts`
- Create: `app-men/page.tsx` (temporary placeholder — replaced in Task 5)
- Modify: `package.json:12`
- Modify: `scripts/fix-pages-base.sh`

- [ ] **Step 1: Create the placeholder men's entry component**

```tsx
// app-men/page.tsx
export default function Home() {
  return <div style={{ padding: 40, fontFamily: "sans-serif" }}>OMA CRYSTAL — MEN (placeholder)</div>;
}
```

- [ ] **Step 2: Create `pages-static-men/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app-men/page";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
```

(No `globals.css` import yet — Task 5 adds `app-men/globals.css` and this import.)

- [ ] **Step 3: Create `pages-static-men/index.html`**

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OMA Crystal Men｜礦石手鍊設計工作室</title>
    <meta name="description" content="打造專屬的礦石能量手鍊：切面黑曜石、虎眼石、金沙石等硬核素材、力量矩陣、即時定價與互動設計。" />
    <link rel="icon" href="../pages-static/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

First confirm `pages-static/favicon.svg` actually exists at that path before using the relative reference above:

Run: `ls pages-static/favicon.svg`
Expected: file listed. If it does not exist, run `ls pages-static/*.svg` and use whatever icon file is actually there instead (adjust the `href` accordingly); if none exists, drop the `<link rel="icon">` line entirely rather than referencing a nonexistent file.

- [ ] **Step 4: Create `vite.pages-men.config.ts`**

```ts
// Second static build entry for the men's line (https://vitokok-lab.github.io/crystal/men/).
// Mirrors vite.pages.config.ts but builds app-men/ into dist-pages/men/. publicDir
// is disabled: public/ is already copied once by the root config's build, and this
// entry's JS only ever references public assets by absolute path ("/materials/...",
// rewritten to "/crystal/..." by fix-pages-base.sh), so a second copy would be dead
// weight under dist-pages/men/.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "pages-static-men",
  base: "/crystal/men/",
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: "../dist-pages/men",
    emptyOutDir: true,
  },
});
```

- [ ] **Step 5: Wire both entries into `build:pages`**

In `package.json`, replace line 12:

```json
    "build:pages": "vite build --config vite.pages.config.ts && bash scripts/fix-pages-base.sh",
```

with:

```json
    "build:pages": "vite build --config vite.pages.config.ts && vite build --config vite.pages-men.config.ts && bash scripts/fix-pages-base.sh",
```

- [ ] **Step 6: Make `fix-pages-base.sh` sweep both output directories**

Replace the whole file:

```bash
#!/usr/bin/env bash
# The app's JS hardcodes root-absolute image URLs ("/materials/*.png") that
# break under the GitHub Pages project path /crystal/. Vite already rebases
# CSS url() references (e.g. /crystal-hero.png) via the `base` option, but it
# does not touch plain string literals in JS, so rewrite those here. Public
# assets only ever live at the site root (/crystal/materials/...), even for
# the men's sub-entry (dist-pages/men/), since vite.pages-men.config.ts sets
# publicDir:false and reuses the root build's copy — so every bundle,
# regardless of which entry produced it, rewrites to the same /crystal/ prefix.
# Run only on a fresh build: build:pages empties both dist-pages dirs first,
# and running this twice on the same output would double the /crystal prefix.
set -euo pipefail

DIST="dist-pages"
BASE="/crystal"

find "$DIST" -type f -name '*.js' -print0 |
  xargs -0 sed -i \
    -e "s|/materials/|$BASE/materials/|g" \
    -e "s|\`/hero-banner.png\`|\`$BASE/hero-banner.png\`|g" \
    -e "s|/men-hero.jpg|$BASE/men-hero.jpg|g"

echo "Rewrote root-absolute asset paths under $DIST to $BASE/…"
```

- [ ] **Step 7: Build and verify both entries produce output**

Run: `npm run build:pages`
Expected: build succeeds; `ls dist-pages/index.html dist-pages/men/index.html` both print the file paths (no "No such file").

Run: `grep -o 'src="[^"]*assets[^"]*"' dist-pages/men/index.html`
Expected: one match, an `assets/...` script `src` (Vite emits a base-relative path here — `base` only actually resolves once served under `/crystal/men/`, which Step 8 checks over HTTP).

- [ ] **Step 8: Serve locally and verify `/men/` boots**

```bash
mkdir -p /tmp/pages-root && ln -sfn "$(pwd)/dist-pages" /tmp/pages-root/crystal
pkill -f "http.server 8899" 2>/dev/null || true
(cd /tmp/pages-root && nohup python3 -m http.server 8899 >/tmp/http899.log 2>&1 &)
sleep 1
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8899/crystal/men/
```

Expected: `200`. Also run `curl -sS http://localhost:8899/crystal/men/ | grep -o '<title>[^<]*</title>'` — expected: `<title>OMA Crystal Men｜礦石手鍊設計工作室</title>`.

- [ ] **Step 9: Commit**

```bash
git add pages-static-men app-men vite.pages-men.config.ts package.json scripts/fix-pages-base.sh
git commit -m "Scaffold independent /men static build entry (placeholder content)"
```

---

### Task 2: Duplicate the existing app into `app-men/` verbatim

**Files:**
- Create: `app-men/home.tsx` (copy of `app/home.tsx`)
- Create: `app-men/preview.tsx` (copy of `app/preview.tsx`)
- Create: `app-men/checkout.tsx` (copy of `app/checkout.tsx`)
- Create: `app-men/design-guide.tsx` (copy of `app/design-guide.tsx`)
- Create: `app-men/share-card.ts` (copy of `app/share-card.ts`)
- Create: `app-men/globals.css` (copy of `app/globals.css`)
- Modify: `app-men/page.tsx` (replace Task 1's placeholder with the real duplicate of `app/page.tsx`)
- Modify: `pages-static-men/main.tsx`

- [ ] **Step 1: Copy the five untouched-for-now files and globals.css verbatim**

```bash
cp app/home.tsx app-men/home.tsx
cp app/preview.tsx app-men/preview.tsx
cp app/checkout.tsx app-men/checkout.tsx
cp app/design-guide.tsx app-men/design-guide.tsx
cp app/share-card.ts app-men/share-card.ts
cp app/globals.css app-men/globals.css
cp app/page.tsx app-men/page.tsx
```

- [ ] **Step 2: Point `pages-static-men/main.tsx` at the duplicated globals.css**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app-men/page";
import "../app-men/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
```

- [ ] **Step 3: Build and diff-check the duplicate renders identically to the original**

Run: `npm run build:pages`
Expected: succeeds with no TypeScript/build errors (the copy is self-contained — `app-men/page.tsx` imports `./checkout`, `./home`, `./preview`, `./share-card`, all of which now exist under `app-men/`).

Write `/tmp/claude-0/-home-user-crystal/e81cbe57-9492-578b-a151-8cade00334b3/scratchpad/duplicate-check.mjs`:

```js
import { chromium } from "playwright-core";
const S = process.env.SCRATCH;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto("http://localhost:8899/crystal/men/", { waitUntil: "networkidle" });
await page.waitForSelector(".landing");
await page.screenshot({ path: S + "/duplicate-landing.png" });
await page.locator(".landing-hero-copy .landing-cta").click();
await page.waitForTimeout(400);
await page.screenshot({ path: S + "/duplicate-studio.png" });
console.log("errors:", errs.length ? errs : "none");
await browser.close();
```

Run: `SCRATCH="/tmp/claude-0/-home-user-crystal/e81cbe57-9492-578b-a151-8cade00334b3/scratchpad" node "/tmp/claude-0/-home-user-crystal/e81cbe57-9492-578b-a151-8cade00334b3/scratchpad/duplicate-check.mjs"`
Expected: `errors: none`. View both screenshots — they should look pixel-identical to the existing feminine site (same rose-quartz-led default bracelet, same pastel theme) since `app-men/` is still an untouched copy at this point. This confirms the duplication itself introduced no regressions before content/theme edits begin.

- [ ] **Step 4: Commit**

```bash
git add app-men pages-static-men/main.tsx
git commit -m "Duplicate app/ into app-men/ verbatim as the men's line starting point"
```

---

### Task 3: Generate men's material photography and save the hero photo

**Files:**
- Create: `public/materials/men/obsidian.png`
- Create: `public/materials/men/tiger-eye.png`
- Create: `public/materials/men/hematite.png`
- Create: `public/materials/men/smoky.png`
- Create: `public/materials/men/lava.png`
- Create: `public/materials/men/goldstone.png`
- Create: `public/materials/men/gold-hex.png`
- Create: `public/materials/men/silver-hex.png`
- Create: `public/materials/men/compass.png`
- Create: `public/materials/men/arrow.png`
- Create: `public/men-hero.jpg`

The existing material photos (e.g. `public/materials/tiger.png`) are square (~240–400px), RGBA transparent-background, top-down single-bead product renders with a visible horizontal drilled hole, soft directional studio lighting, and a subtle rim/contact shadow. Match this exact style for every new image so `.crystal.photo img { object-fit:contain; filter:drop-shadow(...) }` composites them identically to the existing ones (transparency means these look correct on both the light feminine theme and the new dark theme — no separate dark variant needed).

- [ ] **Step 1: Generate the six stone bead photos**

Call the Higgsfield MCP `generate_image` tool once per prompt below (transparent/isolated background, square, high detail):

1. `obsidian` — "Professional studio product photograph of a single polished faceted black obsidian bead, geometric polygon-cut facets catching sharp specular highlights, a visible horizontal drilled hole through the center, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"
2. `tiger-eye` — "Professional studio product photograph of a single polished faceted tiger's eye gemstone bead, golden-brown chatoyant bands across angular cut facets, a visible horizontal drilled hole through the center, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"
3. `hematite` — "Professional studio product photograph of a single polished faceted hematite bead, silver-grey metallic mirror-like sheen across angular cut facets, a visible horizontal drilled hole through the center, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"
4. `smoky` — "Professional studio product photograph of a single polished round smoky quartz gemstone bead, translucent smoky brown-grey tone with visible internal depth, a visible horizontal drilled hole through the center, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"
5. `lava` — "Professional studio product photograph of a single round matte black lava rock bead, porous unpolished volcanic stone texture, a visible horizontal drilled hole through the center, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"
6. `goldstone` — "Professional studio product photograph of a single polished faceted blue goldstone bead, deep midnight-blue glass with dense sparkling copper-gold inclusions catching light across angular cut facets, a visible horizontal drilled hole through the center, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"

Save each generated result to `public/materials/men/<id>.png` (obsidian.png, tiger-eye.png, hematite.png, smoky.png, lava.png, goldstone.png).

- [ ] **Step 2: Generate the two spacer photos and two charm photos**

7. `gold-hex` — "Professional studio product photograph of a single small gold hexagonal frame spacer bead for a men's bracelet, brushed matte gold metal with sharp geometric hexagon edges, a visible horizontal drilled hole through the center, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"
8. `silver-hex` — "Professional studio product photograph of a single small silver hexagonal frame spacer bead for a men's bracelet, brushed matte silver metal with sharp geometric hexagon edges, a visible horizontal drilled hole through the center, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"
9. `compass` — "Professional studio product photograph of a small gold compass charm pendant for a men's bracelet, detailed compass rose engraving, matte gold metal finish, small loop for attachment at top, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"
10. `arrow` — "Professional studio product photograph of a small gold arrow charm pendant for a men's bracelet, sleek minimalist arrow silhouette, matte gold metal finish, small loop for attachment at top, pure transparent background, soft top-down studio lighting, centered, square composition, ultra-detailed, photorealistic, no text, no watermark"

Save to `public/materials/men/gold-hex.png`, `silver-hex.png`, `compass.png`, `arrow.png`.

- [ ] **Step 3: Verify all ten images**

Run:
```bash
python3 -c "
from PIL import Image
import os
for f in ['obsidian','tiger-eye','hematite','smoky','lava','goldstone','gold-hex','silver-hex','compass','arrow']:
    p = f'public/materials/men/{f}.png'
    im = Image.open(p)
    print(p, im.size, im.mode)
"
```
Expected: all ten print with `mode` `RGBA` (transparent background) — if any prints `RGB`, that image has an opaque background and must be regenerated or background-removed (the Higgsfield `remove_background` tool is available for this) before continuing.

Read each of the 10 images with the Read tool and visually confirm: single bead/charm, centered, transparent background, visible drilled hole (for the 6 stones and 2 spacers — the two charms don't need a drilled hole, they need the attachment loop instead), no watermark/text artifacts. Regenerate any that fail this check.

- [ ] **Step 4: Save the Bennett hero photo into the repo**

```bash
cp "/root/.claude/uploads/e81cbe57-9492-578b-a151-8cade00334b3/c2786299-4AC1DB07B7264BA093BB073BD446E565.png" /tmp/men-hero-source.png
python3 -c "
from PIL import Image
im = Image.open('/tmp/men-hero-source.png').convert('RGB')
im.save('public/men-hero.jpg', quality=90)
print(im.size)
"
```
Expected: prints the image dimensions (no error). `ls -la public/men-hero.jpg` shows a reasonable file size (a few hundred KB, not multiple MB — the landing hero is a full-bleed background image loaded on first paint).

- [ ] **Step 5: Commit**

```bash
git add public/materials/men public/men-hero.jpg
git commit -m "Add AI-generated men's material photography and the Bennett hero photo"
```

---

### Task 4: Rewrite `app-men/page.tsx` material data, energy dimensions, and presets

**Files:**
- Modify: `app-men/page.tsx`

- [ ] **Step 1: Replace the `EnergyType` union**

Find:
```ts
type EnergyType = "wealth" | "love" | "health" | "protection" | "clarity" | "energy";
```
Replace with:
```ts
type EnergyType = "wealth" | "will" | "decision" | "protection" | "focus" | "power";
```

- [ ] **Step 2: Replace the `stones` array**

Find the `const stones: Stone[] = [...]` block (the sixteen-row array literal followed by `.map(([id,zh,en,group,color,light,deep,price,note,energy]) => ...)`) and replace the array literal's contents with:

```ts
const stones: Stone[] = [
  ["obsidian","切面黑曜石","Faceted Black Obsidian","守護","#232323","#5c5c5c","#0a0a0a",280,"深邃切面，隔絕負能量，穩定決斷力",{wealth:3,will:6,decision:8,protection:10,focus:6,power:6}],
  ["tiger-eye","切面虎眼石","Faceted Tiger Eye","決斷","#a9762f","#e8c876","#4a2f0c",290,"琥珀光澤流動，帶來判斷力與行動的勇氣",{wealth:8,will:5,decision:9,protection:5,focus:7,power:6}],
  ["hematite","切面赤鐵礦","Faceted Hematite","意志","#71757a","#c7ccd1","#2b2d30",260,"金屬光澤沉穩接地，強化意志與防禦力",{wealth:3,will:9,decision:5,protection:8,focus:5,power:6}],
  ["smoky","圓珠茶晶","Round Smoky Quartz","專注","#5f4a3a","#a8876a","#241a12",250,"沉穩接地，釋放雜訊，收束專注力",{wealth:4,will:5,decision:5,protection:6,focus:9,power:6}],
  ["lava","圓珠消光火山岩","Round Matte Lava Rock","力量","#1c1c1c","#3f3f3f","#050505",220,"原始火山岩質地，釋放意志與爆發力",{wealth:2,will:8,decision:4,protection:5,focus:4,power:10}],
  ["goldstone","切面金沙石","Faceted Blue Goldstone","財富","#1d2b45","#5878ad","#0a1220",310,"深藍夜空中的金色星芒，象徵野心與機運",{wealth:10,will:4,decision:6,protection:3,focus:5,power:7}],
].map(([id,zh,en,group,color,light,deep,price,note,energy]) => ({ id,zh,en,group,color,light,deep,price,note,energy } as Stone));
```

- [ ] **Step 3: Replace the `accessories` array**

Find the `const accessories: Accessory[] = [...]` block and replace the array literal's contents with:

```ts
const accessories: Accessory[] = [
  ["gold-hex","金色六角框隔珠","Gold Hex Frame Spacer","spacer","hex","gold",150,"俐落線條，界定每段能量"],
  ["silver-hex","銀色六角框隔珠","Silver Hex Frame Spacer","spacer","hex","silver",140,"冷冽金屬感，中和石材重量"],
  ["compass","金色羅盤吊飾","Gold Compass Charm","charm","compass","gold",460,"讓決斷始終指向目標"],
  ["arrow","金屬箭頭吊飾","Metal Arrow Charm","charm","arrow","gold",420,"直線前進，象徵意志與力量"],
].map(([id,zh,en,type,shape,metal,price,note]) => ({ id,zh,en,type,shape,metal,price,note } as Accessory));
```

- [ ] **Step 4: Replace `stonePhotos` and `accessoryPhotos`**

Find:
```ts
const stonePhotos: Record<string, string> = {
  clear: "/materials/clear.png",
  ...
};
```
Replace with:
```ts
const stonePhotos: Record<string, string> = {
  obsidian: "/materials/men/obsidian.png",
  "tiger-eye": "/materials/men/tiger-eye.png",
  hematite: "/materials/men/hematite.png",
  smoky: "/materials/men/smoky.png",
  lava: "/materials/men/lava.png",
  goldstone: "/materials/men/goldstone.png",
};
```

Find:
```ts
const accessoryPhotos: Record<string, string> = {
  "silver-round": "/materials/silver-round.png",
  ...
};
```
Replace with:
```ts
const accessoryPhotos: Record<string, string> = {
  "gold-hex": "/materials/men/gold-hex.png",
  "silver-hex": "/materials/men/silver-hex.png",
  compass: "/materials/men/compass.png",
  arrow: "/materials/men/arrow.png",
};
```

- [ ] **Step 5: Replace `initialSpec`**

Find:
```ts
const initialSpec: [string, BeadSize?][] = [["rose","xlarge"],["rose","large"],["rose","large"],["clear","small"],["rose","large"],["silver-round"],["rose","small"],["rose","large"],["rose","small"],["gold-rondelle"],["rose","large"],["clear","small"],["rose","large"],["rose","small"],["rose","large"],["lotus"]];
```
Replace with:
```ts
const initialSpec: [string, BeadSize?][] = [["obsidian","xlarge"],["obsidian","large"],["tiger-eye","large"],["hematite","small"],["obsidian","large"],["gold-hex"],["tiger-eye","small"],["obsidian","large"],["hematite","small"],["silver-hex"],["obsidian","large"],["tiger-eye","small"],["obsidian","large"],["hematite","small"],["obsidian","large"],["compass"]];
```

- [ ] **Step 6: Replace `PRESETS`**

Find the `const PRESETS = { wealth: ..., love: ..., career: ... } as const;` block and replace with:

```ts
const PRESETS = {
  power: { name: "力量掌控", pad: "obsidian", spec: [["obsidian","xlarge"],["lava","large"],["obsidian","large"],["hematite","large"],["lava","small"],["gold-hex"],["obsidian","large"],["hematite","large"],["lava","small"],["gold-hex"],["obsidian","large"],["lava","large"],["hematite","small"],["obsidian","large"],["arrow"]] as [string, BeadSize?][] },
  wealth: { name: "財富機運", pad: "goldstone", spec: [["goldstone","xlarge"],["tiger-eye","large"],["goldstone","large"],["tiger-eye","large"],["hematite","small"],["gold-hex"],["goldstone","large"],["tiger-eye","large"],["hematite","small"],["gold-hex"],["goldstone","large"],["tiger-eye","large"],["hematite","small"],["goldstone","large"],["compass"]] as [string, BeadSize?][] },
  focus: { name: "決斷專注", pad: "smoky", spec: [["tiger-eye","xlarge"],["smoky","large"],["obsidian","large"],["smoky","large"],["hematite","small"],["silver-hex"],["tiger-eye","large"],["smoky","large"],["hematite","small"],["silver-hex"],["obsidian","large"],["smoky","large"],["hematite","small"],["tiger-eye","large"],["compass"]] as [string, BeadSize?][] },
} as const;
```

- [ ] **Step 7: Replace `ENERGY_META`**

Find:
```ts
const ENERGY_META = [
  { key: "wealth", zh: "豐盛", en: "WEALTH", color: "#e3b04b" },
  { key: "love", zh: "愛情", en: "LOVE", color: "#e88aa8" },
  { key: "health", zh: "療癒", en: "HEALING", color: "#7ec8a5" },
  { key: "protection", zh: "守護", en: "PROTECTION", color: "#7593d8" },
  { key: "clarity", zh: "清晰", en: "CLARITY", color: "#72c7d6" },
  { key: "energy", zh: "活力", en: "VITALITY", color: "#e0885a" },
] as const satisfies readonly { key: EnergyType; zh: string; en: string; color: string }[];
```
Replace with:
```ts
const ENERGY_META = [
  { key: "wealth", zh: "財富", en: "WEALTH", color: "#c9a355" },
  { key: "will", zh: "意志", en: "WILL", color: "#a8977a" },
  { key: "decision", zh: "決斷", en: "DECISION", color: "#c7cdd3" },
  { key: "protection", zh: "守護", en: "PROTECTION", color: "#7d8896" },
  { key: "focus", zh: "專注", en: "FOCUS", color: "#8a6d1f" },
  { key: "power", zh: "力量", en: "POWER", color: "#e3c179" },
] as const satisfies readonly { key: EnergyType; zh: string; en: string; color: string }[];
```

- [ ] **Step 8: Fix the two energy-weighting call sites that reference removed keys**

Search for any remaining references to the old keys (`love`, `health`, `clarity`, `energy` as an `EnergyType` value — not to be confused with the unrelated local variables/props also named `energy`):

Run: `grep -n '"love"\|"health"\|"clarity"\|scores\[.*"energy"\]' app-men/page.tsx`
Expected: no matches. (The `energyScores`, `EnergyPanel`, and `previewPieces` functions all iterate `ENERGY_META` generically and read `stone.energy[m.key]`, so they need no code changes — only the data above — but this grep is the safety check that nothing still hardcodes an old key name.) If anything matches, fix it to use the new key names from Step 7 before proceeding.

- [ ] **Step 9: Build and verify the studio renders with the new material set**

Run: `npm run build:pages`
Expected: no TypeScript errors (a leftover reference to a deleted key like `stones.find(s=>s.id==="rose")` would surface as a runtime `undefined` read, not necessarily a build error — Step 10's screenshot is the real check).

Write `/tmp/claude-0/-home-user-crystal/e81cbe57-9492-578b-a151-8cade00334b3/scratchpad/materials-check.mjs`:
```js
import { chromium } from "playwright-core";
const S = process.env.SCRATCH;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://localhost:8899/crystal/men/", { waitUntil: "networkidle" });
await page.waitForSelector(".landing");
await page.locator(".landing-hero-copy .landing-cta").click();
await page.waitForTimeout(400);
await page.screenshot({ path: S + "/materials-studio.png" });
// apply each preset and screenshot the resulting bracelet + energy panel
for (const key of ["power", "wealth", "focus"]) {
  await page.locator(".preset-row button", { hasText: key === "power" ? "力量掌控" : key === "wealth" ? "財富機運" : "決斷專注" }).click();
  await page.waitForTimeout(300);
  await page.locator(".bracelet-stage").screenshot({ path: `${S}/materials-preset-${key}.png` });
}
console.log("errors:", errs.length ? errs : "none");
await browser.close();
```

Run: `SCRATCH="/tmp/claude-0/-home-user-crystal/e81cbe57-9492-578b-a151-8cade00334b3/scratchpad" node "/tmp/claude-0/-home-user-crystal/e81cbe57-9492-578b-a151-8cade00334b3/scratchpad/materials-check.mjs"`
Expected: `errors: none`. View `materials-studio.png` and all three `materials-preset-*.png` — the bracelet should be built from the new obsidian/tiger-eye/hematite/smoky/lava/goldstone photos (no broken image icons, no leftover rose-quartz/citrine imagery), and each preset button should visibly change the bracelet composition.

- [ ] **Step 10: Commit**

```bash
git add app-men/page.tsx
git commit -m "Replace material library, energy dimensions, and presets with the men's data set"
```

---

### Task 5: Rewrite `app-men/home.tsx` (landing page copy + Bennett hero)

**Files:**
- Modify: `app-men/home.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
"use client";

import { useEffect, useRef } from "react";

// Crystal thumbnails used purely for the showcase strip below the fold.
const SHOWCASE = [
  ["obsidian", "切面黑曜石", "守護"],
  ["tiger-eye", "切面虎眼石", "決斷"],
  ["hematite", "切面赤鐵礦", "意志"],
  ["smoky", "圓珠茶晶", "專注"],
  ["lava", "圓珠消光火山岩", "力量"],
  ["goldstone", "切面金沙石", "財富"],
  ["gold-hex", "金色六角框隔珠", "配件"],
  ["compass", "金色羅盤吊飾", "配件"],
] as const;

const FEATURES = [
  { title: "6 款硬核礦石", body: "從切面黑曜石到金沙石，圓潤與稜角並存，每一顆都禁得起近看。" },
  { title: "即時力量矩陣", body: "六維力量雷達即時運算——財富、意志、決斷、守護、專注、力量，設計看得見成效。" },
  { title: "360° 實體手感", body: "自由翻轉、軟繩晃動、珠子碰撞出聲——下單前就能感受戴在手上的真實重量。" },
] as const;

const PRESET_TEASERS = [
  { name: "力量掌控", body: "黑曜石＋消光火山岩，穩定爆發力", swatch: "obsidian" },
  { name: "財富機運", body: "金沙石＋虎眼石，果斷出擊", swatch: "goldstone" },
  { name: "決斷專注", body: "虎眼石＋茶晶，收束心緒", swatch: "tiger-eye" },
] as const;

// Fades + lifts each [data-reveal] section in as it enters the viewport —
// a light touch of polish rather than a heavy animation framework.
function useScrollReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); } });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return rootRef;
}

export default function Home({ onStart }: { onStart: () => void }) {
  const rootRef = useScrollReveal();
  return <div className="landing" ref={rootRef}>
    <header className="landing-nav">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <button className="landing-nav-cta" onClick={onStart}>開始設計</button>
    </header>

    <section className="landing-hero" id="landing-top">
      <img src="/men-hero.jpg" alt="OMA CRYSTAL 男性礦石手鍊配戴示意" />
      <div className="landing-hero-copy">
        <p>MEN'S COLLECTION</p>
        <h1>WEAR YOUR<br />DISCIPLINE</h1>
        <span>用礦石的重量與稜角，串出屬於你的沉靜力量。一顆一顆，都是自己的決定。</span>
        <button className="landing-cta" onClick={onStart}>開始設計我的手鍊 <i>→</i></button>
      </div>
      <div className="landing-scroll-hint"><i /></div>
    </section>

    <section className="landing-features" data-reveal>
      <div className="landing-features-head">
        <p className="landing-eyebrow">WHY OMA</p>
        <h2>不只是手鍊，<br />是每天的自我校準</h2>
      </div>
      <div className="landing-feature-list">
        {FEATURES.map((f, i) => <div className="landing-feature-row" key={f.title}>
          <span className="lf-index">{String(i + 1).padStart(2, "0")}</span>
          <div className="lf-body"><b>{f.title}</b><p>{f.body}</p></div>
        </div>)}
      </div>
    </section>

    <section className="landing-presets" data-reveal>
      <p className="landing-eyebrow">ONE-TAP RECIPES</p>
      <h2>沒有靈感？試試一鍵力量配方</h2>
      <div className="landing-preset-list">
        {PRESET_TEASERS.map((p) => <button className="landing-preset" key={p.name} onClick={onStart}>
          <img src={`/materials/men/${p.swatch}.png`} alt="" className="lp-swatch" />
          <span className="lp-text"><b>{p.name}</b><i>{p.body}</i></span>
          <span className="lp-arrow">前往設計 →</span>
        </button>)}
      </div>
    </section>

    <section className="landing-showcase" data-reveal>
      <p className="landing-eyebrow">THE COLLECTION</p>
      <h2>6 款硬核礦石，任你搭配</h2>
      <div className="landing-showcase-grid">
        {SHOWCASE.map(([id, zh, group]) => <div className="ls-item" key={id}>
          <img src={`/materials/men/${id}.png`} alt={zh} />
          <b>{zh}</b>
          <span>{group}</span>
        </div>)}
      </div>
    </section>

    <section className="landing-quote" data-reveal>
      <p>THE OMA ATELIER</p>
      <h2>多一份克制，<br />讓每天的配戴成為一次自我校準。</h2>
      <button className="landing-cta light" onClick={onStart}>開始設計我的手鍊 <i>→</i></button>
    </section>

    <footer className="landing-footer">
      <a className="wordmark" href="#landing-top">OMA <span>CRYSTAL</span></a>
      <span>© {new Date().getFullYear() || 2026} OMA CRYSTAL · MEN'S COLLECTION</span>
    </footer>
  </div>;
}
```

- [ ] **Step 2: Build and screenshot the new landing page**

Run: `npm run build:pages`
Expected: succeeds.

Reuse the local server from Task 2 (restart it if it's no longer running: `pkill -f "http.server 8899" 2>/dev/null || true; (cd /tmp/pages-root && nohup python3 -m http.server 8899 >/tmp/http899.log 2>&1 &); sleep 1`), then screenshot `http://localhost:8899/crystal/men/` at both `{width:1440,height:900}` and `{width:390,height:664}` viewports (same pattern as `duplicate-check.mjs` in Task 2 — swap the viewport and output filenames). View both screenshots: confirm the Bennett photo fills the hero, "WEAR YOUR DISCIPLINE" headline is legible over it, and the showcase grid shows the six new stone photos (not broken images).

- [ ] **Step 3: Commit**

```bash
git add app-men/home.tsx
git commit -m "Rewrite men's landing page copy and hero around the Bennett photo"
```

---

### Task 6: Dark theme — palette and structural chrome

**Files:**
- Modify: `app-men/globals.css`

This task and Task 7 together re-theme `app-men/globals.css` (a full independent copy — `app/globals.css` is never touched) from the feminine pastel/gold-on-white palette to a black-and-gold dark theme, using the Edit tool against the real file (already read in full during planning; every selector below exists verbatim in the copy made in Task 2).

Palette used throughout Tasks 6–7:
- `--m-bg: #0b0a08` (page/base background)
- `--m-bg-2: #141210` (panel/card background)
- `--m-bg-3: #1c1712` (hover/deeper panel background)
- `--m-line: #2b2720` (borders/dividers)
- `--m-text: #f1ece0` (primary text — warm off-white)
- `--m-muted: #a89c86` (secondary/muted text)
- `--m-gold: #c9a355` (primary accent — same brand gold hue as the feminine site)
- `--m-gold-bright: #e3c179` (hover/emphasis gold)

- [ ] **Step 1: Replace the `:root` token block**

Find:
```css
:root { --blue:#72d7d1; --blue-deep:#159d9b; --ink:#1f2828; --muted:#8a9694; --paper:#f6f5f1; --line:#e6ecea; --gold:#c7a96a; }
```
Replace with:
```css
:root { --blue:#e3c179; --blue-deep:#c9a355; --ink:#f1ece0; --muted:#a89c86; --paper:#0b0a08; --line:#2b2720; --gold:#c9a355; }
```
(Keeping the token *names* `--blue`/`--blue-deep`/`--ink`/`--muted`/`--paper`/`--line` unchanged means every rule that already references `var(--line)`, `var(--ink)`, `var(--blue-deep)` etc. picks up the dark palette automatically with no further edit — this is why Step 1 alone already fixes `.studio-head` borders, `.wordmark span`, `.price b`, `.canvas-actions .primary span`, `.wrist-select`, `.preset-row` border, `.tabs` border, `.materials-panel` border, `.selected-detail` border-top, and every other `var(--line)`/`var(--ink)`/`var(--blue)`/`var(--blue-deep)`/`var(--muted)`/`var(--paper)` usage in the file.)

- [ ] **Step 2: Re-theme the studio shell chrome**

Find and replace each (all within the `.studio`, `.studio-head`, `.canvas-panel`, `.studio-shell` rule block near the top of the file):

Find: `.studio { min-height:100vh; background:#fff; }`
Replace: `.studio { min-height:100vh; background:#0b0a08; }`

Find: `.studio-head { height:78px; display:flex; align-items:center; justify-content:space-between; padding:0 clamp(24px,5vw,76px); border-bottom:1px solid var(--line); background:#fff; }`
Replace: `.studio-head { height:78px; display:flex; align-items:center; justify-content:space-between; padding:0 clamp(24px,5vw,76px); border-bottom:1px solid var(--line); background:#0b0a08; }`

Find: `.wordmark { border:0; background:transparent; padding:0; color:#172929; text-decoration:none; font:500 21px Georgia,serif; letter-spacing:.28em; }`
Replace: `.wordmark { border:0; background:transparent; padding:0; color:#f1ece0; text-decoration:none; font:500 21px Georgia,serif; letter-spacing:.28em; }`

Find: `.head-note { color:#7e9693; font-size:9px; letter-spacing:.25em; }`
Replace: `.head-note { color:#8f8672; font-size:9px; letter-spacing:.25em; }`

Find: `.quiet { padding:10px 0; border:0; background:transparent; color:#52716f; font-size:11px; letter-spacing:.08em; transition:color 0.2s; }`
Replace: `.quiet { padding:10px 0; border:0; background:transparent; color:#a89c86; font-size:11px; letter-spacing:.08em; transition:color 0.2s; }`

Find: `.quiet:hover { color:#1a3c3a; }`
Replace: `.quiet:hover { color:#f1ece0; }`

Find: `.studio-shell { display:grid; grid-template-columns:minmax(650px,1.55fr) minmax(420px,.8fr); min-height:820px; max-width:1580px; margin:auto; background:#fff; }`
Replace: `.studio-shell { display:grid; grid-template-columns:minmax(650px,1.55fr) minmax(420px,.8fr); min-height:820px; max-width:1580px; margin:auto; background:#0b0a08; }`

Find: `.canvas-panel { position:relative; overflow:hidden; padding:28px 34px 26px; background:radial-gradient(circle at 47% 44%,#fff 0 32%,#fcfcfa 63%,#f2f5f3 100%); }`
Replace: `.canvas-panel { position:relative; overflow:hidden; padding:28px 34px 26px; background:radial-gradient(circle at 47% 44%,#151310 0 32%,#100f0d 63%,#0b0a08 100%); }`

Find: `.canvas-panel:before { content:""; position:absolute; inset:0; pointer-events:none; opacity:.32; background:url('/crystal-hero.png') center/cover; mix-blend-mode:soft-light; }`
Replace: `.canvas-panel:before { content:""; position:absolute; inset:0; pointer-events:none; opacity:.18; background:url('/crystal-hero.png') center/cover; mix-blend-mode:overlay; }`

- [ ] **Step 3: Re-theme stats, price, and wrist-bar text**

Find: `.stats small,.price small { color:#91a4a1; font-size:9px; letter-spacing:.17em; }`
Replace: `.stats small,.price small { color:#8f8672; font-size:9px; letter-spacing:.17em; }`

Find: `.stats b { color:#2a3f3e; font:500 15px Georgia,serif; }`
Replace: `.stats b { color:#f1ece0; font:500 15px Georgia,serif; }`

Find: `.stats i { font:normal 10px Arial; color:#8ca09d; }`
Replace: `.stats i { font:normal 10px Arial; color:#a89c86; }`

Find: `.price b { color:#0d7f7c; font:500 20px Georgia,serif; letter-spacing:.04em; }`
Replace: `.price b { color:#e3c179; font:500 20px Georgia,serif; letter-spacing:.04em; }`

Find: `.wrist-bar { position:relative; display:block; width:92px; height:4px; margin-top:2px; border-radius:99px; background:#e4edeb; }`
Replace: `.wrist-bar { position:relative; display:block; width:92px; height:4px; margin-top:2px; border-radius:99px; background:#2b2720; }`

Find: `.wrist-bar i { display:block; height:100%; border-radius:99px; background:#48bbb5; transition:width .3s ease,background .3s; }`
Replace: `.wrist-bar i { display:block; height:100%; border-radius:99px; background:#c9a355; transition:width .3s ease,background .3s; }`

Find: `.wrist-bar.low i { background:#b7cfca; }`
Replace: `.wrist-bar.low i { background:#5c5646; }`

- [ ] **Step 4: Re-theme the bracelet stage and notice toast**

Find: `.bracelet-string { position:absolute; z-index:1; border:2px solid #8b817563; border-radius:50%; box-shadow:inset 0 0 0 1px #fff,0 3px 3px #58483825; }`
Replace: `.bracelet-string { position:absolute; z-index:1; border:2px solid #c9a35577; border-radius:50%; box-shadow:inset 0 0 0 1px #ffffff22,0 3px 3px #00000060; }`

Find: `.bracelet-string:after { content:""; position:absolute; inset:8px; border-radius:50%; border:1px solid #dfd7cf; opacity:.72; }`
Replace: `.bracelet-string:after { content:""; position:absolute; inset:8px; border-radius:50%; border:1px solid #4a4436; opacity:.72; }`

Find: `.remove-mark { position:absolute; right:0; top:0; z-index:5; display:grid; place-items:center; width:18px; height:18px; border-radius:50%; background:#1b3332; color:#fff; font-size:14px; opacity:0; transform:scale(.75); transition:.16s; }`
Replace: `.remove-mark { position:absolute; right:0; top:0; z-index:5; display:grid; place-items:center; width:18px; height:18px; border-radius:50%; background:#2a2419; color:#fff; font-size:14px; opacity:0; transform:scale(.75); transition:.16s; }`

Find: `.stage-tip { position:absolute; bottom:18px;left:50%;transform:translateX(-50%);white-space:nowrap;color:#8a9a97;font-size:10px;letter-spacing:.08em; }`
Replace: `.stage-tip { position:absolute; bottom:18px;left:50%;transform:translateX(-50%);white-space:nowrap;color:#9a8f7c;font-size:10px;letter-spacing:.08em; }`

Find: `.canvas-actions button { padding:12px 15px;border:1px solid #dce8e6;background:#fff;color:#5c7775;font-size:11px; }`
Replace: `.canvas-actions button { padding:12px 15px;border:1px solid #332d22;background:#141210;color:#c7bba3;font-size:11px; }`

Find: `.canvas-actions .primary { margin-left:auto;background:#1a3736;border-color:#1a3736;color:#fff;padding-inline:19px; }`
Replace: `.canvas-actions .primary { margin-left:auto;background:#c9a355;border-color:#c9a355;color:#141210;padding-inline:19px; }`

Find: `.canvas-actions .primary span { margin-left:12px;color:var(--blue);font-size:16px; }`
Replace: `.canvas-actions .primary span { margin-left:12px;color:#14121099;font-size:16px; }`

Find: `.notice { position:absolute;z-index:8;left:50%;bottom:82px;transform:translateX(-50%);padding:11px 15px;background:#1a3534;color:#fff;font-size:11px;box-shadow:0 10px 26px #1e363430; }`
Replace: `.notice { position:absolute;z-index:8;left:50%;bottom:82px;transform:translateX(-50%);padding:11px 15px;background:#1c1916;color:#f1ece0;font-size:11px;box-shadow:0 10px 26px #00000060; }`

Find: `.notice button { margin-left:14px;border:0;background:transparent;color:#9be6e0;font-size:16px; }`
Replace: `.notice button { margin-left:14px;border:0;background:transparent;color:#c9a355;font-size:16px; }`

- [ ] **Step 5: Build and spot-check**

Run: `npm run build:pages`
Expected: succeeds. Screenshot `http://localhost:8899/crystal/men/` studio view (desktop viewport, after clicking past the landing CTA) to `dark-theme-progress-1.png` and view it. Expected at this point: the studio header, canvas panel background, and action buttons read dark/gold — the right-hand materials drawer and landing page are still light (Task 7 handles those). This is an expected intermediate state, not a bug.

- [ ] **Step 6: Commit**

```bash
git add app-men/globals.css
git commit -m "Dark-theme the men's studio shell chrome (root tokens, header, canvas, actions)"
```

---

### Task 7: Dark theme — materials drawer, energy panel, checkout, guide modal, and landing page

**Files:**
- Modify: `app-men/globals.css`

- [ ] **Step 1: Materials drawer**

Find: `.materials-panel { position:relative;display:flex;flex-direction:column;min-height:820px;overflow:hidden;background:#fff;border-left:1px solid var(--line); }.materials-head { padding:30px 32px 22px;background:linear-gradient(125deg,#fff 0 64%,#e6faf8 140%); }.materials-head p,.selected-detail p { margin:0 0 10px;color:#38aaa6;font-size:9px;letter-spacing:.19em; }.materials-head h1 { margin:0;color:#203434;font:31px/1.18 Georgia,"Noto Serif TC",serif;letter-spacing:.02em; }.materials-head h1 em { color:#168e8a;font-style:italic; }.materials-head>span { display:block;margin-top:13px;max-width:370px;color:#81918f;font-size:11px;line-height:1.7; }.tabs { display:grid;grid-template-columns:repeat(3,1fr);padding:0 20px;border-bottom:1px solid var(--line); }.tabs button { padding:15px 5px 13px;border:0;border-bottom:2px solid transparent;background:transparent;color:#7a8e8b;font-size:11px; }.tabs .active { border-color:#27a7a3;color:#127b77;font-weight:bold; }.search { display:flex;align-items:center;gap:9px;margin:16px 24px 4px;padding:10px 12px;border:1px solid #e6eeec;background:#fafcfb;color:#7da29e; }.search input { width:100%;border:0;outline:0;background:transparent;color:#48615e;font-size:11px; }.material-grid { flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;overflow:auto;padding:12px 24px 18px; }.material-card { min-height:151px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px 4px;border:1px solid #edf0ef;background:#fff;color:#344948;transition:.16s; }.material-card:hover,.material-card.selected { border-color:#89d8d2;box-shadow:0 9px 18px #159d9b12;transform:translateY(-2px); }.visual-wrap { position:relative;display:grid;place-items:center;width:56px;height:60px; }.visual-wrap>span { position:absolute;right:-5px;bottom:1px;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#fff;color:#11908b;box-shadow:0 2px 7px #2b656132;font-size:15px; }.material-card b { margin-top:8px;font-size:11px; }.material-card small { display:block;max-width:95%;margin-top:3px;overflow:hidden;color:#9aa8a6;font-size:8px;text-overflow:ellipsis;white-space:nowrap; }.material-card em { margin-top:6px;color:#269e99;font-size:9px;font-style:normal; }.selected-detail { display:grid;grid-template-columns:68px 1fr auto;gap:12px;align-items:center;padding:16px 24px;border-top:1px solid var(--line);background:#f7fcfb; }.detail-visual { display:grid;place-items:center;width:64px;height:64px;background:#fff;border-radius:50%;box-shadow:0 5px 12px #377c7514; }.selected-detail p { margin-bottom:5px;font-size:8px; }.selected-detail b { display:block;color:#294340;font:15px Georgia,"Noto Serif TC",serif; }.selected-detail span { display:block;margin-top:5px;color:#83918f;font-size:9px;line-height:1.5; }.selected-detail>button { border:0;background:#1a3c3a;color:#fff;padding:10px;font-size:10px;white-space:nowrap; }.selected-detail strong { color:#80e2dc;font-size:14px; }.atelier-note { padding:86px 20px;text-align:center;color:#fff;background:#48bbb5 url('/crystal-hero.png') center/cover;background-blend-mode:soft-light; }.atelier-note p { margin:0;color:#e7ffff;font-size:9px;letter-spacing:.25em; }.atelier-note h2 { margin:15px 0;color:#fff;font:34px Georgia,"Noto Serif TC",serif; }.atelier-note span { display:block;max-width:570px;margin:auto;color:#edffff;font-size:12px;line-height:1.8; }`

Replace:
```css
.materials-panel { position:relative;display:flex;flex-direction:column;min-height:820px;overflow:hidden;background:#0f0e0c;border-left:1px solid var(--line); }.materials-head { padding:30px 32px 22px;background:linear-gradient(125deg,#141210 0 64%,#1c1712 140%); }.materials-head p,.selected-detail p { margin:0 0 10px;color:#c9a355;font-size:9px;letter-spacing:.19em; }.materials-head h1 { margin:0;color:#f1ece0;font:31px/1.18 Georgia,"Noto Serif TC",serif;letter-spacing:.02em; }.materials-head h1 em { color:#e3c179;font-style:italic; }.materials-head>span { display:block;margin-top:13px;max-width:370px;color:#a89c86;font-size:11px;line-height:1.7; }.tabs { display:grid;grid-template-columns:repeat(3,1fr);padding:0 20px;border-bottom:1px solid var(--line); }.tabs button { padding:15px 5px 13px;border:0;border-bottom:2px solid transparent;background:transparent;color:#8f8672;font-size:11px; }.tabs .active { border-color:#c9a355;color:#e3c179;font-weight:bold; }.search { display:flex;align-items:center;gap:9px;margin:16px 24px 4px;padding:10px 12px;border:1px solid #2b2720;background:#141210;color:#a89c86; }.search input { width:100%;border:0;outline:0;background:transparent;color:#d8cdb8;font-size:11px; }.material-grid { flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;overflow:auto;padding:12px 24px 18px; }.material-card { min-height:151px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px 4px;border:1px solid #2b2720;background:#121110;color:#e3ddcd;transition:.16s; }.material-card:hover,.material-card.selected { border-color:#c9a355;box-shadow:0 9px 18px #c9a35522;transform:translateY(-2px); }.visual-wrap { position:relative;display:grid;place-items:center;width:56px;height:60px; }.visual-wrap>span { position:absolute;right:-5px;bottom:1px;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#1c1916;color:#c9a355;box-shadow:0 2px 7px #00000055;font-size:15px; }.material-card b { margin-top:8px;font-size:11px; }.material-card small { display:block;max-width:95%;margin-top:3px;overflow:hidden;color:#8f8672;font-size:8px;text-overflow:ellipsis;white-space:nowrap; }.material-card em { margin-top:6px;color:#c9a355;font-size:9px;font-style:normal; }.selected-detail { display:grid;grid-template-columns:68px 1fr auto;gap:12px;align-items:center;padding:16px 24px;border-top:1px solid var(--line);background:#100f0d; }.detail-visual { display:grid;place-items:center;width:64px;height:64px;background:#141210;border-radius:50%;box-shadow:0 5px 12px #00000055; }.selected-detail p { margin-bottom:5px;font-size:8px; }.selected-detail b { display:block;color:#f1ece0;font:15px Georgia,"Noto Serif TC",serif; }.selected-detail span { display:block;margin-top:5px;color:#a89c86;font-size:9px;line-height:1.5; }.selected-detail>button { border:0;background:#c9a355;color:#141210;padding:10px;font-size:10px;white-space:nowrap; }.selected-detail strong { color:#141210cc;font-size:14px; }.atelier-note { padding:86px 20px;text-align:center;color:#fff;background:#141210 url('/crystal-hero.png') center/cover;background-blend-mode:overlay; }.atelier-note p { margin:0;color:#e3c179;font-size:9px;letter-spacing:.25em; }.atelier-note h2 { margin:15px 0;color:#fff;font:34px Georgia,"Noto Serif TC",serif; }.atelier-note span { display:block;max-width:570px;margin:auto;color:#d8cdb8;font-size:12px;line-height:1.8; }
```

- [ ] **Step 2: Center-intention glow, wrist-select, preset row, crystal-card, and mobile drawer background**

Find: `.center-intention small { color:#299b98; font-size:9px; letter-spacing:.3em; line-height:1.6; }`
Replace: `.center-intention small { color:#c9a355; font-size:9px; letter-spacing:.3em; line-height:1.6; }`

Find: `.center-intention b { color:#b9891e; font:600 clamp(19px,2.4vw,26px) Georgia,serif; letter-spacing:.15em; text-shadow:0 0 10px #fff,0 0 10px #fff,0 0 16px #ffd76aa0,0 0 40px #ffd76a4d; }`
Replace: `.center-intention b { color:#e3c179; font:600 clamp(19px,2.4vw,26px) Georgia,serif; letter-spacing:.15em; text-shadow:0 0 14px #ffd76a90,0 0 40px #ffd76a55; }`

Find: `.center-intention .ci-score { color:#8a6d1f; font:500 16px Georgia,serif; letter-spacing:.06em; text-shadow:0 0 8px #fff,0 0 14px #ffd76a80; }`
Replace: `.center-intention .ci-score { color:#e3c179; font:500 16px Georgia,serif; letter-spacing:.06em; text-shadow:0 0 14px #ffd76a70; }`

Find: `.center-intention .ci-note { margin-top:3px; color:#8ba39f; font-size:9px; letter-spacing:.16em; line-height:1.5; }`
Replace: `.center-intention .ci-note { margin-top:3px; color:#a89c86; font-size:9px; letter-spacing:.16em; line-height:1.5; }`

Find: `.wrist-select { border:0; background:transparent; color:#2a3f3e; font:500 15px Georgia,serif; padding:0 2px 0 0; cursor:pointer; outline:none; }`
Replace: `.wrist-select { border:0; background:transparent; color:#f1ece0; font:500 15px Georgia,serif; padding:0 2px 0 0; cursor:pointer; outline:none; }`

Find: `.wrist-select:hover { color:#0d7f7c; }`
Replace: `.wrist-select:hover { color:#e3c179; }`

Find: `.preset-row > span { color:#8a9c99; font-size:9px; letter-spacing:.14em; line-height:1.5; white-space:nowrap; }`
Replace: `.preset-row > span { color:#a89c86; font-size:9px; letter-spacing:.14em; line-height:1.5; white-space:nowrap; }`

Find: `.preset-row button { flex:1; padding:9px 4px; border:1px solid #e6dcc2; border-radius:999px; background:linear-gradient(150deg,#fffdf4,#faf3df); color:#7a5e1c; font-size:11px; white-space:nowrap; transition:.15s; }`
Replace: `.preset-row button { flex:1; padding:9px 4px; border:1px solid #3a331f; border-radius:999px; background:linear-gradient(150deg,#1c1712,#141009); color:#e3c179; font-size:11px; white-space:nowrap; transition:.15s; }`

Find: `.materials-panel { position:fixed; left:0; right:0; bottom:0; z-index:40; min-height:0; height:auto; border-left:0; border-top:1px solid var(--line); border-radius:16px 16px 0 0; box-shadow:0 -14px 34px #1a3c3a1f; background:#fff; padding-bottom:env(safe-area-inset-bottom); }`
Replace: `.materials-panel { position:fixed; left:0; right:0; bottom:0; z-index:40; min-height:0; height:auto; border-left:0; border-top:1px solid var(--line); border-radius:16px 16px 0 0; box-shadow:0 -14px 34px #00000060; background:#0f0e0c; padding-bottom:env(safe-area-inset-bottom); }`

Find: `.drawer-handle i { width:34px; height:4px; border-radius:99px; background:#d7e2df; }`
Replace: `.drawer-handle i { width:34px; height:4px; border-radius:99px; background:#3a331f; }`

Find: `.drawer-handle span { color:#7a938f; font-size:9px; letter-spacing:.1em; }`
Replace: `.drawer-handle span { color:#8f8672; font-size:9px; letter-spacing:.1em; }`

Find: `.materials-panel.collapsed { box-shadow:0 -6px 18px #1a3c3a14; }`
Replace: `.materials-panel.collapsed { box-shadow:0 -6px 18px #00000055; }`

- [ ] **Step 3: Checkout**

Find: `.co-back { border:0; background:transparent; color:#3d8a86; font-size:12px; letter-spacing:.08em; padding:10px 0; }`
Replace: `.co-back { border:0; background:transparent; color:#c9a355; font-size:12px; letter-spacing:.08em; padding:10px 0; }`

Find: `.co-back:hover { color:#1a3c3a; }`
Replace: `.co-back:hover { color:#f1ece0; }`

Find: `.co-eyebrow { margin:0 0 10px; color:#38aaa6; font-size:9px; letter-spacing:.22em; }`
Replace: `.co-eyebrow { margin:0 0 10px; color:#c9a355; font-size:9px; letter-spacing:.22em; }`

Find: `.checkout h2 { margin:0 0 16px; color:#203434; font:26px Georgia,"Noto Serif TC",serif; }`
Replace: `.checkout h2 { margin:0 0 16px; color:#f1ece0; font:26px Georgia,"Noto Serif TC",serif; }`

Find: `.co-summary { padding:24px 24px 20px; background:#fbfdfc; border:1px solid #e3edeb; border-radius:14px; }`
Replace: `.co-summary { padding:24px 24px 20px; background:#100f0d; border:1px solid #2b2720; border-radius:14px; }`

Find: `.co-energy-chip { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px; margin-bottom:16px; padding:11px 14px; border-radius:10px; color:#e8fffb; background:linear-gradient(150deg,#143331,#0c2321); font-size:11px; }`
Replace: `.co-energy-chip { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px; margin-bottom:16px; padding:11px 14px; border-radius:10px; color:#e3ddcd; background:linear-gradient(150deg,#1c1712,#0d0c0a); font-size:11px; }`

Find: `.co-line { display:grid; grid-template-columns:44px 1fr auto auto; gap:10px; align-items:center; padding:9px 0; border-bottom:1px dashed #e4edeb; }`
Replace: `.co-line { display:grid; grid-template-columns:44px 1fr auto auto; gap:10px; align-items:center; padding:9px 0; border-bottom:1px dashed #2b2720; }`

Find: `.co-visual { display:grid; place-items:center; width:42px; height:42px; background:#fff; border:1px solid #edf3f1; border-radius:50%; overflow:hidden; }`
Replace: `.co-visual { display:grid; place-items:center; width:42px; height:42px; background:#141210; border:1px solid #2b2720; border-radius:50%; overflow:hidden; }`

Find: `.co-name { color:#2d4441; font-size:12px; }`
Replace: `.co-name { color:#f1ece0; font-size:12px; }`

Find: `.co-name i { display:block; margin-top:2px; color:#8fa4a0; font-size:9px; font-style:normal; }`
Replace: `.co-name i { display:block; margin-top:2px; color:#a89c86; font-size:9px; font-style:normal; }`

Find: `.co-qty { color:#7d9490; font-size:11px; }`
Replace: `.co-qty { color:#a89c86; font-size:11px; }`

Find: `.co-line > b { color:#20514e; font-size:12px; }`
Replace: `.co-line > b { color:#f1ece0; font-size:12px; }`

Find: `.co-fees > div { display:flex; justify-content:space-between; color:#67807c; font-size:11px; }`
Replace: `.co-fees > div { display:flex; justify-content:space-between; color:#b8ab90; font-size:11px; }`

Find: `.co-fees b { color:#2d4441; font-weight:500; }`
Replace: `.co-fees b { color:#f1ece0; font-weight:500; }`

Find: `.co-grand { margin-top:4px; padding-top:12px; border-top:1px solid #dce9e6; }`
Replace: `.co-grand { margin-top:4px; padding-top:12px; border-top:1px solid #2b2720; }`

Find: `.co-grand span { color:#203434 !important; font-size:12px !important; }`
Replace: `.co-grand span { color:#f1ece0 !important; font-size:12px !important; }`

Find: `.co-grand b { color:#0d7f7c !important; font:600 20px Georgia,serif !important; }`
Replace: `.co-grand b { color:#e3c179 !important; font:600 20px Georgia,serif !important; }`

Find: `.co-form { padding:24px 26px 26px; background:#fff; border:1px solid #e3edeb; border-radius:14px; }`
Replace: `.co-form { padding:24px 26px 26px; background:#100f0d; border:1px solid #2b2720; border-radius:14px; }`

Find: `.co-fields span { color:#5d7773; font-size:10px; letter-spacing:.06em; }`
Replace: `.co-fields span { color:#a89c86; font-size:10px; letter-spacing:.06em; }`

Find: `.co-fields input,.co-fields select,.co-fields textarea { padding:11px 12px; border:1px solid #dbe7e4; border-radius:8px; background:#fbfdfc; color:#26403d; font-size:13px; outline:none; transition:border-color .15s,box-shadow .15s; }`
Replace: `.co-fields input,.co-fields select,.co-fields textarea { padding:11px 12px; border:1px solid #2b2720; border-radius:8px; background:#141210; color:#f1ece0; font-size:13px; outline:none; transition:border-color .15s,box-shadow .15s; }`

Find: `.co-fields input:focus,.co-fields select:focus,.co-fields textarea:focus { border-color:#48bbb5; box-shadow:0 0 0 3px #48bbb522; background:#fff; }`
Replace: `.co-fields input:focus,.co-fields select:focus,.co-fields textarea:focus { border-color:#c9a355; box-shadow:0 0 0 3px #c9a35522; background:#181410; }`

Find: `.co-fields .err input { border-color:#d67878; background:#fff8f8; }`
Replace: `.co-fields .err input { border-color:#d67878; background:#241412; }`

Find: `.co-pay { display:flex; flex-direction:column; align-items:flex-start; gap:3px; padding:13px 14px; border:1.5px solid #e0eae8; border-radius:11px; background:#fbfdfc; text-align:left; transition:.15s; }`
Replace: `.co-pay { display:flex; flex-direction:column; align-items:flex-start; gap:3px; padding:13px 14px; border:1.5px solid #2b2720; border-radius:11px; background:#100f0d; text-align:left; transition:.15s; }`

Find: `.co-pay:hover { border-color:#9ed8d3; }`
Replace: `.co-pay:hover { border-color:#7a6f4c; }`

Find: `.co-pay.active { border-color:#2aa39e; background:#f2fbfa; box-shadow:0 4px 14px #1a4c4914; }`
Replace: `.co-pay.active { border-color:#c9a355; background:#181410; box-shadow:0 4px 14px #c9a35522; }`

Find: `.co-pay b { color:#24403d; font-size:12px; }`
Replace: `.co-pay b { color:#f1ece0; font-size:12px; }`

Find: `.co-pay i { color:#8ba39f; font-size:9px; font-style:normal; }`
Replace: `.co-pay i { color:#a89c86; font-size:9px; font-style:normal; }`

Find: `.co-primary { border:0; background:#1a3736; color:#fff; padding:15px 22px; border-radius:9px; font-size:14px; letter-spacing:.04em; transition:.15s; }`
Replace: `.co-primary { border:0; background:#c9a355; color:#141210; padding:15px 22px; border-radius:9px; font-size:14px; letter-spacing:.04em; transition:.15s; }`

Find: `.co-primary:hover { background:#0f2a29; transform:translateY(-1px); box-shadow:0 8px 20px #1a373633; }`
Replace: `.co-primary:hover { background:#e3c179; transform:translateY(-1px); box-shadow:0 8px 20px #c9a35544; }`

Find: `.co-primary span { margin-left:10px; color:#7fd8d2; }`
Replace: `.co-primary span { margin-left:10px; color:#141210cc; }`

Find: `.co-secondary { border:1px solid #cfe2df; background:#fff; color:#3d6360; padding:15px 22px; border-radius:9px; font-size:13px; transition:.15s; }`
Replace: `.co-secondary { border:1px solid #332d22; background:#141210; color:#c7bba3; padding:15px 22px; border-radius:9px; font-size:13px; transition:.15s; }`

Find: `.co-secondary:hover { border-color:#48bbb5; color:#1a3c3a; }`
Replace: `.co-secondary:hover { border-color:#c9a355; color:#f1ece0; }`

Find: `.co-tip { margin:12px 0 0; text-align:center; color:#93a8a4; font-size:10px; }`
Replace: `.co-tip { margin:12px 0 0; text-align:center; color:#a89c86; font-size:10px; }`

Find: `.done-card { width:min(620px,100%); padding:44px 40px; text-align:center; background:#fff; border:1px solid #e3edeb; border-radius:18px; box-shadow:0 24px 60px #16413e12; }`
Replace: `.done-card { width:min(620px,100%); padding:44px 40px; text-align:center; background:#100f0d; border:1px solid #2b2720; border-radius:18px; box-shadow:0 24px 60px #00000070; }`

Find: `.done-mark { width:64px; height:64px; margin:0 auto 18px; display:grid; place-items:center; border-radius:50%; background:linear-gradient(150deg,#48bbb5,#1f8d88); color:#fff; font-size:30px; animation:done-pop .5s cubic-bezier(.2,1.4,.4,1); }`
Replace: `.done-mark { width:64px; height:64px; margin:0 auto 18px; display:grid; place-items:center; border-radius:50%; background:linear-gradient(150deg,#c9a355,#8a6d1f); color:#141210; font-size:30px; animation:done-pop .5s cubic-bezier(.2,1.4,.4,1); }`

Find: `.done-eyebrow { margin:0; color:#38aaa6; font-size:9px; letter-spacing:.26em; }`
Replace: `.done-eyebrow { margin:0; color:#c9a355; font-size:9px; letter-spacing:.26em; }`

Find: `.done-card h1 { margin:8px 0 12px; color:#203434; font:30px Georgia,"Noto Serif TC",serif; }`
Replace: `.done-card h1 { margin:8px 0 12px; color:#f1ece0; font:30px Georgia,"Noto Serif TC",serif; }`

Find: `.done-order-id { display:inline-block; padding:7px 18px; border-radius:999px; background:#f0faf9; border:1px dashed #7fccc7; color:#0d7f7c; font:600 14px Georgia,serif; letter-spacing:.1em; }`
Replace: `.done-order-id { display:inline-block; padding:7px 18px; border-radius:999px; background:#181410; border:1px dashed #7a6f4c; color:#e3c179; font:600 14px Georgia,serif; letter-spacing:.1em; }`

Find: `.done-note { max-width:420px; margin:16px auto 22px; color:#7d9490; font-size:12px; line-height:1.75; }`
Replace: `.done-note { max-width:420px; margin:16px auto 22px; color:#a89c86; font-size:12px; line-height:1.75; }`

Find: `.done-summary { text-align:left; border-top:1px solid #e8f0ee; }`
Replace: `.done-summary { text-align:left; border-top:1px solid #2b2720; }`

Find: `.done-line { display:grid; grid-template-columns:40px 1fr auto auto; gap:10px; align-items:center; padding:8px 0; border-bottom:1px dashed #e8f0ee; }`
Replace: `.done-line { display:grid; grid-template-columns:40px 1fr auto auto; gap:10px; align-items:center; padding:8px 0; border-bottom:1px dashed #2b2720; }`

Find: `.dl-name { color:#2d4441; font-size:12px; }`
Replace: `.dl-name { color:#f1ece0; font-size:12px; }`

Find: `.dl-name i { display:block; color:#8fa4a0; font-size:9px; font-style:normal; }`
Replace: `.dl-name i { display:block; color:#a89c86; font-size:9px; font-style:normal; }`

Find: `.dl-qty { color:#7d9490; font-size:11px; }`
Replace: `.dl-qty { color:#a89c86; font-size:11px; }`

Find: `.done-line > b { color:#20514e; font-size:12px; }`
Replace: `.done-line > b { color:#f1ece0; font-size:12px; }`

Find: `.done-line.fee .dl-name,.done-line.fee > b { color:#67807c; font-size:11px; font-weight:400; }`
Replace: `.done-line.fee .dl-name,.done-line.fee > b { color:#b8ab90; font-size:11px; font-weight:400; }`

Find: `.done-line.total { border-top:1px solid #dce9e6; border-bottom:0; margin-top:4px; }`
Replace: `.done-line.total { border-top:1px solid #2b2720; border-bottom:0; margin-top:4px; }`

Find: `.done-line.total > b { color:#0d7f7c; font:600 18px Georgia,serif; }`
Replace: `.done-line.total > b { color:#e3c179; font:600 18px Georgia,serif; }`

Find: `.done-energy { margin:16px 0 24px; padding:11px; border-radius:10px; background:#143331; color:#cfe9e5; font-size:11px; }`
Replace: `.done-energy { margin:16px 0 24px; padding:11px; border-radius:10px; background:#1c1712; color:#e3ddcd; font-size:11px; }`

- [ ] **Step 4: Design guide modal**

Find: `.guide-modal { position:relative; width:min(600px,90%); max-height:90vh; background:white; border-radius:16px; padding:40px 32px; box-shadow:0 25px 50px rgba(0,0,0,0.3); animation:slideUp 0.4s ease; overflow-y:auto; }`
Replace: `.guide-modal { position:relative; width:min(600px,90%); max-height:90vh; background:#100f0d; border-radius:16px; padding:40px 32px; box-shadow:0 25px 50px rgba(0,0,0,0.5); animation:slideUp 0.4s ease; overflow-y:auto; }`

Find: `.guide-close { position:absolute; top:16px; right:16px; width:32px; height:32px; border:0; background:transparent; font-size:20px; cursor:pointer; color:#999; transition:color 0.2s; }`
Replace: `.guide-close { position:absolute; top:16px; right:16px; width:32px; height:32px; border:0; background:transparent; font-size:20px; cursor:pointer; color:#a89c86; transition:color 0.2s; }`

Find: `.guide-close:hover { color:#333; }`
Replace: `.guide-close:hover { color:#f1ece0; }`

Find: `.guide-index { display:block; margin-bottom:10px; color:#c7dedb; font:400 40px/1 Georgia,serif; }`
Replace: `.guide-index { display:block; margin-bottom:10px; color:#7a6f4c; font:400 40px/1 Georgia,serif; }`

Find: `.guide-content h1 { margin:0 0 8px; color:#1a3c3a; font:600 28px Georgia,serif; }`
Replace: `.guide-content h1 { margin:0 0 8px; color:#f1ece0; font:600 28px Georgia,serif; }`

Find: `.guide-content h2 { margin:0 0 16px; color:#48bbb5; font:400 16px; }`
Replace: `.guide-content h2 { margin:0 0 16px; color:#c9a355; font:400 16px; }`

Find: `.guide-content p { margin:0; color:#666; font-size:14px; line-height:1.6; max-width:400px; margin:auto; }`
Replace: `.guide-content p { margin:0; color:#b8ab90; font-size:14px; line-height:1.6; max-width:400px; margin:auto; }`

Find: `.progress-dots .dot { width:8px; height:8px; border:0; border-radius:50%; background:#ddd; cursor:pointer; transition:all 0.2s; }`
Replace: `.progress-dots .dot { width:8px; height:8px; border:0; border-radius:50%; background:#332d22; cursor:pointer; transition:all 0.2s; }`

Find: `.progress-dots .dot.active { background:#48bbb5; transform:scale(1.3); }`
Replace: `.progress-dots .dot.active { background:#c9a355; transform:scale(1.3); }`

Find: `.progress-text { font-size:12px; color:#999; min-width:40px; }`
Replace: `.progress-text { font-size:12px; color:#a89c86; min-width:40px; }`

Find: `.btn-primary { background:#48bbb5; color:white; }`
Replace: `.btn-primary { background:#c9a355; color:#141210; }`

Find: `.btn-primary:hover { background:#2d9a91; transform:translateY(-2px); box-shadow:0 4px 12px rgba(72,187,181,0.3); }`
Replace: `.btn-primary:hover { background:#e3c179; transform:translateY(-2px); box-shadow:0 4px 12px rgba(201,163,85,0.35); }`

Find: `.btn-secondary { background:#f0f0f0; color:#333; }`
Replace: `.btn-secondary { background:#1c1916; color:#e3ddcd; }`

Find: `.btn-secondary:hover { background:#e0e0e0; }`
Replace: `.btn-secondary:hover { background:#262019; }`

- [ ] **Step 5: 360° preview overlay**

Find: `.preview-overlay { position:fixed; inset:0; z-index:80; display:flex; flex-direction:column; background:radial-gradient(circle at 50% 40%, #ffffff 0%, #fbfdfc 55%, #eef4f2 100%); animation:fadeIn .3s ease; }`
Replace: `.preview-overlay { position:fixed; inset:0; z-index:80; display:flex; flex-direction:column; background:radial-gradient(circle at 50% 40%, #141210 0%, #0d0c0a 55%, #080706 100%); animation:fadeIn .3s ease; }`

Find: `.pv-head span { color:#7d9995; font-size:10px; letter-spacing:.24em; }`
Replace: `.pv-head span { color:#a89c86; font-size:10px; letter-spacing:.24em; }`

Find: `.pv-sound { margin-left:auto; width:34px; height:34px; border:1px solid #dbe7e4; border-radius:50%; background:#fff; font-size:13px; transition:.15s; }`
Replace: `.pv-sound { margin-left:auto; width:34px; height:34px; border:1px solid #2b2720; border-radius:50%; background:#141210; font-size:13px; transition:.15s; }`

Find: `.pv-sound:hover { border-color:#48bbb5; }`
Replace: `.pv-sound:hover { border-color:#c9a355; }`

Find: `.pv-close { width:34px; height:34px; border:1px solid #dbe7e4; border-radius:50%; background:#fff; color:#4e6a66; font-size:14px; transition:.15s; }`
Replace: `.pv-close { width:34px; height:34px; border:1px solid #2b2720; border-radius:50%; background:#141210; color:#c7bba3; font-size:14px; transition:.15s; }`

Find: `.pv-close:hover { border-color:#48bbb5; color:#1a3c3a; }`
Replace: `.pv-close:hover { border-color:#c9a355; color:#f1ece0; }`

Find: `.pv-hint { padding:0 18px calc(18px + env(safe-area-inset-bottom)); text-align:center; color:#8ba39f; font-size:10px; letter-spacing:.12em; }`
Replace: `.pv-hint { padding:0 18px calc(18px + env(safe-area-inset-bottom)); text-align:center; color:#a89c86; font-size:10px; letter-spacing:.12em; }`

Find: `.canvas-actions .pv-open { border-color:#c9a355; color:#8a6d1f; background:#fffdf5; }`
Replace: `.canvas-actions .pv-open { border-color:#c9a355; color:#e3c179; background:#141210; }`

Find: `.canvas-actions .pv-open:hover { background:#fdf6e3; }`
Replace: `.canvas-actions .pv-open:hover { background:#1c1712; }`

- [ ] **Step 6: Landing page**

Find: `.landing { background:#fff; color:var(--ink); overflow-x:clip; }`
Replace: `.landing { background:#0a0906; color:var(--ink); overflow-x:clip; }`

Find: `.landing-nav { position:fixed; top:0; left:0; right:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:74px; padding:0 clamp(20px,5vw,64px); background:#ffffffee; border-bottom:1px solid #ffffff00; transition:background .25s,border-color .25s; }`
Replace: `.landing-nav { position:fixed; top:0; left:0; right:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:74px; padding:0 clamp(20px,5vw,64px); background:#0a0906ee; border-bottom:1px solid #00000000; transition:background .25s,border-color .25s; }`

Find: `.landing-nav-cta { padding:10px 20px; border:1px solid #1a3736; border-radius:999px; background:#1a3736; color:#fff; font-size:12px; letter-spacing:.06em; transition:.2s; }`
Replace: `.landing-nav-cta { padding:10px 20px; border:1px solid #c9a355; border-radius:999px; background:#c9a355; color:#141210; font-size:12px; letter-spacing:.06em; transition:.2s; }`

Find: `.landing-nav-cta:hover { background:#0f2a29; transform:translateY(-1px); }`
Replace: `.landing-nav-cta:hover { background:#e3c179; transform:translateY(-1px); }`

Find: `.landing-hero:before { content:""; position:absolute; inset:0; background:linear-gradient(200deg,#0b201e05 10%,#0b201ec2 68%,#0b201ee8); }`
Replace: `.landing-hero:before { content:""; position:absolute; inset:0; background:linear-gradient(200deg,#08060405 10%,#080604c2 68%,#080604e8); }`

Find: `.landing-hero-copy p { margin:0 0 18px; color:#8fe0d8; font-size:11px; letter-spacing:.34em; }`
Replace: `.landing-hero-copy p { margin:0 0 18px; color:#e3c179; font-size:11px; letter-spacing:.34em; }`

Find: `.landing-cta { display:inline-flex; align-items:center; gap:12px; padding:16px 28px; border:0; border-radius:999px; background:#ffd76a; color:#1a3c3a; font:600 13px/1 Arial,"Noto Sans TC",sans-serif; letter-spacing:.06em; box-shadow:0 14px 30px #ffd76a3d; transition:.22s; }`
Replace: `.landing-cta { display:inline-flex; align-items:center; gap:12px; padding:16px 28px; border:0; border-radius:999px; background:#c9a355; color:#141210; font:600 13px/1 Arial,"Noto Sans TC",sans-serif; letter-spacing:.06em; box-shadow:0 14px 30px #c9a35544; transition:.22s; }`

Find: `.landing-cta:hover { background:#ffe08a; transform:translateY(-2px); box-shadow:0 18px 36px #ffd76a55; }`
Replace: `.landing-cta:hover { background:#e3c179; transform:translateY(-2px); box-shadow:0 18px 36px #c9a35566; }`

Find: `.landing-cta.light { background:#1a3736; color:#fff; box-shadow:0 14px 30px #1a373633; }`
Replace: `.landing-cta.light { background:#141210; color:#f1ece0; box-shadow:0 14px 30px #00000060; }`

Find: `.landing-cta.light:hover { background:#0f2a29; }`
Replace: `.landing-cta.light:hover { background:#1c1712; }`

Find: `.landing-eyebrow { margin:0 0 12px; color:#38aaa6; font-size:10px; letter-spacing:.3em; text-align:center; }`
Replace: `.landing-eyebrow { margin:0 0 12px; color:#c9a355; font-size:10px; letter-spacing:.3em; text-align:center; }`

Find: `.landing-showcase h2 { margin:0 auto 52px; max-width:560px; color:#1c3532; font:38px/1.35 Georgia,"Noto Serif TC",serif; }`
Replace: `.landing-showcase h2 { margin:0 auto 52px; max-width:560px; color:#f1ece0; font:38px/1.35 Georgia,"Noto Serif TC",serif; }`

Find: `.landing-features-head h2 { margin:14px 0 0; color:#1c3532; font:40px/1.32 Georgia,"Noto Serif TC",serif; }`
Replace: `.landing-features-head h2 { margin:14px 0 0; color:#f1ece0; font:40px/1.32 Georgia,"Noto Serif TC",serif; }`

Find: `.landing-feature-list { border-top:1px solid #dfe8e5; }`
Replace: `.landing-feature-list { border-top:1px solid #2b2720; }`

Find: `.landing-feature-row { display:grid; grid-template-columns:52px 1fr; gap:20px; padding:28px 0; border-bottom:1px solid #dfe8e5; }`
Replace: `.landing-feature-row { display:grid; grid-template-columns:52px 1fr; gap:20px; padding:28px 0; border-bottom:1px solid #2b2720; }`

Find: `.lf-index { color:#b9d4d0; font:400 26px/1 Georgia,serif; letter-spacing:.02em; }`
Replace: `.lf-index { color:#7a6f4c; font:400 26px/1 Georgia,serif; letter-spacing:.02em; }`

Find: `.lf-body b { display:block; margin-bottom:8px; color:#1c3532; font:600 16px Georgia,"Noto Serif TC",serif; }`
Replace: `.lf-body b { display:block; margin-bottom:8px; color:#f1ece0; font:600 16px Georgia,"Noto Serif TC",serif; }`

Find: `.lf-body p { margin:0; color:#6d827e; font-size:12.5px; line-height:1.85; max-width:38em; }`
Replace: `.lf-body p { margin:0; color:#a89c86; font-size:12.5px; line-height:1.85; max-width:38em; }`

Find: `.landing-presets h2 { margin:0 0 44px; color:#1c3532; font:32px/1.4 Georgia,"Noto Serif TC",serif; }`
Replace: `.landing-presets h2 { margin:0 0 44px; color:#f1ece0; font:32px/1.4 Georgia,"Noto Serif TC",serif; }`

Find: `.landing-preset-list { border-top:1px solid #e6dcc2; }`
Replace: `.landing-preset-list { border-top:1px solid #2b2720; }`

Find: `.landing-preset { display:grid; grid-template-columns:52px 1fr auto; align-items:center; gap:18px; width:100%; padding:20px 4px; border:0; border-bottom:1px solid #e6dcc2; background:transparent; text-align:left; transition:.18s; }`
Replace: `.landing-preset { display:grid; grid-template-columns:52px 1fr auto; align-items:center; gap:18px; width:100%; padding:20px 4px; border:0; border-bottom:1px solid #2b2720; background:transparent; text-align:left; transition:.18s; }`

Find: `.landing-preset:hover { background:#fdf9ee; padding-inline:14px; }`
Replace: `.landing-preset:hover { background:#141210; padding-inline:14px; }`

Find: `.lp-text b { display:block; margin-bottom:4px; color:#4a3814; font:600 15px Georgia,"Noto Serif TC",serif; }`
Replace: `.lp-text b { display:block; margin-bottom:4px; color:#f1ece0; font:600 15px Georgia,"Noto Serif TC",serif; }`

Find: `.lp-text i { color:#8a734a; font-size:11.5px; font-style:normal; }`
Replace: `.lp-text i { color:#a89c86; font-size:11.5px; font-style:normal; }`

Find: `.lp-arrow { color:#b9891e; font-size:11px; letter-spacing:.04em; white-space:nowrap; }`
Replace: `.lp-arrow { color:#e3c179; font-size:11px; letter-spacing:.04em; white-space:nowrap; }`

Find: `.ls-item:hover { background:#f5fbfa; transform:translateY(-3px); }`
Replace: `.ls-item:hover { background:#141210; transform:translateY(-3px); }`

Find: `.ls-item b { color:#243b38; font-size:12.5px; }`
Replace: `.ls-item b { color:#f1ece0; font-size:12.5px; }`

Find: `.ls-item span { color:#93a8a4; font-size:10px; letter-spacing:.04em; }`
Replace: `.ls-item span { color:#a89c86; font-size:10px; letter-spacing:.04em; }`

Find: `.landing-quote { padding:clamp(70px,12vw,150px) 22px; text-align:center; color:#fff; background:radial-gradient(circle at 30% 20%,#1c4744,transparent 60%),linear-gradient(165deg,#123331,#0a201e); }`
Replace: `.landing-quote { padding:clamp(70px,12vw,150px) 22px; text-align:center; color:#fff; background:radial-gradient(circle at 30% 20%,#2a2015,transparent 60%),linear-gradient(165deg,#141009,#0a0705); }`

Find: `.landing-quote p { margin:0; color:#8fe0d8; font-size:11px; letter-spacing:.3em; }`
Replace: `.landing-quote p { margin:0; color:#e3c179; font-size:11px; letter-spacing:.3em; }`

Find: `.landing-footer { display:flex; flex-direction:column; align-items:center; gap:12px; padding:40px 22px 56px; text-align:center; background:#fff; }`
Replace: `.landing-footer { display:flex; flex-direction:column; align-items:center; gap:12px; padding:40px 22px 56px; text-align:center; background:#0a0906; }`

Find: `.landing-footer span { color:#9db2ae; font-size:10px; letter-spacing:.08em; }`
Replace: `.landing-footer span { color:#a89c86; font-size:10px; letter-spacing:.08em; }`

- [ ] **Step 7: Leftover-light-color sweep**

Run:
```bash
grep -noE '#(fff\b|ffffff|fbfdfc|fcfcfa|f2f5f3|fafcfb|f8fcfb|e6faf8|fdf9ee|faf3df|fff7d8|f7fcfb|f5fbfa|f0faf9|f0f0f0)\b' app-men/globals.css
```
Expected: no remaining matches that are actual background/surface colors on a card, panel, or section (a handful of matches are expected and correct to keep — e.g. `color:#fff` on the still-gold `.landing-cta.light`'s hover text or the hero `h1{color:#fff}` sitting directly on the dark photo, and the mobile `.wrist-bar em{background:#9db8b3}`-style ones already handled above). For each match, open the surrounding rule in `app-men/globals.css` and confirm by inspection whether it's (a) already handled by an earlier step and just a substring coincidence, or (b) a genuine leftover light background that needs the same treatment as its sibling rules in this task. Fix any genuine leftovers found.

- [ ] **Step 8: Build and full visual pass**

Run: `npm run build:pages`
Expected: succeeds. Reuse the local server, then screenshot the full men's flow at desktop (1440×900) and mobile (390×664): landing hero, landing features/presets/showcase (scrolled), studio (materials drawer open), 360° preview overlay, checkout form, and checkout success view. View every screenshot. Expected: no white/light-colored panels remain anywhere in the flow — everything reads black-and-gold, matching the Bennett hero's tone. Fix any remaining light patch found (most likely culprits: a selector this task's find/replace missed a whitespace variant of — re-open `app-men/globals.css`, locate the rule by its selector name, and edit its color values directly to match this task's palette).

- [ ] **Step 9: Commit**

```bash
git add app-men/globals.css
git commit -m "Dark-theme the materials drawer, energy panel, checkout, guide modal, and landing page"
```

---

### Task 8: Verify the bead-hole-rotation and 360° audio fixes carry over correctly

**Files:** none modified — verification only (these fixes already exist in `app-men/preview.tsx`, `app-men/page.tsx`, and `app-men/share-card.ts` because Task 2 copied them verbatim from `app/`, which already has both fixes from this session's earlier work).

- [ ] **Step 1: Confirm the rotation fix is present in the men's copy**

Run: `grep -n 'stoneRotation' app-men/page.tsx`
Expected: one match, identical to `app/page.tsx`'s `stoneRotation = (a * 180 / Math.PI) + 90`.

Run: `grep -n 'holeRot\|ctx.rotate(a + Math.PI / 2)' app-men/preview.tsx app-men/share-card.ts`
Expected: `app-men/preview.tsx` matches on `holeRot`, `app-men/share-card.ts` matches on `ctx.rotate(a + Math.PI / 2)`.

- [ ] **Step 2: Screenshot the men's studio bracelet at several angles to confirm the faceted stone photos rotate correctly**

Reuse the pattern from `rotation-test.mjs` (already used earlier this session for the feminine site): add ~10 of one material (e.g. `obsidian`) via its `.material-card`, screenshot `.bracelet-stage`, and visually confirm each bead's visible facet/hole pattern orientation differs around the ring rather than staying fixed — same check already proven correct on the feminine site's rose-quartz photos, now confirming it holds for the new faceted men's photos too (faceted stones make misalignment more visually obvious than round ones, so this is a meaningful independent check, not just a rerun).

- [ ] **Step 3: Confirm the audio-unlock fix is present**

Run: `grep -n 'iOS Safari only unlocks' app-men/preview.tsx`
Expected: one match (the comment introduced by this session's audio fix), confirming the unlock-buffer + resume() logic was copied intact.

No commit needed — this task only verifies inherited code, it makes no changes.

---

### Task 9: Full headless verification sweep

**Files:** none modified — verification only.

- [ ] **Step 1: Emoji sweep (matches the site-wide "no AI-feeling icons" mandate already enforced on the feminine site)**

Write and run a script modeled on this session's existing `no-emoji-test.mjs`, pointed at `http://localhost:8899/crystal/men/` instead of `/crystal/`, covering: landing hero/features/presets, studio (after clicking the landing CTA), design guide modal, and checkout. Expected: `has emoji: OK, none found` on every screen (the only acceptable glyph is the ✕ close button, exactly as already validated on the feminine site).

- [ ] **Step 2: Mobile drawer footprint check (matches the feminine site's explicit ≥60%-preview requirement)**

At a 390×664 viewport, measure `.bracelet-stage`'s visible height share of the viewport with the drawer both open and collapsed, the same way this session already validated it for the feminine site. Expected: preview area ≥60% with the drawer open (the layout CSS driving this — `.studio-shell` padding, `.material-grid` height, `.bracelet-stage` width — was untouched by Tasks 6–7, which only changed colors, so this should already pass; this step confirms no color-edit accidentally touched a sizing property).

- [ ] **Step 3: Full end-to-end flow — add materials, apply a preset, drag-reorder, open 360° preview, share, checkout**

Drive the men's studio through: adding 3–4 different stones by clicking material cards, applying each of the three presets (already screenshotted individually in Task 4 — this pass clicks through them in the same session to catch state-transition bugs), dragging one bead to a new position, opening the 360° preview and confirming the canvas renders beads with no console errors, clicking "分享設計" and confirming a share card blob is produced with no thrown error, and completing checkout through to the "訂單已成立" success screen. Expected: zero `pageerror`/console-error events across the whole flow, and each screenshot shows the expected state (matches the depth of verification this session already applied to the feminine site's checkout and share-card features earlier in the conversation).

- [ ] **Step 4: Report any failures found and fix before proceeding to Task 10**

If any of Steps 1–3 fail, fix the specific issue in `app-men/*` (never in `app/*`), re-run `npm run build:pages`, and re-verify before moving on — do not deploy with known-failing checks.

---

### Task 10: Deploy to GitHub Pages

**Files:**
- Create/modify: `men/` at repo root (from `dist-pages/men/`)
- Modify: repo-root `index.html`, `assets/` (from `dist-pages/` root — unchanged content expected, since `app/`/`pages-static/` were never touched, but the sync step naturally re-copies them; verify the diff is empty for these paths before committing)

This mirrors the existing manual-sync deploy pattern already used for the feminine site all session (the repo's GitHub Pages source is "Deploy from a branch", not GitHub Actions, so built output must be committed directly into the repo root).

- [ ] **Step 1: Final build**

Run: `npm run build:pages`
Expected: succeeds, `dist-pages/index.html` and `dist-pages/men/index.html` both exist.

- [ ] **Step 2: Sync into the repo root**

```bash
rm -rf assets men
cp -r dist-pages/* .
git status --short
```
Expected: `git status --short` shows `men/` as new files, and shows **no changes** under the existing `assets/` or `index.html` (confirm this explicitly — if `assets/index-*.js` or `index.html` show as modified, something in Tasks 1–9 accidentally touched `app/`, `pages-static/`, or `vite.pages.config.ts`; stop and investigate before committing, per the design doc's explicit non-goal of zero changes to the existing feminine site).

- [ ] **Step 3: Commit**

```bash
git add men index.html assets
git commit -m "Deploy the men's line to /men on GitHub Pages"
```

- [ ] **Step 4: Push and poll until the new bundle is live**

```bash
git push -u origin claude/new-session-vt45nn
git push origin claude/new-session-vt45nn:main
```

Then poll (same pattern used earlier this session for the bead-rotation/audio fix deploy):
```bash
MEN_JS=$(ls dist-pages/men/assets/*.js | xargs -n1 basename)
for i in $(seq 1 20); do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "https://vitokok-lab.github.io/crystal/men/assets/$MEN_JS")
  echo "attempt $i: $code"
  if [ "$code" = "200" ]; then ok=$((ok+1)); else ok=0; fi
  if [ "${ok:-0}" -ge 4 ]; then echo "stable"; break; fi
  sleep 10
done
```
Expected: eventually prints `stable`.

- [ ] **Step 5: Final live smoke test**

Run: `curl -sS -o /dev/null -w "%{http_code}\n" https://vitokok-lab.github.io/crystal/men/`
Expected: `200`.

Run: `curl -sS -o /dev/null -w "%{http_code}\n" https://vitokok-lab.github.io/crystal/`
Expected: `200` (confirms the feminine site is still live and unaffected by this deploy).

Report back to the user (in Traditional Chinese, per this session's established convention) with both live URLs once confirmed stable.

---

## Plan self-review notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-28-mens-line-design.md` maps to a task — architecture → Tasks 1–2, material photography → Task 3, material/energy/preset data → Task 4, landing/hero → Task 5, visual theme → Tasks 6–7, feature parity (incl. the rotation/audio fixes) → Task 8, testing → Task 9, deploy → Task 10.
- **No cross-linking:** confirmed no task adds any link between `/` and `/men/` (per the approved "fully independent, no shared brand-switcher" decision) — `app-men/home.tsx`'s wordmark link targets `#landing-top` (in-page anchor) exactly like the original, not a cross-site link.
- **Zero risk to the feminine site:** every modified/created path is under `app-men/`, `pages-static-men/`, `public/materials/men/`, `public/men-hero.jpg`, or is a new/independent line in `package.json`/`scripts/fix-pages-base.sh` that only adds behavior (an additional build step, an additional sed pattern) without altering the existing `vite build --config vite.pages.config.ts` line or existing sed patterns. Task 10 Step 2 explicitly checks for an empty diff on the existing `assets/`/`index.html` before committing.
