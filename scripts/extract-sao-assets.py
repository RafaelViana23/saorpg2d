#!/usr/bin/env python3
"""Slice the supplied SAO-style atlas into editor-ready transparent PNG assets."""

from collections import deque
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/Users/ayrtonborges/Downloads/Atlas de Tiles Pixel Art para RPG - cópia (1).png")
OUT = ROOT / "public/sprites/sao-assets"
MANIFEST = ROOT / "src/data/sao-assets.json"

# id, display name, crop (left, top, right, bottom), tile width, tile height, layer, opaque
SPECS = [
    ("sao_grass", "SAO · Grama", (0, 0, 192, 188), 1, 1, "terrain", True),
    ("sao_dirt", "SAO · Terra", (192, 0, 384, 188), 1, 1, "terrain", True),
    ("sao_sand_flowers", "SAO · Areia florida", (384, 0, 576, 188), 1, 1, "terrain", True),
    ("sao_wood_floor", "SAO · Piso de madeira", (576, 0, 768, 188), 1, 1, "terrain", True),
    ("sao_stone_floor", "SAO · Piso de pedra", (768, 0, 960, 188), 1, 1, "terrain", True),
    ("sao_snow", "SAO · Neve", (960, 0, 1152, 188), 1, 1, "terrain", True),
    ("sao_water", "SAO · Água", (1152, 0, 1344, 188), 1, 1, "terrain", True),
    ("sao_sand", "SAO · Areia", (1344, 0, 1536, 188), 1, 1, "terrain", True),
    ("sao_water_alt", "SAO · Água alternativa", (0, 188, 192, 377), 1, 1, "terrain", True),
    ("sao_snow_alt", "SAO · Neve alternativa", (192, 188, 384, 377), 1, 1, "terrain", True),
    ("sao_sand_alt", "SAO · Areia alternativa", (384, 188, 576, 377), 1, 1, "terrain", True),
    ("sao_rock", "SAO · Rocha", (584, 246, 715, 378), 2, 2, "decor", False),
    ("sao_bush", "SAO · Arbusto", (716, 252, 850, 378), 2, 2, "decor", False),
    ("sao_tree", "SAO · Árvore", (855, 194, 1032, 378), 3, 4, "decor", False),
    ("sao_pine", "SAO · Pinheiro", (1025, 187, 1185, 378), 3, 4, "decor", False),
    ("sao_fence_post", "SAO · Poste de cerca", (1225, 195, 1310, 377), 1, 3, "decor", False),
    ("sao_fence", "SAO · Cerca", (1315, 232, 1514, 348), 3, 2, "decor", False),
    ("sao_castle_gate", "SAO · Portão do castelo", (0, 377, 366, 607), 7, 5, "structures", False),
    ("sao_chapel", "SAO · Capela", (364, 374, 558, 607), 4, 5, "structures", False),
    ("sao_house_blue", "SAO · Casa azul", (552, 373, 787, 607), 5, 5, "structures", False),
    ("sao_weapon_shop", "SAO · Loja de armas", (779, 382, 1028, 607), 5, 5, "structures", False),
    ("sao_potion_shop", "SAO · Loja de poções", (1018, 377, 1248, 607), 5, 5, "structures", False),
    ("sao_tavern", "SAO · Taverna", (1237, 377, 1536, 607), 6, 5, "structures", False),
    ("sao_market_red", "SAO · Mercado vermelho", (0, 610, 190, 747), 4, 3, "structures", False),
    ("sao_barrel", "SAO · Barril", (176, 638, 224, 715), 1, 2, "decor", False),
    ("sao_market_blue", "SAO · Mercado azul", (210, 610, 388, 747), 4, 3, "structures", False),
    ("sao_crate", "SAO · Caixa", (377, 640, 430, 714), 1, 2, "decor", False),
    ("sao_market_green", "SAO · Mercado verde", (418, 610, 607, 747), 4, 3, "structures", False),
    ("sao_well", "SAO · Poço", (596, 607, 735, 747), 3, 3, "decor", False),
    ("sao_fountain", "SAO · Fonte", (733, 608, 918, 753), 4, 3, "decor", False),
    ("sao_notice_board", "SAO · Quadro de avisos", (914, 615, 1050, 747), 3, 3, "decor", False),
    ("sao_stone_bridge", "SAO · Ponte de pedra", (1065, 610, 1322, 747), 5, 3, "structures", False),
    ("sao_castle_tower", "SAO · Torre do castelo", (1340, 583, 1536, 864), 4, 6, "structures", False),
    ("sao_wall_light", "SAO · Muralha clara", (5, 750, 180, 864), 4, 2, "structures", False),
    ("sao_wall_dark", "SAO · Muralha escura", (165, 750, 364, 864), 4, 2, "structures", False),
    ("sao_wall_pillar", "SAO · Pilar de muralha", (365, 749, 429, 864), 1, 2, "structures", False),
    ("sao_wall_banner_blue", "SAO · Muralha com bandeira azul", (421, 749, 558, 864), 3, 2, "structures", False),
    ("sao_wall_window", "SAO · Muralha com janela", (552, 749, 655, 864), 2, 2, "structures", False),
    ("sao_wall_banner_red", "SAO · Muralha com bandeira vermelha", (641, 749, 748, 864), 2, 2, "structures", False),
    ("sao_wall_bell", "SAO · Muralha com sino", (736, 749, 806, 864), 1, 2, "structures", False),
    ("sao_wall_arch", "SAO · Muralha com arco", (795, 749, 895, 864), 2, 2, "structures", False),
    ("sao_stairs", "SAO · Escadaria", (890, 748, 991, 864), 2, 2, "structures", False),
    ("sao_wall_double", "SAO · Muralha dupla", (984, 748, 1107, 864), 3, 2, "structures", False),
    ("sao_wall_column_a", "SAO · Coluna A", (1096, 749, 1179, 864), 2, 2, "structures", False),
    ("sao_wall_column_b", "SAO · Coluna B", (1168, 749, 1261, 864), 2, 2, "structures", False),
    ("sao_wall_column_c", "SAO · Coluna C", (1248, 749, 1368, 864), 3, 2, "structures", False),
]

