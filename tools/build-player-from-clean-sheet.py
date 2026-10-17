"""Build the player sheets from the reviewed transparent 8x4 source.

The boxes below are intentionally explicit: the generated characters are not
assumed to occupy uniform cells. Each crop was verified against the alpha gaps.
"""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "player-clean.png"
OUT = ROOT / "public" / "sprites" / "player"
CELL_SIZE = 128
SOURCE_SCALE = 0.32
FOOT_Y = 122

ROWS = {
    "down": (44, 48, 1655, 232),
    "right": (53, 270, 1679, 458),
    "left": (39, 486, 1649, 682),
    "up": (51, 696, 1658, 896),
}

# Per-row verified horizontal cuts, chosen only inside transparent gaps.
CUTS = {
    "down": [44, 222, 438, 626, 847, 1070, 1260, 1466, 1655],
    "right": [53, 217, 445, 634, 865, 1070, 1286, 1480, 1679],
    "left": [39, 214, 435, 626, 843, 1058, 1280, 1472, 1649],
    "up": [51, 220, 437, 655, 857, 1071, 1284, 1490, 1658],
}


def normalized_frame(source: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    frame = source.crop(box)
    alpha_box = frame.getchannel("A").getbbox()
    if not alpha_box:
        raise ValueError(f"Empty player frame: {box}")
    frame = frame.crop(alpha_box)
    # Every source frame uses one global scale. Scaling each crop to its own
    # bounding box made poses with a long sword shrink relative to other poses.
    size = (
        max(1, round(frame.width * SOURCE_SCALE)),
        max(1, round(frame.height * SOURCE_SCALE)),
    )
    frame = frame.resize(size, Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (CELL_SIZE, CELL_SIZE))
    cell.alpha_composite(
        frame,
        ((CELL_SIZE - frame.width) // 2, FOOT_Y - frame.height),
    )
    return cell


FRAME_SELECTIONS = {
    "idle-armed": {
        "down": (0, 0, 0, 0),
        "up": (3, 3, 3, 3),
        "left": (0, 0, 0, 0),
        "right": (1, 1, 1, 1),
    },
    "idle-unarmed": {
        "down": (0, 0, 0, 0),
        "up": (3, 3, 3, 3),
        "left": (2, 2, 2, 2),
        "right": (2, 2, 2, 2),
    },
    "walk-armed": {
        "down": (0, 1, 2, 3),
        "up": (3, 4, 5, 6),
        "left": (0, 1, 3, 5),
        "right": (1, 3, 5, 7),
    },
    "walk-unarmed": {
        "down": (0, 1, 2, 3),
        "up": (3, 4, 5, 6),
        "left": (2, 6, 2, 6),
        "right": (2, 4, 6, 4),
    },
}


def remove_front_held_blade(frame: Image.Image) -> None:
    """Remove the silver blade; keep the green-hilt sword sheathed on the back."""
    mask = Image.new("L", frame.size)
    ImageDraw.Draw(mask).polygon(
        ((33, 127), (35, 110), (52, 93), (58, 96), (48, 120), (45, 127)),
        fill=255,
    )
    alpha = frame.getchannel("A")
    alpha.paste(0, mask=mask)
    frame.putalpha(alpha)


def build(name: str, selections: dict[str, tuple[int, ...]], source: Image.Image) -> None:
    sheet = Image.new("RGBA", (CELL_SIZE * 4, CELL_SIZE * 4))
    for row, direction in enumerate(("down", "up", "left", "right")):
        xcuts = CUTS[direction]
        _, y0, _, y1 = ROWS[direction]
        for output_column, source_column in enumerate(selections[direction]):
            frame = normalized_frame(
                source,
                (xcuts[source_column], y0, xcuts[source_column + 1], y1),
            )
            if name.endswith("unarmed") and direction == "down":
                remove_front_held_blade(frame)
            sheet.alpha_composite(
                frame,
                (output_column * CELL_SIZE, row * CELL_SIZE),
            )
    sheet.save(OUT / f"{name}.png")


def main() -> None:
    source = Image.open(SOURCE)
    if source.mode != "RGBA" or source.getchannel("A").getextrema()[0] != 0:
        raise ValueError("player-clean.png must contain genuine RGBA transparency")
    OUT.mkdir(parents=True, exist_ok=True)
    for name, selections in FRAME_SELECTIONS.items():
        build(name, selections, source)
    build("run-armed", FRAME_SELECTIONS["walk-armed"], source)
    build("run-unarmed", FRAME_SELECTIONS["walk-unarmed"], source)


if __name__ == "__main__":
    main()
