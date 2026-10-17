#!/usr/bin/env python3
"""Extract every transparent pixel island from the environment atlas.

Unlike a grid slicer, this reads the alpha channel, discovers the real visual
bounds, and writes one standalone PNG plus one stable catalog id per island.
"""

import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "public/sprites/environment/reference-atlas.png"
OUTPUT = ROOT / "public/sprites/environment/islands"
MANIFEST = ROOT / "src/data/environment-islands.json"


def classify(x, y, width, height):
    if y < 150:
        return "terrain"
    if y < 285:
        return "structures"
    if y < 410:
        return "decor"
    if y < 575:
        return "structures" if height >= 70 or width >= 72 else "decor"
    if y < 745:
        return "structures" if width >= 105 and height >= 65 else "decor"
    return "structures" if width >= 95 and height >= 75 else "decor"


def main():
    atlas = Image.open(ATLAS).convert("RGBA")
    pixels = np.array(atlas)
    alpha = pixels[:, :, 3]

    # A small dilation joins anti-aliased fragments belonging to one sprite,
    # while the transparent gutters between neighbouring sprites remain split.
    mask = (alpha >= 48).astype(np.uint8)
    joined = cv2.dilate(mask, np.ones((3, 3), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(joined, 8)
    components = []
    for index in range(1, count):
        x, y, width, height, area = (int(value) for value in stats[index])
        if area < 200:
            continue
        # Two neighbouring tree crowns in the source touch by a few pixels.
        # Split abnormally wide vegetation islands at their centre gutter.
        if 250 <= y < 410 and width > 160:
            local = labels[y : y + height, x : x + width] == index
            columns = local.sum(axis=0)
            start, end = width // 3, (width * 2) // 3
            split = start + int(np.argmin(columns[start:end]))
            components.append((x, y, split, height, index))
            components.append((x + split, y, width - split, height, index))
        else:
            components.append((x, y, width, height, index))

    components.sort(key=lambda item: (item[1] // 12, item[0]))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    for old in OUTPUT.glob("atlas_png_*.png"):
        old.unlink()

    manifest = []
    for number, (x, y, width, height, component) in enumerate(components, 1):
        region = labels[y : y + height, x : x + width] == component
        original_alpha = alpha[y : y + height, x : x + width]
        # Expand the joined mask by one pixel to retain soft antialiasing, but
        # never copy pixels belonging to a neighbouring component.
        region = cv2.dilate(region.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
        crop = pixels[y : y + height, x : x + width].copy()
        crop[:, :, 3] = np.where(region, original_alpha, 0).astype(np.uint8)

        ys, xs = np.where(crop[:, :, 3] > 0)
        if not len(xs):
            continue
        left, top = int(xs.min()), int(ys.min())
        right, bottom = int(xs.max()) + 1, int(ys.max()) + 1
        crop = crop[top:bottom, left:right]

        # The reference atlas presents terrain swatches inside a dark frame.
        # That frame is UI chrome, not part of the tile art. Remove it before
        # the tile is scaled to the editor's 32 px grid so adjacent terrain
        # joins seamlessly.
        preliminary_height, preliminary_width = crop.shape[:2]
        layer = classify(x, y, preliminary_width, preliminary_height)
        if layer == "terrain" and preliminary_width > 10 and preliminary_height > 10:
            frame = 15
            crop = crop[frame:-frame, frame:-frame]
            left += frame
            top += frame

        asset_id = f"atlas_png_{number:03d}"
        Image.fromarray(crop).save(OUTPUT / f"{asset_id}.png", optimize=True)
        pixel_height, pixel_width = crop.shape[:2]
        # The supplied atlas is rendered at roughly 2x the editor's 32 px
        # logical grid. Round to the closest logical footprint.
        tile_width = max(1, round(pixel_width / 52))
        tile_height = max(1, round(pixel_height / 52))
        manifest.append(
            {
                "id": asset_id,
                "name": f"Atlas PNG {number:03d}",
                "w": tile_width,
                "h": tile_height,
                "layer": layer,
                "color": "#777777",
                "hitbox": {"x": 0, "y": 0, "w": tile_width, "h": tile_height},
                "src": f"/sprites/environment/islands/{asset_id}.png",
                "atlasBounds": {
                    "x": x + left,
                    "y": y + top,
                    "w": pixel_width,
                    "h": pixel_height,
                },
            }
        )

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Extracted {len(manifest)} alpha islands with unique ids")


if __name__ == "__main__":
    main()
