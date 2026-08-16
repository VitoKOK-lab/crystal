#!/usr/bin/env python3
"""Subset the Chinese webfonts to exactly the glyphs this site renders.

A full Traditional Chinese face is 5-9 MB, which is not something you put in
front of a first paint. We download each family's full static TTF once
(cached under /tmp), subset it locally with fontTools, and emit woff2 files
of a few tens of KB.

(The previous approach — Google Fonts' `text=` parameter — silently
truncates once the glyph list makes the URL too long: at ~950 characters it
returned a 4 KB font containing 53 glyphs. Local subsetting has no such
cliff, and the cmap of the produced font is verified before the manifest is
written, so a bad subset can never pass check-cjk-coverage.py again.)

Because the subset is pinned to the current copy, re-run whenever Chinese
text changes (bundles, the HTML shell, or migration-seeded material names):

    npm run build:pages && python3 scripts/build-cjk-fonts.py

Requires: fonttools + brotli (pip install fonttools brotli).
"""
import io
import pathlib
import re
import tempfile
import urllib.parse
import urllib.request

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
CACHE = pathlib.Path(tempfile.gettempdir()) / "oma-font-cache"
# CJK ideographs plus the fullwidth punctuation the copy actually uses.
CJK = re.compile(r"[　-〿一-鿿＀-￯]")
# Full variable-weight sources from the google/fonts repository — the css
# APIs no longer hand out whole font files, only per-request subsets.
FAMILIES = {
    "noto-serif-tc": ("Noto Serif TC", "https://raw.githubusercontent.com/google/fonts/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf"),
    "noto-sans-tc": ("Noto Sans TC", "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"),
}
LEGACY_UA = "Mozilla/5.0"


def used_glyphs() -> str:
    found = set()
    # Bundles + the HTML shell carry the baked copy; migrations carry the
    # database-seeded material names, which reach the browser at runtime via
    # /api/catalog and must render in the brand face too.
    paths = (
        list((ROOT / "dist-pages" / "assets").glob("*.js"))
        + list((ROOT / "dist-pages" / "admin" / "assets").glob("*.js"))
        + list((ROOT / "migrations").glob("*.sql"))
        + [ROOT / "pages-static" / "index.html"]
    )
    for path in paths:
        if path.exists():
            found |= set(CJK.findall(path.read_text(encoding="utf-8")))
    return "".join(sorted(found))


def fetch(url: str, ua: str = LEGACY_UA) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    return urllib.request.urlopen(req).read()


def full_font(name: str, url: str) -> bytes:
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / f"{name}.ttf"
    if cached.exists() and cached.stat().st_size > 1_000_000:
        return cached.read_bytes()
    data = fetch(url)
    if len(data) < 1_000_000:
        raise SystemExit(f"{name}: downloaded TTF suspiciously small ({len(data)} bytes)")
    cached.write_bytes(data)
    return data


def subset(data: bytes, text: str) -> tuple[bytes, set[int]]:
    font = TTFont(io.BytesIO(data))
    # Pin the variable weight axis to 400 — the css declares one weight and
    # a static instance subsets smaller than the full variation data.
    if "fvar" in font:
        instantiateVariableFont(font, {"wght": 400}, inplace=True)
    options = Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.hinting = False
    options.drop_tables += ["FFTM"]
    subsetter = Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    buf = io.BytesIO()
    font.save(buf)
    covered = {c for table in font["cmap"].tables for c in table.cmap}
    return buf.getvalue(), covered


def main() -> None:
    text = used_glyphs()
    if not text:
        raise SystemExit("no CJK found — build first so the bundle exists")
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (family, url) in FAMILIES.items():
        data, covered = subset(full_font(name, url), text)
        # Verify the actual cmap, not our intent: any wanted character the
        # produced font can't render fails loudly before the manifest is
        # written. (A handful of chars genuinely absent from the source face
        # would surface here; none are today.)
        missing = [ch for ch in text if ord(ch) not in covered]
        if missing:
            raise SystemExit(f"{family}: subset font is missing {len(missing)} glyphs: {''.join(missing[:40])}")
        (OUT / f"{name}.woff2").write_bytes(data)
        print(f"  {name}.woff2  {len(data) // 1024:3d} KB")
    # Record exactly which characters this subset covers so
    # scripts/check-cjk-coverage.py can catch a forgotten re-run after a
    # copy change. Written only after the cmap verification above passed.
    (OUT / ".cjk-glyphs").write_text(text, encoding="utf-8")
    print(f"subset to {len(text)} glyphs (cmap-verified)")


if __name__ == "__main__":
    main()
