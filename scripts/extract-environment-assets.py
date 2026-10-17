#!/usr/bin/env python3
"""Extract clean, transparent, one-id-per-file sprites from the environment atlas."""

import json
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "public/sprites/environment/reference-atlas.png"
OUTPUT = ROOT / "public/sprites/environment/cut"


def assets_from_engine():
    command = [
        "node",
        "--input-type=module",
        "-e",
        "import('./src/engine.js').then(m=>console.log(JSON.stringify("
        "m.initialAssets.filter(a=>a.atlasSource).map(({id,atlasSource})=>({id,...atlasSource})))))",
    ]
    return json.loads(subprocess.check_output(command, cwd=ROOT, text=True))


def clean_crop(image, spec):
    crop = np.array(
        image.crop(
            (
                spec["x"],
                spec["y"],
                spec["x"] + spec["w"],
                spec["y"] + spec["h"],
            )
        )
    )
    alpha = crop[:, :, 3]
    mask = (alpha >= 24).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if count <= 1:
        return Image.fromarray(crop)

    components = list(range(1, count))
    primary = max(components, key=lambda index: int(stats[index, cv2.CC_STAT_AREA]))
    keep = {primary}

    cleaned = crop.copy()
    keep_mask = np.isin(labels, list(keep))
    cleaned[:, :, 3] = np.where(keep_mask, alpha, 0).astype(np.uint8)
    ys, xs = np.where(cleaned[:, :, 3] > 0)
    if not len(xs):
        return Image.fromarray(cleaned)
    left, top = max(0, int(xs.min()) - 2), max(0, int(ys.min()) - 2)
    right = min(cleaned.shape[1], int(xs.max()) + 3)
    bottom = min(cleaned.shape[0], int(ys.max()) + 3)
    return Image.fromarray(cleaned[top:bottom, left:right])


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas = Image.open(ATLAS).convert("RGBA")
    assets = assets_from_engine()
    for spec in assets:
        clean_crop(atlas, spec).save(OUTPUT / f'{spec["id"]}.png', optimize=True)
    print(f"Extracted {len(assets)} clean assets into {OUTPUT}")


if __name__ == "__main__":
    main()
