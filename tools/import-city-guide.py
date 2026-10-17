#!/usr/bin/env python3
"""Convert the complete Pixel Forge city workbook into runtime map data."""

import json
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

# Workbook atlas numbers translated to the curated, named sprite library.
ASSET_ALIASES = {
    "001": "grass_flowers", "002": "grass_clean", "003": "grass_weeds",
    "004": "dirt_clean", "005": "dirt_pebbles", "006": "stone_cracked",
    "007": "stone_moss", "008": "stone_blocks", "011": "grass_flowers_alt",
    "012": "water_corner_bank_tl", "030": "stone_cracked_alt",
    "031": "stone_moss_alt", "037": "water_clean", "038": "water_lily_pad",
    "039": "waterfall_large", "067": "pine", "070": "tree",
    "071": "tree_medium", "072": "tree_round", "074": "tree_small",
    "075": "pine_small", "078": "tree_bushy", "082": "bush_flowered",
    "086": "flower_white", "088": "plant_tall", "111": "torch_stone",
    "114": "banner_blue", "121": "stairs_large", "122": "fence",
    "126": "wood_bridge_wide", "129": "sign_hanging", "130": "sign",
    "131": "barrel", "132": "crate", "133": "barrel_alt",
    "135": "bench", "136": "flower_box_large", "137": "town_hall",
    "138": "house_blue", "139": "house_red", "141": "gate",
    "145": "plant_pot", "149": "shop_blue", "150": "well_roof",
    "151": "market_red", "152": "market_blue", "154": "bridge_vertical_large",
    "155": "lamp_blue", "156": "lamp_black", "157": "house_blue_small",
    "158": "house_red_small", "159": "house_red_medium", "160": "fountain",
    "161": "lamp_blue", "162": "lamp_black", "165": "flower_box_large",
    "166": "flower_box_small", "167": "bench_wood",
}


def column_number(reference):
    letters = re.match(r"[A-Z]+", reference).group(0)
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - 64
    return value


def read_workbook(path):
    with zipfile.ZipFile(path) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(
            archive.read("xl/_rels/workbook.xml.rels")
        )
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
        sheets = {}
        for sheet in workbook.find(f"{{{NS}}}sheets"):
            target = targets[sheet.attrib[f"{{{REL}}}id"]].lstrip("/")
            if not target.startswith("xl/"):
                target = posixpath.normpath("xl/" + target)
            root = ET.fromstring(archive.read(target))
            cells = {}
            for cell in root.iter(f"{{{NS}}}c"):
                texts = [node.text or "" for node in cell.iter(f"{{{NS}}}t")]
                value = cell.find(f"{{{NS}}}v")
                if texts:
                    cells[cell.attrib["r"]] = "".join(texts)
                elif value is not None:
                    cells[cell.attrib["r"]] = value.text
            sheets[sheet.attrib["name"]] = cells
        return sheets


def map_grid(cells, allow_reserved=False):
    result = []
    for reference, raw in cells.items():
        match = re.match(r"([A-Z]+)(\d+)$", reference)
        if not match:
            continue
        worksheet_column = column_number(reference)
        worksheet_row = int(match.group(2))
        if worksheet_column < 2 or worksheet_column > 51:
            continue
        if worksheet_row < 2 or worksheet_row > 27:
            continue
        value = str(raw).strip()
        if not allow_reserved and value.startswith("↳"):
            continue
        number = re.fullmatch(r"(?:PNG\s*)?(\d{1,3})", value)
        if not number:
            continue
        result.append(
            {
                "x": worksheet_column - 2,
                "y": worksheet_row - 2,
                "id": f"atlas_png_{int(number.group(1)):03d}",
            }
        )
    return sorted(result, key=lambda item: (item["y"], item["x"]))


def sector_for(x, y):
    row = 0 if y < 13 else 1
    column = 0 if x < 16 else 1 if x < 34 else 2
    return "ABCDEF"[row * 3 + column]


