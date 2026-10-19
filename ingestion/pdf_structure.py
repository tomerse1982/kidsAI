"""Stage 2 of PDF ingestion: turn positioned lines into milestone-structured content.

Input : <lang>_lines.json from pdf_extract.py (+ the PDF itself for bookmarks).
Output: <lang>_structure.json with chapters, milestones, sections, activities,
        page references and a per-milestone extraction status, plus a
        completeness report. Nothing is silently dropped: every body line of a
        milestone page is assigned to a section or reported as unassigned.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

import pymupdf

CODE_RE = re.compile(r"^(\d{1,2}\.\d{1,2})(?:\s+(.*))?$")
HEADER_MAX_Y = 52  # points; header band of a milestone page (page height ~419pt)

MARKERS = {
    "he": {
        "chapter": re.compile(r"^פרק\s+(\d+)$"),
        "when": re.compile(r"^מתי זה קורה\??"),
        "how": re.compile(r"^איך (אנחנו|נוכל)\s"),
        "remember": re.compile(r"^(זכרו|חשוב)!"),
        "curriculum": re.compile(r"^להרחבה בקוריקולום"),
        "parents": re.compile(r"^(שתפו|שיתוף) (את )?ההורים"),
        "appendix": re.compile(r"^הסולם ההתפתחותי הישראלי"),
    },
    "ar": {
        "chapter": re.compile(r"^فصل\s+(\d+)$"),
        "when": re.compile(r"^متى يحصل"),
        "how": re.compile(r"^كيف (نستطيع|يمكن)"),
        "remember": re.compile(r"^(تذك\S*|مهم)\s*!"),
        "curriculum": re.compile(r"^للتوسع"),
        "parents": re.compile(r"^(أشركوا|إشراك|شاركوا) (الأهل|الأهالي)"),
        "appendix": re.compile(r"^بعض الكلمات حول السل"),
    },
}

AGE_HINT = {"he": re.compile(r"\d|חודש|שבוע|שנ"), "ar": re.compile(r"\d|شهر|أشهر|أسابيع|سن|سنة|سنوات")}

NOISE = re.compile(r"^[\s•·\-–.,:;()\[\]!?]*$")


def clean(text: str) -> str:
    text = re.sub(r"^[•·]\s*", "", text.strip())
    return re.sub(r"\s+", " ", text).strip()


def join_lines(lines: list[str]) -> str:
    return clean(" ".join(clean(l) for l in lines if clean(l)))


def is_main_flow(line: dict, width: float) -> bool:
    """RTL body text is right-aligned; boxes that sit only on the left side are side content."""
    return line["x1"] > width * 0.6


def load_toc_codes(pdf_path: str) -> dict[str, int]:
    toc = pymupdf.open(pdf_path).get_toc()
    return {t[1].strip(): t[2] - 1 for t in toc if re.fullmatch(r"\d+\.\d+", t[1].strip())}


def find_header(page: dict) -> dict:
    head = [l for l in page["lines"] if l["y0"] < HEADER_MAX_Y]
    code, title_parts, age_parts = None, [], []
    for l in sorted(head, key=lambda l: (l["y0"], -l["x1"])):
        m = CODE_RE.match(l["text"])
        if l["x1"] < 110:  # age badge on the left
            age_parts.append(l["text"])
        elif m and l["x0"] > 500:
            code = m.group(1)
        elif m and m.group(2) and l["x0"] > 90:  # "2.5 <title>" merged on one baseline
            code = m.group(1)
            title_parts.append(m.group(2))
        elif 90 < l["x0"] and l["x1"] < 520:
            title_parts.append(l["text"])
    return {"code": code, "title_parts": title_parts, "age_parts": age_parts}


def split_title_age(title: str, language: str) -> tuple[str, str | None]:
    """Hebrew 2.7: the title and the age badge share one line ('... על הבטן 3 עד 6')."""
    m = re.match(r"^(.*?)\s+(\d+\s+עד\s+\d+)$", title) if language == "he" else None
    return (m.group(1), m.group(2)) if m else (title, None)


def parse(lines_path: str, pdf_path: str, language: str) -> dict:
    data = json.loads(Path(lines_path).read_text(encoding="utf-8"))
    mk = MARKERS[language]
    pages = data["pages"]
    toc_codes = load_toc_codes(pdf_path)
    warnings: list[dict] = []

    # --- locate chapters, milestone start pages and the appendix -----------------
    chapters, starts, appendix_start = [], {}, None
    for p in pages:
        texts = [l["text"] for l in p["lines"]]
        for t in texts[:3]:
            m = mk["chapter"].match(t)
            if m:
                chapters.append({"number": int(m.group(1)), "page_index": p["index"]})
        if appendix_start is None and p["index"] > 100 and any(mk["appendix"].match(t) for t in texts[:2]):
            appendix_start = p["index"]
        h = find_header(p)
        if h["code"]:
            starts[h["code"]] = p["index"]
    # The Arabic PDF has bookmarks: use them as the authority and validate the headers.
    for code, idx in toc_codes.items():
        if code in starts and starts[code] != idx:
            warnings.append({"severity": "error", "code": code, "message": f"header code page {starts[code]} != bookmark page {idx}"})
        starts.setdefault(code, idx)
    appendix_start = appendix_start or len(pages)

    # Printed page numbers: the books use a constant offset from the PDF index. Detected
    # numbers are occasionally missing/misread, so infer from the dominant offset and
    # report every disagreement instead of trusting a single OCR-like read.
    offsets = Counter(p["printed_page"] - p["index"] for p in pages if p["printed_page"] is not None)
    page_offset = offsets.most_common(1)[0][0] if offsets else 1
    for p in pages:
        inferred = p["index"] + page_offset
        if p["printed_page"] is not None and p["printed_page"] != inferred:
            warnings.append({"severity": "warning", "page_index": p["index"],
                             "message": f"printed page read as {p['printed_page']}, expected {inferred} (offset {page_offset})"})
        p["printed_page_detected"] = p["printed_page"]
        p["printed_page"] = inferred

    # chapter age text: the chapter page (and the following intro page) carry the age range
    for ch in chapters:
        i = ch["page_index"]
        cp = pages[i]
        ch["label_lines"] = [l["text"] for l in cp["lines"] if not mk["chapter"].match(l["text"])][:4]
        nxt = pages[i + 1] if i + 1 < len(pages) else None
        intro_lines = [l for l in (nxt["lines"] if nxt else []) if not l["bold"]]
        heading = [l["text"] for l in (nxt["lines"] if nxt else []) if l["bold"]]
        ch["age_heading"] = join_lines(heading)
        ch["intro_text"] = join_lines([l["text"] for l in intro_lines])
        ch["intro_page_index"] = i + 1
        ch["printed_page"] = cp["printed_page"]

    chapter_bounds = sorted(c["page_index"] for c in chapters) + [appendix_start]

    # --- per milestone ----------------------------------------------------------
    ordered = sorted(starts.items(), key=lambda kv: kv[1])
    milestones = []
    for n, (code, start) in enumerate(ordered):
        nxt_start = ordered[n + 1][1] if n + 1 < len(ordered) else appendix_start
        end = min([b for b in chapter_bounds if b > start] + [nxt_start])
        page_range = [start]
        for pi in range(start + 1, end):  # continuation pages: no header, real text
            if sum(len(l["text"]) for l in pages[pi]["lines"]) < 30:
                break
            page_range.append(pi)
        chapter = max((c for c in chapters if c["page_index"] < start), key=lambda c: c["page_index"], default=None)
        if chapter and int(code.split(".")[0]) != chapter["number"]:
            warnings.append({"severity": "error", "code": code, "message": f"code chapter != PDF chapter {chapter['number']}"})

        header = find_header(pages[start])
        title = join_lines(header["title_parts"])
        title, merged_age = split_title_age(title, language)
        age_text = join_lines(header["age_parts"] + ([merged_age] if merged_age else []))
        status, notes = "complete", []
        if not AGE_HINT[language].search(age_text):
            # e.g. Arabic 1.1-1.4: the age badge repeats the title (source layout defect)
            warnings.append({"severity": "warning", "code": code,
                             "message": f"age badge does not contain an age ('{age_text}'); using chapter age heading"})
            notes.append("age badge text is not an age; chapter age used")
            age_text = chapter["age_heading"] if chapter else ""
        if not title:
            status = "partial"
            notes.append("title not present in text layer")

        flow = []
        side = []
        for pi in page_range:
            p = pages[pi]
            for l in p["lines"]:
                if pi == start and l["y0"] < HEADER_MAX_Y:
                    continue
                if NOISE.match(l["text"]):
                    continue
                (flow if is_main_flow(l, p["width"]) else side).append({**l, "page_index": pi, "printed_page": p["printed_page"]})
        flow.sort(key=lambda l: (l["page_index"], round(l["y0"] / 3), -l["x1"]))
        side.sort(key=lambda l: (l["page_index"], l["y0"], -l["x1"]))

        sections = {"intro": [], "when": [], "how": [], "remember": []}
        activities: list[dict] = []
        state = "intro"
        for l in flow:
            t = clean(l["text"])
            if mk["when"].match(t):
                state = "when"
                rest = mk["when"].sub("", t).strip(" ?؟")
                if rest:
                    sections["when"].append(rest)
                continue
            if mk["how"].match(t) and l["bold"]:
                state = "how"
                continue
            if mk["remember"].match(t) and len(t) < 15:
                state = "remember"
                continue
            lead = clean(l.get("bold_lead") or "")
            title_only = l["bold"] and t.endswith(":") and len(t) < 90
            if state in ("how", "activity") and lead and mk["remember"].match(lead):
                sections["remember"].append(t)  # inline "important!" note, not an activity
                state = "remember"
                continue
            if state in ("how", "activity") and (lead.endswith(":") or title_only or (lead and len(lead) > 3)):
                act_title = (lead if lead else t).rstrip(":").strip()
                body = t[len(lead):].strip() if lead and t.startswith(lead) else ("" if title_only else t)
                kind = "parent_guidance" if mk["parents"].match(act_title) else "activity"
                activities.append({
                    "title": act_title, "lines": [body] if body else [], "kind": kind,
                    "page_index": l["page_index"], "printed_page": l["printed_page"],
                })
                state = "activity"
                continue
            if state == "activity":
                activities[-1]["lines"].append(t)
            else:
                sections[state].append(t)

        curriculum = [l["text"] for l in side]
        curriculum_text = join_lines(curriculum)
        pages_match = re.search(r"(?:עמודים|صفحة)\s*:?\s*([\d ,]+)", curriculum_text)

        acts = []
        for i, a in enumerate(activities, start=1):
            acts.append({
                "sequence": i, "title": a["title"], "text": join_lines(a["lines"]), "kind": a["kind"],
                "page_index": a["page_index"], "printed_page": a["printed_page"],
            })
        if not acts:
            status = "partial"
            notes.append("no activity bullets detected")
        for key in ("intro", "when"):
            if not sections[key]:
                status = "partial"
                notes.append(f"section '{key}' empty")

        milestones.append({
            "code": code,
            "chapter": chapter["number"] if chapter else None,
            "title": title,
            "age_text": age_text,
            "page_indexes": page_range,
            "printed_pages": [pages[i]["printed_page"] for i in page_range],
            "intro": join_lines(sections["intro"]),
            "when": join_lines(sections["when"]),
            "how_intro": join_lines(sections["how"]),
            "remember": join_lines(sections["remember"]),
            "curriculum_text": curriculum_text,
            "curriculum_pages": [int(x) for x in re.findall(r"\d+", pages_match.group(1))] if pages_match else [],
            "activities": acts,
            "extraction_status": status,
            "extraction_notes": notes,
        })

    covered = {i for m in milestones for i in m["page_indexes"]} | {c["page_index"] for c in chapters} | {c["intro_page_index"] for c in chapters}
    front = [p["index"] for p in pages if p["index"] < min(covered)]
    appendix = [p["index"] for p in pages if p["index"] >= appendix_start]
    unclassified = [p["index"] for p in pages if p["index"] not in covered and p["index"] not in front and p["index"] not in appendix]
    image_only = [p["index"] for p in pages if sum(len(l["text"]) for l in p["lines"]) < 30]

    return {
        "file": data["file"], "language": language, "page_count": data["page_count"],
        "chapters": chapters, "milestones": milestones,
        "front_matter_pages": front, "appendix_pages": appendix,
        "unclassified_pages": unclassified, "image_only_pages": image_only,
        "warnings": warnings,
        "completeness": {
            "milestones": len(milestones),
            "complete": sum(1 for m in milestones if m["extraction_status"] == "complete"),
            "partial": [m["code"] for m in milestones if m["extraction_status"] != "complete"],
            "activities": sum(len(m["activities"]) for m in milestones),
            "parent_guidance": sum(1 for m in milestones for a in m["activities"] if a["kind"] == "parent_guidance"),
            "with_remember_box": sum(1 for m in milestones if m["remember"]),
            "with_curriculum_refs": sum(1 for m in milestones if m["curriculum_pages"]),
            "pages_total": data["page_count"],
            "pages_in_milestones": sum(len(m["page_indexes"]) for m in milestones),
            "image_only_pages": image_only,
        },
    }


if __name__ == "__main__":
    lines_path, pdf_path, language, out = sys.argv[1:5]
    result = parse(lines_path, pdf_path, language)
    Path(out).write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({**result["completeness"], "warnings": len(result["warnings"])}, ensure_ascii=False))
