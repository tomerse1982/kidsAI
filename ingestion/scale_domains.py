"""Derive each milestone's developmental domain from the colour-coded scale chart.

The appendix chart colours every row by domain (legend: social / language / gross
motor / fine motor). Row *labels* come from the curated transcription in
curation/scale_chart_rows.json; row *colours* are sampled here from the PDF pixels
and classified against the chart's own legend, so no domain is typed by hand.

Usage: python scale_domains.py <hebrew.pdf> <out.json>
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

import pymupdf

DPI = 260
CURATION = Path(__file__).parent / "curation" / "scale_chart_rows.json"


def render(page, clip):
    m = pymupdf.Matrix(DPI / 72, DPI / 72).prerotate(90)
    return page.get_pixmap(matrix=m, clip=pymupdf.Rect(*clip))


def brightness(px):
    return sum(px[:3]) / 3


def row_bands(pix) -> list[tuple[int, int]]:
    """Horizontal cell bands between dark grid lines."""
    w, h = pix.width, pix.height
    xs = range(int(w * 0.02), int(w * 0.98), max(1, w // 120))
    is_line = []
    for y in range(h):
        dark = sum(1 for x in xs if brightness(pix.pixel(x, y)) < 150)
        is_line.append(dark / len(xs) > 0.92)  # grid lines span the whole cell; text never does
    bands, start = [], None
    for y, line in enumerate(is_line + [True]):
        if not line and start is None:
            start = y
        elif line and start is not None:
            if y - start > 8:
                bands.append((start, y))
            start = None
    return bands


def band_colour(pix, band) -> tuple[int, int, int]:
    y0, y1 = band
    c = Counter()
    for y in range(y0 + 2, y1 - 2, 2):
        for x in range(4, pix.width - 4, 3):
            px = pix.pixel(x, y)[:3]
            if brightness(px) > 175:  # ignore text strokes
                c[tuple(v // 8 * 8 for v in px)] += 1
    return c.most_common(1)[0][0] if c else (0, 0, 0)


def is_header(colour) -> bool:
    """Header cells are grey (unsaturated); domain rows are tinted."""
    return max(colour) - min(colour) < 12


def data_bands(pix):
    return [b for b in row_bands(pix) if not is_header(band_colour(pix, b))]


def distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def main(pdf_path: str, out: str):
    cur = json.loads(CURATION.read_text(encoding="utf-8"))
    doc = pymupdf.open(pdf_path)

    lg = cur["legend"]
    lpix = render(doc[lg["pdf_page_index"]], lg["clip"])
    lbands = data_bands(lpix)
    if len(lbands) != len(lg["domains"]):
        raise SystemExit(f"legend: expected {len(lg['domains'])} rows, found {len(lbands)}")
    legend = {dom: band_colour(lpix, b) for dom, b in zip(lg["domains"], lbands)}

    rows_out, problems = [], []
    for page in cur["pages"]:
        pix = render(doc[page["pdf_page_index"]], page["clip"])
        bands = data_bands(pix)
        if len(bands) != len(page["rows"]):
            problems.append(f"page {page['pdf_page_index']}: {len(bands)} bands vs {len(page['rows'])} transcribed rows")
        for i, (row, band) in enumerate(zip(page["rows"], bands), start=1):
            colour = band_colour(pix, band)
            ranked = sorted(legend.items(), key=lambda kv: distance(colour, kv[1]))
            best, second = ranked[0], ranked[1]
            rows_out.append({
                "pdf_page_index": page["pdf_page_index"], "row": i, "label": row["label"], "code": row["code"],
                "match": row["match"], "colour": colour, "domain": best[0],
                "colour_distance": round(distance(colour, best[1]), 1),
                "margin": round(distance(colour, second[1]) - distance(colour, best[1]), 1),
            })

    by_code: dict[str, list[dict]] = {}
    for r in rows_out:
        if r["code"]:
            by_code.setdefault(r["code"], []).append(r)
    domains = {}
    for code, rs in by_code.items():
        ds = {r["domain"] for r in rs}
        if len(ds) > 1:
            problems.append(f"{code}: rows disagree on domain {sorted(ds)}")
            continue
        domains[code] = {"domain": rs[0]["domain"], "rows": [(r["pdf_page_index"], r["row"]) for r in rs],
                         "match": rs[0]["match"], "min_margin": min(r["margin"] for r in rs)}
    result = {"legend": legend, "rows": rows_out, "domains": domains, "problems": problems}
    Path(out).write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({"rows": len(rows_out), "milestones_with_domain": len(domains), "problems": problems,
                      "counts": Counter(d["domain"] for d in domains.values())}, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
