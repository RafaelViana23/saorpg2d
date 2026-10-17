"""Pack reviewed transparent 4x4 attack atlases into 128px game frames.

The source images are already RGBA. No color removal is performed. Each source
cell is scaled by the same factor and placed against the same foot baseline so
the actor cannot change size between frames or directions.
"""

from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "attacks"
OUT = ROOT / "public" / "sprites" / "player"
ATTACKS = ("attack-1", "attack-2", "vorpal-arc")
FRAME_SIZE = 128
SOURCE_SCALE = 0.25


def extract_frames(source: Image.Image) -> list[Image.Image]:
    rgba = np.array(source)
    original = rgba[..., 3] > 8
    joined = cv2.dilate(original.astype(np.uint8), np.ones((7, 7), np.uint8))
    count, labels, stats, centers = cv2.connectedComponentsWithStats(joined, 8)
    components = sorted(
        range(1, count), key=lambda label: stats[label, cv2.CC_STAT_AREA], reverse=True
    )[:16]
    if len(components) != 16:
        raise ValueError("attack atlas must contain exactly 16 isolated characters")
    rows = []
    by_y = sorted(components, key=lambda label: centers[label][1])
    for row_start in range(0, 16, 4):
        rows.extend(sorted(by_y[row_start : row_start + 4], key=lambda label: centers[label][0]))
    frames = []
    for label in rows:
        x, y, width, height = stats[label, :4]
        isolated = rgba[y : y + height, x : x + width].copy()
        component_mask = labels[y : y + height, x : x + width] == label
        isolated[~component_mask, 3] = 0
        frame = Image.fromarray(isolated)
        frame = frame.resize(
            (round(frame.width * SOURCE_SCALE), round(frame.height * SOURCE_SCALE)),
            Image.Resampling.LANCZOS,
        )
        frames.append(frame)
    return frames


def build(name: str) -> None:
    source = Image.open(SOURCE / f"{name}.png")
    if source.mode != "RGBA" or source.getchannel("A").getextrema()[0] != 0:
        raise ValueError(f"{name}: expected genuine RGBA transparency")
    output = Image.new("RGBA", (FRAME_SIZE * 4, FRAME_SIZE * 4))
    for index, cell in enumerate(extract_frames(source)):
        row, column = divmod(index, 4)
        frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
        frame.alpha_composite(cell, ((FRAME_SIZE - cell.width) // 2, 122 - cell.height))
        output.alpha_composite(frame, (column * FRAME_SIZE, row * FRAME_SIZE))
    output.save(OUT / f"{name}.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for attack in ATTACKS:
        build(attack)


if __name__ == "__main__":
    main()
