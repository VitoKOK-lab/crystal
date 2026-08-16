#!/usr/bin/env python3
"""Derive a sphere-wrappable albedo texture for every database-seeded stone
from its own product photo, for the WebGL 3D preview.

The 21 catalog-baked stones have hand-prompted seamless albedo maps under
public/materials/textures/ (see STONE_TEXTURES in app/preview-3d.tsx). The
0005-expansion stones only had a sampled flat colour, which made them read
as painted ceramic next to the textured ones. Their product photos already
carry the real mineral character — phantom pyramids, rutile needles, agate
banding — so cut the texture out of the photo itself:

1. Find the largest fully-opaque square patch (photos are transparent-
   background cutouts, and some shapes — donut rings, hearts, stars — have
   holes or notches at the centre, so a naive centre crop would sample
   background).
2. Flatten the baked studio lighting by dividing out a heavy Gaussian blur
   of the luminance: the 3D engine re-lights the bead itself, and a baked
   top-left highlight would rotate with the stone like a painted-on decal.
   Partial strength only — full flattening also erases genuine large-scale
   colour zoning, which IS mineral character.
3. Resize to 384px and save as JPEG (textures are opaque; PNG here would
   triple the payload for nothing).

Writes public/materials/textures/sf/{id}.jpg and the generated lookup
app/bead-textures.ts. Re-run after any sf/ photo changes:

    python3 scripts/derive-bead-textures.py
"""
import pathlib
import re

import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "materials" / "sf"
OUT_DIR = ROOT / "public" / "materials" / "textures" / "sf"
OUT_TS = ROOT / "app" / "bead-textures.ts"
TEX_SIZE = 384
# How much of the baked lighting gradient to remove (0 = keep photo as-is,
# 1 = fully flat). Tuned by eye on the quartz family: 0.8 kills the
# highlight's hotspot while keeping natural colour zoning.
FLATTEN = 0.8
# Donut-shaped beads: the photo's centre is the hole (rendered as opaque
# white in the cutout, so alpha can't tell), and a centre crop would paint
# a white disc onto the sphere. Mask the hole out before the patch search
# so the texture comes from the ring body.
HOLLOW = re.compile(r"hoop|running-ring")


def largest_opaque_square(alpha: np.ndarray) -> tuple[int, int, int]:
    """Return (x, y, side) of the largest axis-aligned square whose pixels
    are all opaque, preferring squares nearest the image centre.

    Classic DP: sq[y, x] = side of the largest opaque square whose bottom-
    right corner is (x, y). Exact and fast enough at 400px (O(w*h)).
    """
    opaque = (alpha > 200).astype(np.int32)
    h, w = opaque.shape
    sq = np.zeros((h, w), dtype=np.int32)
    sq[0, :] = opaque[0, :]
    sq[:, 0] = opaque[:, 0]
    for y in range(1, h):
        row = sq[y]
        prev = sq[y - 1]
        for x in range(1, w):
            if opaque[y, x]:
                row[x] = min(prev[x], row[x - 1], prev[x - 1]) + 1
    best = int(sq.max())
    if best < 16:
        raise SystemExit("no opaque region found — is the photo empty?")
    # Among all positions achieving >= 92% of the best side, pick the one
    # whose square centre is closest to the image centre: texture from the
    # middle of the stone, not from wherever the DP happened to peak.
    side = max(int(best * 0.92), 16)
    ys, xs = np.nonzero(sq >= side)
    cx, cy = (w - 1) / 2, (h - 1) / 2
    centres = ((xs - side / 2 - cx) ** 2 + (ys - side / 2 - cy) ** 2)
    i = int(np.argmin(centres))
    return int(xs[i]) - side + 1, int(ys[i]) - side + 1, side


def flatten_lighting(rgb: np.ndarray) -> np.ndarray:
    """Divide out the low-frequency luminance so the crop's shading is
    (mostly) uniform, leaving high-frequency mineral texture intact."""
    lum = rgb.mean(axis=2)
    radius = max(rgb.shape[0] // 5, 8)
    blurred = np.asarray(
        Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius)),
        dtype=np.float64,
    )
    blurred = np.maximum(blurred, 8.0)
    gain = (blurred.mean() / blurred) ** FLATTEN
    return np.clip(rgb * gain[:, :, None], 0, 255)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entries = []
    for path in sorted(SRC.glob("*.png")):
        im = Image.open(path).convert("RGBA")
        arr = np.asarray(im, dtype=np.float64)
        alpha = arr[:, :, 3].copy()
        if HOLLOW.search(path.stem):
            h, w = alpha.shape
            yy, xx = np.mgrid[0:h, 0:w]
            hole = ((xx - (w - 1) / 2) ** 2 + (yy - (h - 1) / 2) ** 2) < (0.24 * w) ** 2
            alpha[hole] = 0
        x, y, side = largest_opaque_square(alpha)
        # Sub-crop biased toward the bottom-right: the photos are lit with a
        # deliberate top-left highlight, and even after flattening its
        # near-white core clips — sampling away from it beats fighting it.
        sub = max(int(side * 0.78), 16)
        x += int((side - sub) * 0.62)
        y += int((side - sub) * 0.62)
        side = sub
        crop = arr[y:y + side, x:x + side, :3]
        tex = flatten_lighting(crop).astype(np.uint8)
        out = Image.fromarray(tex).resize((TEX_SIZE, TEX_SIZE), Image.LANCZOS)
        dest = OUT_DIR / f"{path.stem}.jpg"
        out.save(dest, quality=85, optimize=True)
        entries.append((path.stem, f"/materials/textures/sf/{path.stem}.jpg"))
        print(f"  {path.stem}: patch {side}px @ ({x},{y}) -> {dest.stat().st_size // 1024} KB")
    lines = [
        "// AUTO-GENERATED by scripts/derive-bead-textures.py — do not hand-edit.",
        "// Sphere-wrappable albedo textures cut from each expansion stone's own",
        "// product photo (largest opaque patch, lighting flattened), used by the",
        "// WebGL 3D preview's triplanar-mapped bead material.",
        "export const SF_STONE_TEXTURES: Record<string, string> = {",
    ]
    for stone_id, rel in entries:
        lines.append(f'  "{stone_id}": "{rel}",')
    lines.append("};")
    OUT_TS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT_TS} ({len(entries)} textures)")


if __name__ == "__main__":
    main()
