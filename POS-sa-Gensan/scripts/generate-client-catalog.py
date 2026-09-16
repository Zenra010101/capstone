#!/usr/bin/env python3
"""Generate GensanPOS production catalog CSV from client price-list tables."""

from __future__ import annotations

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_CSV = ROOT / "backend" / "data" / "client-production-catalog.csv"

COLUMNS = [
    "SKU",
    "Name",
    "Category",
    "Unit",
    "UnitPrice",
    "Barcode",
    "Grade",
    "Size",
    "Thickness",
    "MaterialType",
    "Description",
    "StockQuantity",
]

BARCODE_START = 8903000000001
_sku_counts: dict[str, int] = {}
_barcode_seq = BARCODE_START
_rows: list[dict[str, str | int | float]] = []


def parse_price(value: int | str | None) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value if value > 0 else None
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        price = int(float(text))
    except ValueError:
        return None
    return price if price > 0 else None


def slug_token(text: str) -> str:
    text = text.strip().upper()
    text = text.replace('"', "").replace(" ", "")
    text = text.replace("/", "-").replace("X", "X").replace(".", "P")
    text = re.sub(r"[^A-Z0-9\-]", "", text)
    return text or "NA"


def unique_sku(prefix: str) -> str:
    base = prefix[:48]
    count = _sku_counts.get(base, 0)
    _sku_counts[base] = count + 1
    return base if count == 0 else f"{base}-{count + 1}"


def next_barcode() -> str:
    global _barcode_seq
    code = str(_barcode_seq)
    _barcode_seq += 1
    return code


def add_row(
    *,
    sku_prefix: str,
    name: str,
    category: str,
    unit: str,
    price: int | str,
    grade: str,
    size: str = "",
    thickness: str = "",
    material_type: str = "",
    description: str = "",
) -> None:
    unit_price = parse_price(price)
    if unit_price is None:
        return

    sku = unique_sku(sku_prefix)
    row = {
        "SKU": sku,
        "Name": name,
        "Category": category,
        "Unit": unit,
        "UnitPrice": unit_price,
        "Barcode": next_barcode(),
        "Grade": grade,
        "Size": size,
        "Thickness": thickness,
        "MaterialType": material_type,
        "Description": description or name,
        "StockQuantity": 0,
    }
    _rows.append(row)


def add_sheet_rows(grade: str, finish: str, items: list[tuple[str, int | str]], *, plate: bool = False) -> None:
    category = "Stainless Plates" if plate else "Stainless Sheets"
    unit = "sheet"
    finish_label = finish.replace(" CHK", " Checkered")
    for spec, price in items:
        thickness = spec.replace("/ 1B", "").strip()
        finish_for_row = "1B" if "/ 1B" in spec or finish == "1B" else finish
        mm = thickness.replace("mm", "").strip()
        sku_prefix = f"SS-SHT{grade}-{slug_token(finish_for_row)}-{slug_token(mm)}"
        name = f"SS Sheet {grade} {finish_for_row} {mm}mm"
        add_row(
            sku_prefix=sku_prefix,
            name=name,
            category=category,
            unit=unit,
            price=price,
            grade=grade,
            size="4ft x 8ft",
            thickness=f"{mm}mm",
            material_type=finish_for_row,
            description=f"Stainless sheet {grade} {finish_for_row} {mm}mm",
        )


def add_tube_rows(
    tube_kind: str,
    grade: str,
    finish: str,
    items: list[tuple[str, int | str]],
) -> None:
    kind_map = {
        "round": ("RT", "Round Tube", "Stainless Tubes"),
        "square": ("SQT", "Square Tube", "Stainless Tubes"),
        "rect": ("RCT", "Rectangular Tube", "Stainless Tubes"),
        "decorative": ("DEC", "Decorative Tube", "Stainless Tubes"),
        "twisted": ("TWS", "Twisted Tube", "Stainless Tubes"),
    }
    code, label, category = kind_map[tube_kind]
    for spec, price in items:
        parts = [p.strip() for p in spec.lower().replace("×", "x").split("x")]
        if tube_kind in ("round", "decorative", "twisted"):
            size = parts[0]
            wall = parts[1] if len(parts) > 1 else ""
            thickness = f"{wall}mm" if wall else ""
            size_label = f'{size}" x {wall}mm' if wall else f'{size}"'
        elif tube_kind == "square":
            size = f'{parts[0]}" x {parts[1]}"' if len(parts) >= 2 else parts[0]
            wall = parts[2] if len(parts) > 2 else ""
            thickness = f"{wall}mm" if wall else ""
            size_label = f'{size} x {wall}mm'
        else:
            size = f'{parts[0]}" x {parts[1]}"' if len(parts) >= 2 else parts[0]
            wall = parts[2] if len(parts) > 2 else ""
            thickness = f"{wall}mm" if wall else ""
            size_label = f'{size} x {wall}mm'

        sku_prefix = f"SS-{code}{grade}-{slug_token(spec)}"
        name = f"SS {label} {grade} {size_label}"
        add_row(
            sku_prefix=sku_prefix,
            name=name,
            category=category,
            unit="pc",
            price=price,
            grade=grade,
            size=size_label,
            thickness=thickness,
            material_type=finish,
            description=f"Stainless {label.lower()} {grade} {size_label} {finish}",
        )


