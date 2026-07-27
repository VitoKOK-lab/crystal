#!/usr/bin/env bash
# Copy the built static site into the repo root so the "deploy from branch"
# GitHub Pages mode serves the app (with .nojekyll, files are served as-is).
# Run after `npm run build:pages` whenever app code changes, until the repo's
# Pages source is switched to "GitHub Actions" in Settings → Pages — after
# that, the root copies (index.html, assets/, materials/, *.svg, *.png) can
# be deleted and this script retired.
set -euo pipefail
npm run build:pages
cp -r dist-pages/* .
echo "Synced dist-pages/ to repo root."