# The replacement atlas already contains only the isolated objects. The former
# terrain swatches are intentionally absent and must not remain in the library.
SPECS = SPECS[11:]

COMPONENT_META = [
    ("sao_pine", "SAO · Pinheiro", 3, 4, "decor"),
    ("sao_tree", "SAO · Árvore", 3, 4, "decor"),
    ("sao_fence_post", "SAO · Poste de cerca", 1, 3, "decor"),
    ("sao_fence", "SAO · Cerca", 3, 2, "decor"),
    ("sao_bush", "SAO · Arbusto", 2, 2, "decor"),
    ("sao_rock", "SAO · Rocha", 2, 2, "decor"),
    None,
    ("sao_chapel", "SAO · Capela", 4, 5, "structures"),
    ("sao_house_blue", "SAO · Casa azul", 5, 5, "structures"),
    ("sao_potion_shop", "SAO · Loja de poções", 5, 5, "structures"),
    ("sao_castle_gate", "SAO · Portão do castelo", 7, 5, "structures"),
    ("sao_tavern_tower", "SAO · Taverna e torre", 6, 9, "structures"),
    ("sao_weapon_shop", "SAO · Loja de armas", 5, 5, "structures"),
    ("sao_market_red", "SAO · Mercado vermelho", 4, 3, "structures"),
    ("sao_market_blue", "SAO · Mercado azul", 4, 3, "structures"),
    ("sao_market_green", "SAO · Mercado verde", 4, 3, "structures"),
    ("sao_well", "SAO · Poço", 3, 3, "decor"),
    ("sao_stone_bridge", "SAO · Ponte de pedra", 5, 3, "structures"),
    ("sao_fountain", "SAO · Fonte", 4, 3, "decor"),
    ("sao_notice_board", "SAO · Quadro de avisos", 3, 3, "decor"),
    ("sao_barrel", "SAO · Barril", 1, 2, "decor"),
    ("sao_wall_long", "SAO · Muralha longa", 7, 2, "structures"),
    ("sao_wall_pillar", "SAO · Pilar de muralha", 1, 2, "structures"),
    ("sao_wall_banner_blue", "SAO · Muralha com bandeira", 2, 2, "structures"),
    ("sao_wall_column_small", "SAO · Coluna curta", 1, 2, "structures"),
    ("sao_wall_center", "SAO · Muralha central", 7, 2, "structures"),
    ("sao_wall_column_a", "SAO · Coluna A", 1, 2, "structures"),
    ("sao_wall_column_b", "SAO · Coluna B", 1, 2, "structures"),
    ("sao_wall_column_c", "SAO · Coluna C", 2, 2, "structures"),
    ("sao_stairs", "SAO · Escadaria", 2, 2, "structures"),
    ("sao_wall_double", "SAO · Muralha dupla", 2, 2, "structures"),
]


