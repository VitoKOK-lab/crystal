#!/usr/bin/env bash
# The app's JS hardcodes root-absolute image URLs ("/materials/*.png") that
# break under the GitHub Pages project path /crystal/. Vite already rebases
# CSS url() references (e.g. /crystal-hero.png) via the `base` option, but it
# does not touch plain string literals in JS, so rewrite those here. Public
# assets only ever live at the site root (/crystal/materials/...), even for
# the men's sub-entry (dist-pages/men/), a static redirect page copied in by
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
    -e "s|/banners/|$BASE/banners/|g" \
    -e "s|/video/|$BASE/video/|g" \
    -e "s|\`/hero-banner.png\`|\`$BASE/hero-banner.png\`|g" \
    -e "s|/men-hero.jpg|$BASE/men-hero.jpg|g"

echo "Rewrote root-absolute asset paths under $DIST to $BASE/…"

# The rewrite list above is hand-maintained: a new public/ asset referenced
# by a root-absolute path (e.g. "/foo.png") would silently 404 on Pages
# with no build failure, since dev and non-Pages builds never hit the
# /crystal/ project-path prefix. Scan the built output for any quoted asset
# path that still isn't rooted at $BASE and fail loudly instead.
ASSET_EXT='png|jpe?g|svg|webp|mp4|webm|woff2?|gif|ico'
# /px.png /nx.png /py.png /ny.png /pz.png /nz.png: @react-three/drei's
# useEnvironment() default `files` fallback (its six-face cubemap
# convention) — a literal array in its source, bundled whether or not it's
# ever used. Verified unreachable for every <Environment> usage in this
# app: every call passes `children`, which drei's own dispatcher routes to
# a different code path that never touches this default. Re-check this
# exemption if a future <Environment> call omits children/map/files/preset.
DREI_ENV_DEFAULTS='/px.png|/nx.png|/py.png|/ny.png|/pz.png|/nz.png'
leftover=$(grep -rhoE "[\"'\`](/[A-Za-z0-9_./-]+\.($ASSET_EXT))[\"'\`]" "$DIST" --include='*.js' --include='*.css' \
  | tr -d "\"'\`" | grep -v "^$BASE/" | grep -vE "^($DREI_ENV_DEFAULTS)\$" | sort -u || true)
if [[ -n "$leftover" ]]; then
  echo "fix-pages-base.sh: found root-absolute asset paths not under $BASE/ — these will 404 on GitHub Pages:" >&2
  echo "$leftover" >&2
  echo "Add a rewrite rule above (or move the asset under an already-handled directory)." >&2
  exit 1
fi

# Catch a forgotten `python3 scripts/build-cjk-fonts.py` re-run after a
# Chinese copy change the same way: fail the build instead of shipping tofu.
if command -v python3 >/dev/null; then
  python3 "$(dirname "${BASH_SOURCE[0]}")/check-cjk-coverage.py"
else
  echo "fix-pages-base.sh: python3 not found, skipping the CJK glyph coverage check." >&2
fi