def add_shafting_rows(grade: str, items: list[tuple[str, int]]) -> None:
    for diameter, price in items:
        size_label = f'{diameter}"'
        sku_prefix = f"SS-SHF{grade}-{slug_token(diameter)}"
        name = f"SS Shafting {grade} {size_label}"
        add_row(
            sku_prefix=sku_prefix,
            name=name,
            category="Stainless Bars",
            unit="pc",
            price=price,
            grade=grade,
            size=size_label,
            material_type="Shafting",
            description=f"Stainless shafting {grade} {size_label}",
        )


def add_bar_rows(bar_kind: str, grade: str, items: list[tuple[str, int]]) -> None:
    code = "AB" if bar_kind == "angle" else "FB"
    label = "Angle Bar" if bar_kind == "angle" else "Flat Bar"
    for spec, price in items:
        thickness_part, leg = spec.lower().split("x", 1)
        thickness = thickness_part.strip()
        leg_size = leg.strip()
        size_label = f"{thickness} x {leg_size}"
        sku_prefix = f"SS-{code}{grade}-{slug_token(spec)}"
        name = f"SS {label} {grade} {size_label}"
        add_row(
            sku_prefix=sku_prefix,
            name=name,
            category="Stainless Bars",
            unit="pc",
            price=price,
            grade=grade,
            size=size_label,
            thickness=thickness,
            material_type=label,
            description=f"Stainless {label.lower()} {grade} {size_label}",
        )


