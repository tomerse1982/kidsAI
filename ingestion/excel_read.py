"""Raw workbook reader (openpyxl). Emits every non-empty row of every sheet with its
1-based Excel row number, untouched cell values and hyperlink targets.

No interpretation happens here — normalisation and validation live in the shared
TypeScript importer (src/server/import/workbook), so that the CLI import and admin
uploads apply identical rules.

Usage: python excel_read.py <workbook.xlsx> <out.json>
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path

import openpyxl


def cell_value(value):
    if value is None:
        return None
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, (int, float, bool, str)):
        return value
    return str(value)


def range_sort_key(ref: str) -> tuple[str, int]:
    m = re.match(r"([A-Z]+)(\d+)", ref)
    return (m.group(1), int(m.group(2)))


def read_workbook(path: str) -> dict:
    raw = Path(path).read_bytes()
    wb = openpyxl.load_workbook(path, data_only=True)  # formulas -> cached results
    sheets = []
    for ws in wb.worksheets:
        rows = []
        for row in ws.iter_rows():
            values = [cell_value(c.value) for c in row]
            if all(v is None or (isinstance(v, str) and not v.strip()) for v in values):
                continue
            while values and values[-1] is None:
                values.pop()
            links = {
                c.column_letter: c.hyperlink.target
                for c in row
                if c.hyperlink is not None and c.hyperlink.target
            }
            rows.append({"r": row[0].row, "cells": values, **({"links": links} if links else {})})
        sheets.append({
            "name": ws.title,
            "dimensions": ws.dimensions,
            "maxRow": ws.max_row,
            "maxCol": ws.max_column,
            # Merged ranges (e.g. "A2:A7") define the milestone groups in column A;
            # only the anchor cell carries the value.
            "merges": sorted((str(r) for r in ws.merged_cells.ranges), key=range_sort_key),
            "rows": rows,
        })
    return {
        "reader": f"openpyxl {openpyxl.__version__}",
        "file": Path(path).name,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "sheets": sheets,
    }


if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    data = read_workbook(src)
    Path(out).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"file": data["file"], "sha256": data["sha256"],
                      "sheets": {s["name"]: len(s["rows"]) for s in data["sheets"]}}, ensure_ascii=False))
