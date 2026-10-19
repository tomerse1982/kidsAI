"""Reconstruct logical-order RTL text (Hebrew/Arabic) from PDF glyph positions.

Canva-exported PDFs store RTL text inconsistently (sometimes visual order, Arabic
in presentation forms). Instead of trusting the stored order we sort glyphs by
their x position (true visual order) and convert visual -> logical order using
a simplified inverse of the Unicode bidi algorithm for an RTL base direction.
"""
from __future__ import annotations

import re
import unicodedata

MIRROR = {"(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«"}
# A left-to-right run: latin letters / digits, optionally joined by number separators.
LTR_RUN = re.compile(r"[A-Za-z0-9À-ɏ](?:[A-Za-z0-9À-ɏ.,:/%+'’\-_]*[A-Za-z0-9À-ɏ%])?")
ARABIC_RANGE = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
HEBREW_RANGE = re.compile(r"[֐-׿]")


def is_mark(ch: str) -> bool:
    return unicodedata.category(ch) in ("Mn", "Me")


def visual_to_logical_rtl(visual: str) -> str:
    """Convert a single visual (left-to-right glyph order) line to logical order."""
    rev = "".join(MIRROR.get(c, c) for c in reversed(visual))
    # LTR runs were reversed together with the line; flip them back.
    return LTR_RUN.sub(lambda m: m.group(0)[::-1], rev)


def chars_to_visual(chars: list[dict]) -> str:
    """Order glyphs by x and attach combining marks to the base glyph under them."""
    marks = [c for c in chars if is_mark(c["c"])]
    # Canva artefact: a SPACE glyph emitted *inside* a word right after a tanween/shadda.
    # Such a space carries a zero-width mark on its left edge; real word spaces do not.
    zero_marks = [m["bbox"][0] for m in marks if m["bbox"][2] - m["bbox"][0] < 0.5]
    bases = [c for c in chars if not is_mark(c["c"]) and not (
        c["c"] == " " and any(abs(c["bbox"][0] - mx) < 0.3 for mx in zero_marks))]
    bases.sort(key=lambda c: (c["bbox"][0] + c["bbox"][2]) / 2)
    attached: dict[int, list[str]] = {}
    letters = [i for i, b in enumerate(bases) if b["c"].strip()]  # never attach a mark to a space
    for m in marks:
        mx = (m["bbox"][0] + m["bbox"][2]) / 2
        if m["bbox"][2] - m["bbox"][0] < 0.5:
            # Zero-width mark: in RTL runs it is drawn at the pen position after its
            # base glyph, i.e. at the base's left edge.
            best = min(letters, key=lambda i: abs(bases[i]["bbox"][0] - m["bbox"][0]), default=None)
        else:
            best = min(letters, key=lambda i: abs((bases[i]["bbox"][0] + bases[i]["bbox"][2]) / 2 - mx), default=None)
        if best is not None:
            attached.setdefault(best, []).append(m["c"])
    out = []
    # Emit in visual order; marks go *before* the base so that after the
    # full-line reversal they follow their base letter in logical order.
    for i, b in enumerate(bases):
        out.append("".join(attached.get(i, [])) + b["c"])
    return "".join(out)


def insert_gaps(chars: list[dict]) -> list[dict]:
    """Some PDFs omit space glyphs; synthesise a space where glyphs are far apart."""
    bases = sorted((c for c in chars if not is_mark(c["c"])), key=lambda c: c["bbox"][0])
    mark_centers = [(c["bbox"][0] + c["bbox"][2]) / 2 for c in chars if is_mark(c["c"])]
    result = list(chars)
    for a, b in zip(bases, bases[1:]):
        gap = b["bbox"][0] - a["bbox"][2]
        size = max(a["bbox"][3] - a["bbox"][1], 1)
        # A gap occupied by a spacing diacritic (e.g. Arabic shadda) is not a word break.
        occupied = any(a["bbox"][2] - 0.5 <= mx <= b["bbox"][0] + 0.5 for mx in mark_centers)
        if gap > size * 0.25 and not occupied and a["c"] != " " and b["c"] != " ":
            x = (a["bbox"][2] + b["bbox"][0]) / 2
            result.append({"c": " ", "bbox": (x - 0.1, a["bbox"][1], x + 0.1, a["bbox"][3])})
    return result


def normalize_text(text: str, language: str) -> str:
    text = unicodedata.normalize("NFKC", text)  # Arabic presentation forms -> base letters
    text = text.replace(" ", " ").replace("‏", "").replace("‎", "")
    if language == "ar":
        text = text.replace("ـ", "")  # tatweel
        text = text.replace("ؓ", "ً")  # mis-mapped glyph in the Canva font = fathatan
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def line_language_noise(text: str, language: str) -> bool:
    """True for decorative glyph lines (e.g. an Arabic icon-font letter in the Hebrew book)."""
    t = text.strip()
    if not t:
        return True
    if language == "he" and len(t) <= 2 and ARABIC_RANGE.search(t) and not HEBREW_RANGE.search(t):
        return True
    return False


def strip_foreign_glyphs(text: str, language: str) -> str:
    """Remove isolated Arabic glyphs that leak into Hebrew lines from icon fonts."""
    if language != "he":
        return text
    return re.sub(r"(?<![؀-ۿ])[؀-ۿ](?![؀-ۿ])", "", text)