def remove_connected_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    seen = set()
    queue = deque()

    def background(x, y):
        r, g, b, _ = px[x, y]
        # The source uses a warm off-white backdrop with a soft antialiased
        # fringe. A lower connected threshold removes that fringe without
        # touching enclosed light details such as plaster and stone highlights.
        return min(r, g, b) >= 188 and max(r, g, b) - min(r, g, b) <= 52

    for x in range(w):
        for y in (0, h - 1):
            if background(x, y): queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if background(x, y): queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not background(x, y): continue
        seen.add((x, y))
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen:
                queue.append((nx, ny))
    # Remove any isolated near-white specks left inside the erased backdrop.
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and min(r, g, b) >= 248 and max(r, g, b) - min(r, g, b) <= 8:
                px[x, y] = (r, g, b, 0)
    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    left, top, right, bottom = bbox
    padding = 2
    return rgba.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(w, right + padding),
        min(h, bottom + padding),
    ))


def main():
    atlas = Image.open(SOURCE).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    alpha_px = atlas.getchannel("A").load()
    width, height = atlas.size
    seen = set()
    components = []
    for y in range(height):
        for x in range(width):
            if alpha_px[x, y] < 8 or (x, y) in seen:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            pixels = []
            while stack:
                cx, cy = stack.pop()
                pixels.append((cx, cy))
                for nx, ny in ((cx-1, cy), (cx+1, cy), (cx, cy-1), (cx, cy+1)):
                    if 0 <= nx < width and 0 <= ny < height and alpha_px[nx, ny] >= 8 and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if len(pixels) >= 20:
                xs = [point[0] for point in pixels]
                ys = [point[1] for point in pixels]
                components.append((min(xs), min(ys), max(xs)+1, max(ys)+1, pixels))
    components.sort(key=lambda component: (component[1], component[0]))
    if len(components) != len(COMPONENT_META):
        raise RuntimeError(f"Expected {len(COMPONENT_META)} components, found {len(components)}")
    assets = []
    source_px = atlas.load()
    for component, meta in zip(components, COMPONENT_META):
        if meta is None:
            continue
        asset_id, name, tw, th, layer = meta
        left, top, right, bottom, pixels = component
        crop = Image.new("RGBA", (right - left + 4, bottom - top + 4))
        crop_px = crop.load()
        for px, py in pixels:
            r, g, b, a = source_px[px, py]
            if min(r, g, b) >= 248 and max(r, g, b) - min(r, g, b) <= 8:
                continue
            crop_px[px - left + 2, py - top + 2] = (r, g, b, a)
        crop.save(OUT / f"{asset_id}.png", optimize=True)
        assets.append({
            "id": asset_id, "name": name, "w": tw, "h": th, "layer": layer,
            "color": "#777", "hitbox": {"x": 0, "y": 0, "w": tw, "h": th},
            "src": f"/sprites/sao-assets/{asset_id}.png?v=4"
        })
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(assets, ensure_ascii=False, indent=2) + "\n")
    print(f"Created {len(assets)} assets in {OUT}")


if __name__ == "__main__":
    main()
