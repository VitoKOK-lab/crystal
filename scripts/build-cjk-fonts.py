#!/usr/bin/env python3
"""Subset the Chinese webfonts to exactly the glyphs this site renders.

A full Traditional Chinese face is 5-9 MB, which is not something you put in
front of a first paint. Google Fonts' `text=` parameter returns a woff2
containing only the requested glyphs, which brings both faces down to a few
tens of KB — small enough to self-host next to Bodoni and Jost.

Because the subset is pinned to the current copy, this has to be re-run
whenever Chinese text changes, or the new characters render as blanks:

    npm run build:pages && python3 scripts/build-cjk-fonts.py

Run it after the build so the scan sees the bundled strings rather than the
sources, and rebuild afterwards only if the CSS changed.
"""
import re
import pathlib
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
# CJK ideographs plus the fullwidth punctuation the copy actually uses.
CJK = re.compile(r"[　-〿一-鿿＀-￯]")
FAMILIES = {"noto-serif-tc": "Noto+Serif+TC", "noto-sans-tc": "Noto+Sans+TC"}
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"


def used_glyphs() -> str:
    found = set()
    for path in list((ROOT / "dist-pages" / "assets").glob("*.js")) + [ROOT / "pages-static" / "index.html"]:
        if path.exists():
            found |= set(CJK.findall(path.read_text(encoding="utf-8")))
    return "".join(sorted(found))


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req).read()


def main() -> None:
    text = used_glyphs()
    if not text:
        raise SystemExit("no CJK found — build first so the bundle exists")
    OUT.mkdir(parents=True, exist_ok=True)
    quoted = urllib.parse.quote(text)
    for name, family in FAMILIES.items():
        css = fetch(
            f"https://fonts.googleapis.com/css2?family={family}:wght@400&text={quoted}"
        ).decode("utf-8")
        # The `text=` endpoint serves a generated /l/font?kit=... URL, not a
        # plain .woff2 path, so match the whole url() rather than an extension.
        url = re.search(r"url\((https://[^)]+)\)", css)
        if not url:
            raise SystemExit(f"no font URL in the {family} response:\n{css[:400]}")
        data = fetch(url.group(1))
        (OUT / f"{name}.woff2").write_bytes(data)
        print(f"  {name}.woff2  {len(data) // 1024:3d} KB")
    # Record exactly which characters this subset covers so
    # scripts/check-cjk-coverage.py can catch a forgotten re-run after a
    # copy change, without needing to parse the woff2 files themselves.
    (OUT / ".cjk-glyphs").write_text(text, encoding="utf-8")
    print(f"subset to {len(text)} glyphs")


if __name__ == "__main__":
    main()
