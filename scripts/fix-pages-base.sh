#!/usr/bin/env bash
# The app's JS hardcodes root-absolute image URLs ("/materials/*.png") that
# break under the GitHub Pages project path /crystal/. Vite already rebases
# CSS url() references (e.g. /crystal-hero.png) via the `base` option, but it
# does not touch plain string literals in JS, so rewrite those here.
# Run only on a fresh build: build:pages empties dist-pages first, and running
# this twice on the same output would double the /crystal prefix.
set -euo pipefail

DIST="dist-pages"
BASE="/crystal"

find "$DIST" -type f -name '*.js' -print0 |
  xargs -0 sed -i "s|/materials/|$BASE/materials/|g"

echo "Rewrote /materials/ asset paths under $DIST to $BASE/materials/"
