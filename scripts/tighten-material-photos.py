#!/usr/bin/env python3
"""Crop every served bead/accessory photo tightly to its opaque content.

The studio places beads by tangent-circle math (PCT_PER_MM in catalog.tsx):
two adjacent beads' bounding circles are computed to touch exactly. That
math assumes each photo's visible content fills its square canvas — but the
material photos came from at least three separate generation batches with
wildly inconsistent padding, from ~64% fill (silver-round, gold-rondelle,
silver-star, gold-knot, several of the original women's stones) up to 100%
(leaf, cross, key). The tangent math was correct; the assets violated its
assumption, so "touching" beads visibly floated apart by the padding gap.

Crop each image to its opaque bounding box plus a small uniform margin
(for the existing drop-shadow filter to have room), padded back out to a
square canvas so circular crops stay circular. Run once; re-run only if a
new photo is added or replaced with one that has different padding.

    python3 scripts/tighten-material-photos.py [--dry-run]
"""
import pathlib
import re
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
MARGIN = 0.035  # fraction of the tightest dimension, kept around the content


def served_paths() -> list[str]:
    src = (ROOT / "app" / "catalog.tsx").read_text(encoding="utf-8")
    return sorted(set(re.findall(r'"(/materials/[^"]+\.png)"', src)))


def tighten(path: pathlib.Path) -> tuple[float, float] | None:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    bbox = im.getbbox()
    if not bbox:
        return None
    bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    before = max(bw / w, bh / h)

    side = max(bw, bh) * (1 + MARGIN * 2)
    cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    half = side / 2
    left, top = cx - half, cy - half

    canvas = Image.new("RGBA", (round(side), round(side)), (0, 0, 0, 0))
    canvas.paste(im, (round(-left), round(-top)), im)
    canvas.save(path)

    after_bbox = canvas.getbbox()
    ab = after_bbox[2] - after_bbox[0]
    after = ab / canvas.size[0]
    return before, after


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    paths = served_paths()
    print(f"{len(paths)} served material images")
    results = []
    for rel in paths:
        path = ROOT / "public" / rel.lstrip("/")
        if not path.exists():
            print(f"  MISSING: {rel}")
            continue
        if dry_run:
            im = Image.open(path).convert("RGBA")
            w, h = im.size
            bbox = im.getbbox()
            if bbox:
                bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
                results.append((rel, round(max(bw / w, bh / h) * 100, 1)))
            continue
        r = tighten(path)
        if r:
            before, after = r
            results.append((rel, round(before * 100, 1), round(after * 100, 1)))

    if dry_run:
        for rel, fill in sorted(results, key=lambda r: r[1]):
            print(f"  {fill:5.1f}%  {rel}")
    else:
        for rel, before, after in sorted(results, key=lambda r: r[1]):
            print(f"  {before:5.1f}% -> {after:5.1f}%  {rel}")
        fills = [r[2] for r in results]
        print(f"min {min(fills)}%  max {max(fills)}%  mean {sum(fills)/len(fills):.1f}%")


if __name__ == "__main__":
    main()