def build_catalog() -> None:
    # --- Sheets 202 ---
    add_sheet_rows("202", "2B", [
        ("0.4", 759), ("0.5", 999), ("0.6", 1164), ("0.7", 1387), ("0.8", 1616),
        ("0.9", 1808), ("1.0", 2017), ("1.2", 2470), ("1.5", 3143), ("2.0", 4287),
        ("3.0", 6528), ("4.0 / 1B", 8752),
    ])
    add_sheet_rows("202", "MIR", [
        ("0.4", 981), ("0.5", 1221), ("0.6", 1386), ("0.7", 1609), ("0.8", 1837),
        ("0.9", 2030), ("1.0", 2239), ("1.2", 2744), ("1.5", 3418), ("3.0", 4904),
    ])
    add_sheet_rows("202", "HL", [
        ("0.6", 1344), ("0.7", 1535), ("0.8", 1763), ("0.9", 1945), ("1.0", 2155),
        ("1.2", 2597), ("1.5", 3259), ("2.0", 4403), ("3.0", 6647),
    ])
    add_sheet_rows("202", "2B CHK", [
        ("1.0", 2155), ("1.2", 2597), ("1.5", 3259), ("2.0", 4403), ("3.0", 6647),
    ])
    add_sheet_rows("202", "MIR CHK", [
        ("0.6", 1386), ("0.7", 1609), ("0.8", 1837), ("0.9", 2030), ("1.0", 2303),
        ("1.2", 2755), ("1.5", 3534),
    ])

    # --- Sheets 304 ---
    add_sheet_rows("304", "2B", [
        ("0.4", 1372), ("0.5", 1622), ("0.6", 2009), ("0.7", 2359), ("0.8", 2714),
        ("0.9", 3086), ("1.0", 3464), ("1.2", 4223), ("1.5", 5361), ("2.0", 7265),
        ("3.0", 11103),
    ])
    add_sheet_rows("304", "MIR", [
        ("0.4", 1594), ("0.5", 1844), ("0.6", 2231), ("0.7", 2580), ("0.8", 2936),
        ("0.9", 3308), ("1.0", 3686), ("1.2", 4497), ("1.5", 5635), ("2.0", 7571),
        ("3.0", 11409),
    ])
    add_sheet_rows("304", "HL", [
        ("0.6", 2263), ("0.7", 2612), ("0.8", 2967), ("0.9", 3339), ("1.0", 3718),
        ("1.2", 4497), ("1.5", 5635), ("2.0", 7872), ("3.0", 11399),
    ])
    add_sheet_rows("304", "2B CHK", [
        ("0.9", 3339), ("1.0", 3718), ("1.2", 4497), ("1.5", 5635), ("2.0", 7561),
        ("3.0", 11399),
    ])
    add_sheet_rows("304", "1B", [("4.0", 13620), ("5.0", 15799), ("6.0", 18161)], plate=True)
    add_row(
        sku_prefix="SS-SHT304-PERF-1X4",
        name="SS Perforated Sheet 304 1.0 x 4mm",
        category="Stainless Sheets",
        unit="sheet",
        price=3347,
        grade="304",
        size="1.0 x 4mm",
        thickness="1.0mm",
        material_type="PERFORATED",
        description="Stainless perforated sheet 304 1.0 x 4mm hole",
    )

    # --- Round tube 202 ---
    rt202 = [
        ("1/2x1.2", 198), ("5/8x1.2", 252), ("3/4x1.2", 291), ("7/8x1.2", 346), ("1x1.2", 390),
        ("1 1/4x1.2", 519), ("1 1/2x1.2", 621), ("1 3/4x1.2", 740), ("2x1.2", 848), ("2 1/2x1.2", 1028),
        ("3x1.2", 1282), ("4x1.2", 1715), ("1/2x1.5", 238), ("5/8x1.5", 304), ("3/4x1.5", 371),
        ("7/8x1.5", 432), ("1x1.5", 492), ("1 1/4x1.5", 632), ("1 1/2x1.5", 768), ("1 3/4x1.5", 903),
        ("2x1.5", 1035), ("2 1/2x1.5", 1292), ("3x1.5", 1567), ("4x1.5", 2099),
    ]
    add_tube_rows("round", "202", "Standard", rt202)

    # --- Square tube 202 ---
    add_tube_rows("square", "202", "Standard", [
        ("1/2x1/2x1.2", 264), ("3/4x3/4x1.2", 365), ("1x1x1.2", 492), ("1 1/4x1 1/4x1.2", 599),
        ("1 1/2x1 1/2x1.2", 789), ("2x2x1.2", 1074), ("1/2x1/2x1.5", 323), ("3/4x3/4x1.5", 490),
        ("1x1x1.5", 650), ("1 1/4x1 1/4x1.5", 750), ("1 1/2x1 1/2x1.5", 996), ("2x2x1.5", 1319),
    ])

    # --- Rect tube 202 (skip empty prices) ---
    add_tube_rows("rect", "202", "Standard", [
        ("1/2x1x1.2", 398), ("1/2x2x1.2", 671), ("5/8x1 1/4x1.2", 476), ("1x1 1/2x1.2", 671),
        ("1x2x1.2", 803), ("1x3x1.2", 1072), ("2x3x1.2", 1342), ("2x4x1.2", 1615),
        ("1/2x1x1.5", 486), ("1x1 1/2x1.5", 807), ("1x2x1.5", 983), ("1x3x1.5", 1316),
        ("2x3x1.5", 1649), ("2x4x1.5", 1983),
    ])

    add_tube_rows("decorative", "202", "Decorative", [("3/4x1.2", 362), ("1x1.2", 460)])
    add_tube_rows("twisted", "202", "Twisted", [("3/4x1.2", 362), ("1x1.2", 460)])

    # --- Round tube 304 ---
    add_tube_rows("round", "304", "Standard", [
        ("1/2x1.2", 283), ("5/8x1.2", 405), ("3/4x1.2", 492), ("7/8x1.2", 578), ("1x1.2", 666),
        ("1 1/4x1.2", 836), ("1 1/2x1.2", 1014), ("1 3/4x1.2", 1188), ("2x1.2", 1362), ("2 1/2x1.2", 1710),
        ("3x1.2", 2058), ("4x1.2", 2753), ("1/2x1.5", 382), ("5/8x1.5", 488), ("3/4x1.5", 595),
        ("7/8x1.5", 700), ("1x1.5", 797), ("1 1/4x1.5", 1018), ("1 1/2x1.5", 1234), ("1 3/4x1.5", 1449),
        ("2x1.5", 1663), ("2 1/2x1.5", 1874), ("3x1.5", 2257), ("4x1.5", 3023),
    ])

    add_tube_rows("square", "304", "Standard", [
        ("1/2x1/2x1.2", 424), ("3/4x3/4x1.2", 644), ("1x1x1.2", 852), ("1 1/4x1 1/4x1.2", 1026),
        ("1 1/2x1 1/2x1.2", 1305), ("2x2x1.2", 1725), ("1/2x1/2x1.5", 520), ("3/4x3/4x1.5", 789),
        ("1x1x1.5", 1044), ("1 1/4x1 1/4x1.5", 1259), ("1 1/2x1 1/2x1.5", 1601), ("2x2x1.5", 2118),
    ])

    add_tube_rows("rect", "304", "Standard", [
        ("1/2x1x1.2", 639), ("1/2x2x1.2", 1078), ("5/8x1 1/4x1.2", 766), ("1x1 1/2x1.2", 1078),
        ("1x2x1.2", 1289), ("1x3x1.2", 1723), ("2x3x1.2", 1934), ("2x4x1.2", 2327),
        ("1/2x1x1.5", 783), ("1x1 1/2x1.5", 1308), ("1x2x1.5", 1580), ("1x3x1.5", 2115),
        ("2x3x1.5", 2376), ("2x4x1.5", 2857),
    ])

    add_tube_rows("decorative", "304", "Decorative", [("3/4x1.2", 562), ("1x1.2", 736)])
    add_tube_rows("twisted", "304", "Twisted", [("3/4x1.2", 562), ("1x1.2", 736)])

    # --- Shafting ---
    add_shafting_rows("202", [
        ("1/8", 63), ("3/16", 109), ("1/4", 152), ("5/16", 246), ("3/8", 347), ("1/2", 597),
        ("5/8", 936), ("3/4", 1417), ("1", 2268), ("1 1/4", 3937), ("1 1/2", 5669), ("2 1/2", 15747),
    ])
    add_shafting_rows("304", [
        ("1/8", 79), ("3/16", 156), ("1/4", 231), ("5/16", 388), ("3/8", 540), ("1/2", 951),
        ("5/8", 1492), ("3/4", 2218), ("1", 3621), ("1 1/4", 6162), ("1 1/2", 8873), ("2", 15774),
    ])

    # --- Angle bar ---
    ab202 = [
        ("3mmx1", 668), ("4mmx1", 882), ("5mmx1", 1191), ("6mmx1", 1403), ("3mmx1 1/2", 1155),
        ("4mmx1 1/2", 1559), ("5mmx1 1/2", 1909), ("6mmx1 1/2", 2251), ("3mmx2", 1471),
        ("4mmx2", 1742), ("5mmx2", 2165), ("6mmx2", 2855),
    ]
    ab304 = [
        ("3mmx1", 1211), ("4mmx1", 1690), ("5mmx1", 2094), ("6mmx1", 2248), ("3mmx1 1/2", 1863),
        ("4mmx1 1/2", 2477), ("5mmx1 1/2", 3166), ("6mmx1 1/2", 3593), ("3mmx2", 2358),
        ("4mmx2", 3078), ("5mmx2", 3905), ("6mmx2", 4513),
    ]
    add_bar_rows("angle", "202", ab202)
    add_bar_rows("angle", "304", ab304)

    # --- Flat bar ---
    fb202 = [
        ("3mmx1", 383), ("4mmx1", 504), ("5mmx1", 603), ("6mmx1", 721), ("3mmx1 1/2", 577),
        ("4mmx1 1/2", 771), ("5mmx1 1/2", 965), ("6mmx1 1/2", 1143), ("3mmx2", 722),
        ("4mmx2", 963), ("5mmx2", 1205), ("6mmx2", 1443),
    ]
    fb304 = [
        ("3mmx1", 590), ("4mmx1", 781), ("5mmx1", 971), ("6mmx1", 1159), ("3mmx1 1/2", 938),
        ("4mmx1 1/2", 1248), ("5mmx1 1/2", 1548), ("6mmx1 1/2", 1849), ("3mmx2", 1167),
        ("4mmx2", 1546), ("5mmx2", 1947), ("6mmx2", 2319),
    ]
    add_bar_rows("flat", "202", fb202)
    add_bar_rows("flat", "304", fb304)


def write_csv() -> None:
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(_rows)


def main() -> None:
    build_catalog()
    write_csv()
    print(f"Wrote {_rows.__len__()} products to {OUT_CSV}")


if __name__ == "__main__":
    main()
