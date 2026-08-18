#!/usr/bin/env python3
"""Fail the build if the shipped CJK webfont subset doesn't cover every
Chinese/fullwidth character the built bundle actually renders.

build-cjk-fonts.py subsets Noto Serif/Sans TC down to only the glyphs used
at the time it was run, and the result is committed to public/fonts/.
Nothing enforces that the script gets re-run after a copy change, so a
forgotten re-run ships silent tofu (a character with no matching glyph
renders blank) with no build error — the failure is only visible in a
browser. This check closes that gap without needing to parse the font
binaries: build-cjk-fonts.py records exactly which characters it
subsetted for in public/fonts/.cjk-glyphs, and this script diffs that
against what the built bundle actually renders.

Run after the site build (wired into `npm run build:cf` as its last step).
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CJK = re.compile(r"[　-〿一-鿿＀-￯]")
MANIFEST = ROOT / "public" / "fonts" / ".cjk-glyphs"


def rendered_glyphs() -> set:
    found = set()
    for path in list((ROOT / "dist-pages" / "assets").glob("*.js")) + [ROOT / "pages-static" / "index.html"]:
        if path.exists():
            found |= set(CJK.findall(path.read_text(encoding="utf-8")))
    return found


def main() -> None:
    rendered = rendered_glyphs()
    if not rendered:
        return  # nothing CJK in the bundle -- nothing to check
    if not MANIFEST.exists():
        sys.exit(
            f"{MANIFEST} is missing — run scripts/build-cjk-fonts.py after "
            "the build so the CJK webfonts cover the bundle's text."
        )
    covered = set(MANIFEST.read_text(encoding="utf-8"))
    missing = sorted(rendered - covered)
    if missing:
        sys.exit(
            "Chinese characters render with no matching glyph in the subsetted "
            f"webfont (will show as tofu): {''.join(missing)!r}\n"
            "Re-run: npm run build:cf; python3 scripts/build-cjk-fonts.py"
        )
    print(f"CJK glyph coverage OK ({len(rendered)} characters, all covered).")


if __name__ == "__main__":
    main()