def anchor_table(cells):
    anchors = []
    for row in range(2, 200):
        coordinate = cells.get(f"A{row}")
        png = cells.get(f"D{row}")
        layer_name = cells.get(f"C{row}")
        if not coordinate or not png or not layer_name:
            continue
        match = re.fullmatch(r"([A-Z])(\d+)", str(coordinate).strip())
        number = re.fullmatch(r"PNG\s*(\d{1,3})", str(png).strip())
        if not match or not number:
            continue
        anchors.append(
            {
                "x": int(match.group(2)) - 1,
                "y": ord(match.group(1)) - 65,
                "id": f"atlas_png_{int(number.group(1)):03d}",
                "layer": "structures" if layer_name == "Construção" else "decor",
                "sector": cells.get(f"B{row}"),
            }
        )
    return anchors


def main():
    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    sheets = read_workbook(source)
    expected = {
        "LEIA PRIMEIRO",
        "MAPA 50x26",
        "TERRENO 50x26",
        "CONSTRUCOES",
        "DECORACAO",
        "A1 ate Z50",
        "OBJETOS - ANCORA",
        "SETORES E IDS",
    }
    if set(sheets) != expected:
        raise ValueError(f"Abas inesperadas: {sorted(sheets)}")

    terrain = map_grid(sheets["TERRENO 50x26"], allow_reserved=True)
    structures = map_grid(sheets["CONSTRUCOES"])
    decoration = map_grid(sheets["DECORACAO"])
    if len(terrain) != 1300:
        raise ValueError(f"Terreno incompleto: {len(terrain)} de 1300 tiles")

    objects = []
    for layer, entries in (("structures", structures), ("decor", decoration)):
        for entry in entries:
            objects.append({**entry, "layer": layer, "sector": sector_for(entry["x"], entry["y"])})

    documented_anchors = anchor_table(sheets["OBJETOS - ANCORA"])
    object_keys = {(item["x"], item["y"], item["id"], item["layer"], item["sector"]) for item in objects}
    documented_keys = {(item["x"], item["y"], item["id"], item["layer"], item["sector"]) for item in documented_anchors}
    if object_keys != documented_keys:
        raise ValueError(
            "As grades CONSTRUCOES/DECORACAO divergem de OBJETOS - ANCORA: "
            f"grade-only={sorted(object_keys - documented_keys)}, "
            f"table-only={sorted(documented_keys - object_keys)}"
        )

    payload = {
        "source": source.name,
        "width": 50,
        "height": 26,
        "sectors": [
            {"id": "A", "name": "Residências", "x": 0, "y": 0, "w": 16, "h": 13},
            {"id": "B", "name": "Prefeitura / Praça", "x": 16, "y": 0, "w": 18, "h": 13},
            {"id": "C", "name": "Rio / Cachoeira", "x": 34, "y": 0, "w": 16, "h": 13},
            {"id": "D", "name": "Lojas / Mercado", "x": 0, "y": 13, "w": 16, "h": 13},
            {"id": "E", "name": "Entrada Principal", "x": 16, "y": 13, "w": 18, "h": 13},
            {"id": "F", "name": "Rio / Ponte", "x": 34, "y": 13, "w": 16, "h": 13},
        ],
        "terrain": [ASSET_ALIASES[entry["id"][-3:]] for entry in terrain],
        "objects": [
            {**item, "id": ASSET_ALIASES[item["id"][-3:]]}
            for item in objects
        ],
        "audit": {
            "sheetsRead": list(sheets),
            "worksheetCellCounts": {name: len(cells) for name, cells in sheets.items()},
            "terrainTiles": len(terrain),
            "structureAnchors": len(structures),
            "decorationAnchors": len(decoration),
            "documentedAnchorsValidated": len(documented_anchors),
            "objectsBySector": {
                sector: sum(item["sector"] == sector for item in objects)
                for sector in "ABCDEF"
            },
        },
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(payload["audit"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
