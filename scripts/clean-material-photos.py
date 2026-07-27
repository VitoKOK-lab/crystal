#!/usr/bin/env python3
"""Strip the photographic white backdrop from accessory material photos.

Flood-fills from the image border, removing connected near-white / low-alpha
pixels so charms and spacers composite cleanly over bracelet beads. Interior
white highlights (metal speculars, gems) are untouched because they are not
connected to the border background.

Usage: python3 scripts/clean-material-photos.py [file.png ...]
Defaults to the accessory photos referenced by app/page.tsx.
"""
import sys
from collections import deque
from PIL import Image

# Gold pieces only: chrome-silver surfaces are tonally identical to the white
# backdrop, so the flood fill eats them — the silver photos already ship with
# transparent backgrounds and must not be run through this script.
DEFAULT_FILES = [
    "public/materials/gold-crown.png",
    "public/materials/gold-rondelle.png",
    "public/materials/gold-knot.png",
    "public/materials/leaf.png",
    "public/materials/lotus.png",
    "public/materials/gold-heart.png",
    "public/materials/key.png",
]

BRIGHTNESS = 202  # background pixels are at least this bright...
MAX_CHROMA = 30   # ...and nearly grey (low colour saturation)


def is_background(p):
    r, g, b, a = p
    if a < 40:
        return True
    mx, mn = max(r, g, b), min(r, g, b)
    return mx >= BRIGHTNESS and (mx - mn) <= MAX_CHROMA


def clean(path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    queue = deque()

    def try_seed(x, y):
        i = y * w + x
        if not seen[i] and is_background(px[x, y]):
            seen[i] = 1
            queue.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not seen[i] and is_background(px[nx, ny]):
                    seen[i] = 1
                    queue.append((nx, ny))

    removed = 0
    for y in range(h):
        for x in range(w):
            if seen[y * w + x]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
                removed += 1

    # Feather: soften the 1px rim next to removed background so edges stay smooth.
    rim = []
    for y in range(h):
        for x in range(w):
            if seen[y * w + x]:
                continue
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and seen[ny * w + nx]:
                    rim.append((x, y))
                    break
    for x, y in rim:
        r, g, b, a = px[x, y]
        mx, mn = max(r, g, b), min(r, g, b)
        if mx >= BRIGHTNESS - 20 and (mx - mn) <= MAX_CHROMA + 8:
            px[x, y] = (r, g, b, a // 2)

    im.save(path)
    print(f"{path}: removed {removed * 100 // (w * h)}% background, feathered {len(rim)}px rim")


if __name__ == "__main__":
    for f in sys.argv[1:] or DEFAULT_FILES:
        clean(f)
