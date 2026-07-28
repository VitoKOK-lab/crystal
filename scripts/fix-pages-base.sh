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

# The men's entry builds with publicDir:false (public/ is only copied once by
# the root build), so Vite can't resolve "/crystal-hero.png" as a local public
# asset there and leaves the CSS url() completely unrewritten, unlike the root
# build where Vite's `base` option already correctly prefixes it. Scoped to
# dist-pages/men only — the root build's CSS is already correct and re-running
# this same substitution against it would double the /crystal prefix.
if [ -d "$DIST/men" ]; then
  find "$DIST/men" -type f -name '*.css' -print0 |
    xargs -0 sed -i \
      -e "s|url(/crystal-hero.png)|url($BASE/crystal-hero.png)|g"
fi

echo "Rewrote root-absolute asset paths under $DIST to $BASE/…"
