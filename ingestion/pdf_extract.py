"""Stage 1 of PDF ingestion: extract positioned, logical-order lines from a handbook PDF.

Output JSON: {pages: [{index, printed_page, width, height, image_count, lines: [...]}]}
Each line: {x0,y0,x1,y1,size,bold_lead,text}
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).parent))
from rtl_text import (  # noqa: E402
    chars_to_visual, insert_gaps, is_mark, line_language_noise, normalize_text,
    strip_foreign_glyphs, visual_to_logical_rtl,
)

PRINTED_PAGE = re.compile(r"^-\s*(\d{1,3})\s*-$")


def split_segments(chars: list[dict]) -> list[list[dict]]:
    """Split a PDF 'line' into visually separate segments (e.g. header boxes on one baseline)."""
    bases = sorted((c for c in chars if not is_mark(c["c"])), key=lambda c: c["bbox"][0])
    if not bases:
        return []
    segs, cur = [], [bases[0]]
    for a, b in zip(bases, bases[1:]):
        size = max(a["bbox"][3] - a["bbox"][1], 1)
        if b["bbox"][0] - a["bbox"][2] > size * 2.5:
            segs.append(cur)
            cur = []
        cur.append(b)
    segs.append(cur)
    bounds = [(s[0]["bbox"][0] - 1, s[-1]["bbox"][2] + 1) for s in segs]  # before marks are added
    for m in (c for c in chars if is_mark(c["c"])):
        mx = (m["bbox"][0] + m["bbox"][2]) / 2
        for s, (lo, hi) in zip(segs, bounds):
            if lo <= mx <= hi:
                s.append(m)
                break
    return segs


def logical(chars: list[dict], language: str) -> str:
    text = normalize_text(visual_to_logical_rtl(chars_to_visual(insert_gaps(chars))), language)
    return strip_foreign_glyphs(text, language).strip()


def extract(pdf_path: str, language: str) -> dict:
    doc = pymupdf.open(pdf_path)
    pages = []
    for page in doc:
        # Canva wraps some runs in /ActualText with a bogus replacement glyph; use the real glyphs.
        raw = page.get_text("rawdict", flags=pymupdf.TEXTFLAGS_RAWDICT | pymupdf.TEXT_IGNORE_ACTUALTEXT)
        lines = []
        for bno, block in enumerate(raw["blocks"]):
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                chars = []
                for span in line["spans"]:
                    bold = bool(span["flags"] & 16) or "Bold" in span["font"]
                    for ch in span["chars"]:
                        chars.append({**ch, "bold": bold, "size": span["size"]})
                for seg in split_segments(chars):
                    text = logical(seg, language)
                    if line_language_noise(text, language):
                        continue
                    bold_chars = [c for c in seg if c["bold"]]
                    bold_text = logical(bold_chars, language) if bold_chars else ""
                    all_bold = len(bold_chars) >= len([c for c in seg if c["c"].strip()]) - 1
                    bold_lead = ""
                    if bold_text and not all_bold:
                        # RTL: a bold lead-in ("title:") sits to the right of the regular text.
                        # Canva sometimes sets the first letter in the regular face, so allow
                        # a couple of regular glyphs inside the lead-in.
                        bold_x0 = min(c["bbox"][0] for c in bold_chars if c["c"].strip())
                        lead_chars = [c for c in seg if (c["bbox"][0] + c["bbox"][2]) / 2 >= bold_x0]
                        rest = [c for c in seg if (c["bbox"][0] + c["bbox"][2]) / 2 < bold_x0 and c["c"].strip()]
                        intruders = [c for c in lead_chars if not c["bold"] and c["c"].strip() and not is_mark(c["c"])]
                        if rest and len(intruders) <= 2:
                            bold_lead = logical(lead_chars, language)
                    xs = [c["bbox"][0] for c in seg] + [c["bbox"][2] for c in seg]
                    ys = [c["bbox"][1] for c in seg] + [c["bbox"][3] for c in seg]
                    sizes = sorted(c["size"] for c in seg)
                    lines.append({
                        "x0": round(min(xs), 1), "y0": round(min(ys), 1),
                        "x1": round(max(xs), 1), "y1": round(max(ys), 1),
                        "size": round(sizes[len(sizes) // 2], 1),
                        "block": bno, "bold": all_bold, "bold_lead": bold_lead, "text": text,
                    })
        lines.sort(key=lambda l: (round(l["y0"] / 4), -l["x1"]))
        printed = None
        for l in lines:
            m = PRINTED_PAGE.match(l["text"].replace(" ", ""))
            if m and l["y0"] > page.rect.height * 0.85:
                printed = int(m.group(1))
        pages.append({
            "index": page.number, "printed_page": printed,
            "width": round(page.rect.width, 1), "height": round(page.rect.height, 1),
            "image_count": len(page.get_images()),
            "lines": [l for l in lines if not (PRINTED_PAGE.match(l["text"].replace(" ", "")) and l["y0"] > page.rect.height * 0.85)],
        })
    return {"file": Path(pdf_path).name, "language": language, "page_count": doc.page_count, "pages": pages}


if __name__ == "__main__":
    pdf, lang, out = sys.argv[1], sys.argv[2], sys.argv[3]
    data = extract(pdf, lang)
    Path(out).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{pdf}: {data['page_count']} pages, {sum(len(p['lines']) for p in data['pages'])} lines -> {out}")
