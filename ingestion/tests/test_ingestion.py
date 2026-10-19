"""Ingestion tests on the real source files (run: python -m pytest ingestion/tests)."""
from __future__ import annotations

import sys
from pathlib import Path

import openpyxl
import pymupdf
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ingestion"))

from excel_read import read_workbook  # noqa: E402
from pdf_extract import extract  # noqa: E402
from pdf_structure import parse  # noqa: E402
from rtl_text import normalize_text, visual_to_logical_rtl  # noqa: E402

SRC = ROOT / "source-files"
XLSX = SRC / "טבלה כללית מרוכזת.xlsx"
PDF_HE = SRC / "חוברת הדרכות מטפסים בסולם למעונות והגנים.pdf"
PDF_AR = SRC / "חוברת ורודה ערבית.pdf"


# ---------------------------------------------------------------- Excel ----

def test_milestone_1_1_ids_read_with_openpyxl():
    """Required exact example, read straight from the workbook with openpyxl."""
    ws = openpyxl.load_workbook(XLSX, data_only=True)["מיפוי"]
    got = [(r[1], r[2]) for r in ws.iter_rows(min_row=2, values_only=True) if r[1] and str(r[1]).startswith("1.1.")]
    assert got == [
        ("1.1.1", "pn-JcrmEDA0"),
        ("1.1.2", "LG-AImdjzSw"),
        ("1.1.3", "e4RsJQ4yJMo"),
        ("1.1.4", "dIzoimC-730"),
        ("1.1.5", "1xsVhpIbnZI"),
        ("1.1.6", "9Dct0YJ8Z84"),
    ]


def test_raw_reader_keeps_row_numbers_and_merges():
    data = read_workbook(str(XLSX))
    mapping = next(s for s in data["sheets"] if s["name"] == "מיפוי")
    assert mapping["maxRow"] == 488 and mapping["maxCol"] == 11
    row4 = next(r for r in mapping["rows"] if r["r"] == 4)
    assert row4["cells"][1] == "1.1.3" and row4["cells"][2] == "e4RsJQ4yJMo"
    assert "A2:A7" in mapping["merges"]  # milestone 1.1 group
    unified = next(s for s in data["sheets"] if s["name"] == "רישמה מאוחד ערבית")
    r327 = next(r for r in unified["rows"] if r["r"] == 327)
    assert r327["cells"][2] == 6 and r327["links"]["C"] == "https://youtu.be/vE925fTW0Xs"


# ------------------------------------------------------------------ RTL ----

def test_visual_to_logical_keeps_numbers_ltr():
    # visual (left-to-right) rendering of "גיל 6-8 שבועות" in an RTL line
    visual = "תועובש 6-8 ליג"
    assert visual_to_logical_rtl(visual) == "גיל 6-8 שבועות"


def test_arabic_presentation_forms_are_normalised():
    assert normalize_text("ﻣﻘﺪّﻣﺔ", "ar") == "مقدّمة"


# ------------------------------------------------------------------ PDF ----

@pytest.fixture(scope="module")
def structures(tmp_path_factory):
    out = {}
    for lang, pdf in (("he", PDF_HE), ("ar", PDF_AR)):
        lines = extract(str(pdf), lang)
        p = tmp_path_factory.mktemp(lang) / "lines.json"
        import json
        p.write_text(json.dumps(lines, ensure_ascii=False), encoding="utf-8")
        out[lang] = parse(str(p), str(pdf), lang)
    return out


def test_both_handbooks_have_55_milestones_in_8_chapters(structures):
    for lang in ("he", "ar"):
        s = structures[lang]
        assert len(s["milestones"]) == 55, lang
        assert [c["number"] for c in s["chapters"]] == list(range(1, 9))
        assert not [w for w in s["warnings"] if w["severity"] == "error"]


def test_codes_identical_across_languages(structures):
    assert [m["code"] for m in structures["he"]["milestones"]] == [m["code"] for m in structures["ar"]["milestones"]]


def test_page_references_point_at_the_milestone_page(structures):
    for lang, pdf in (("he", PDF_HE), ("ar", PDF_AR)):
        doc = pymupdf.open(str(pdf))
        for m in structures[lang]["milestones"]:
            text = doc[m["page_indexes"][0]].get_text(flags=pymupdf.TEXTFLAGS_TEXT | pymupdf.TEXT_IGNORE_ACTUALTEXT)
            assert m["code"] in text, (lang, m["code"], m["page_indexes"][0])
    he11 = next(m for m in structures["he"]["milestones"] if m["code"] == "1.1")
    ar11 = next(m for m in structures["ar"]["milestones"] if m["code"] == "1.1")
    assert he11["page_indexes"][0] == 8 and he11["printed_pages"][0] == 8
    assert ar11["page_indexes"][0] == 6 and ar11["printed_pages"][0] == 8


def test_milestone_1_1_content(structures):
    he = next(m for m in structures["he"]["milestones"] if m["code"] == "1.1")
    assert he["title"] == "עוקב במבט אחרי עצם נע / פנים"
    assert he["intro"].startswith("היכולת לעקוב במבט אחרי עצם נע או פנים")  # recovered from /ActualText runs
    assert "6-8 שבועות" in he["when"]
    assert [a["title"] for a in he["activities"]][:2] == ["סקרנות לפני אדם", "צעצועים צבעוניים"]
    assert he["activities"][-1]["kind"] == "parent_guidance"
    ar = next(m for m in structures["ar"]["milestones"] if m["code"] == "1.1")
    assert ar["activities"][0]["title"] == "حب استطلاع تجاه الوجه البشري"


def test_extraction_completeness(structures):
    assert structures["he"]["completeness"]["partial"] == ["2.7"]
    assert structures["ar"]["completeness"]["partial"] == []
    for lang in ("he", "ar"):
        assert structures[lang]["completeness"]["activities"] > 500
