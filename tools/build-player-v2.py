"""Build normalized 4x4 player sheets from the three supplied source images.

Every frame in one source uses the same scale. This is deliberate: fitting each
pose independently makes the player visibly grow/shrink when a sword or slash
changes the source bounding box. At runtime a 128 px cell is rendered at 96 px;
the 64 px source character therefore occupies about 48 world pixels (1.5 tiles).
"""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "player-v2"
OUT = ROOT / "public" / "sprites" / "player"
CELL = 128
TARGET_CHARACTER_HEIGHT = 64
FOOT_Y = 122
OUTPUT_DIRECTIONS = (0, 1, 3, 2)  # source: down, up, right, left


def split_grid(
    path: Path,
    rows: int,
    columns: int,
    y_ranges: tuple[tuple[int, int], ...] | None = None,
) -> list[list[Image.Image]]:
    image = Image.open(path).convert("RGB")
    x_edges = [round(index * image.width / columns) for index in range(columns + 1)]
    if y_ranges is None:
        y_edges = [round(index * image.height / rows) for index in range(rows + 1)]
        y_ranges = tuple((y_edges[y], y_edges[y + 1]) for y in range(rows))
    return [
        [
            image.crop((x_edges[x], y_ranges[y][0], x_edges[x + 1], y_ranges[y][1]))
            for x in range(columns)
        ]
        for y in range(rows)
    ]


def transparent_frame(frame: Image.Image) -> Image.Image:
    """Remove only the pale background connected to the cell border.

    Connectivity preserves enclosed pale details such as the sword blade and
    attack arcs instead of deleting every near-white pixel in the image.
    """
    rgb = np.asarray(frame, dtype=np.uint8)
    minimum = rgb.min(axis=2)
    spread = rgb.max(axis=2) - minimum
    # The generated sources contain a faint gray/beige halo, especially behind
    # the hair in the up/left poses. Treat that connected neutral halo as
    # background too; enclosed pale sword pixels remain protected by outlines.
    pale = ((minimum >= 165) & (spread <= 70)).astype(np.uint8)

    count, labels = cv2.connectedComponents(pale, connectivity=8)
    border_labels = np.unique(
        np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1]))
    )
    background = np.isin(labels, border_labels[border_labels != 0])
    alpha = np.where(background, 0, 255).astype(np.uint8)

    # Remove isolated compression dust that does not belong to the character.
    foreground = (alpha > 0).astype(np.uint8)
    component_count, components, stats, _ = cv2.connectedComponentsWithStats(
        foreground, connectivity=8
    )
    keep = np.zeros_like(foreground, dtype=bool)
    for label in range(1, component_count):
        if stats[label, cv2.CC_STAT_AREA] >= 96:
            keep |= components == label
    alpha[~keep] = 0

    rgba = np.dstack((rgb, alpha))
    result = Image.fromarray(rgba, "RGBA")
    box = result.getchannel("A").getbbox()
    if box is None:
        raise ValueError("Empty frame after background removal")
    cropped = result.crop(box)
    cropped.info["source_bbox"] = box
    return cropped


def prepare_grid(
    path: Path,
    rows: int,
    columns: int,
    y_ranges: tuple[tuple[int, int], ...] | None = None,
) -> list[list[Image.Image]]:
    return [
        [transparent_frame(frame) for frame in row]
        for row in split_grid(path, rows, columns, y_ranges)
    ]


def scale_for(frames: list[Image.Image]) -> float:
    # Median rejects the taller overhead sword and slash-effect poses.
    character_height = float(np.median([frame.height for frame in frames]))
    return TARGET_CHARACTER_HEIGHT / character_height


def normalized(
    frame: Image.Image,
    scale: float,
    source_foot_y: int | None = None,
) -> Image.Image:
    width = max(1, round(frame.width * scale))
    height = max(1, round(frame.height * scale))
    resized = frame.resize((width, height), Image.Resampling.LANCZOS)
    if width > CELL or height > CELL:
        raise ValueError(f"Frame does not fit {CELL}px cell: {width}x{height}")
    cell = Image.new("RGBA", (CELL, CELL))
    if source_foot_y is None:
        top = FOOT_Y - height
    else:
        source_top = frame.info["source_bbox"][1]
        top = FOOT_Y - round((source_foot_y - source_top) * scale)
    cell.alpha_composite(resized, ((CELL - width) // 2, top))
    return cell


def save_sheet(
    name: str,
    rows: list[list[Image.Image]],
    scale: float,
    foot_y_by_source_row: tuple[int, ...] | None = None,
) -> None:
    sheet = Image.new("RGBA", (CELL * 4, CELL * 4))
    for output_row, source_row in enumerate(OUTPUT_DIRECTIONS):
        for column, frame in enumerate(rows[source_row]):
            source_foot_y = (
                foot_y_by_source_row[source_row]
                if foot_y_by_source_row is not None
                else None
            )
            sheet.alpha_composite(
                normalized(frame, scale, source_foot_y),
                (column * CELL, output_row * CELL),
            )
    sheet.save(OUT / f"{name}.png", optimize=True)


def save_movement_sheet(
    name: str,
    movement: list[list[Image.Image]],
    idle: list[list[Image.Image]],
    movement_scale: float,
    idle_scale: float,
    movement_start: int,
    idle_column: int,
) -> None:
    """Use a readable stride cycle on side views: walk, idle, walk, idle."""
    sheet = Image.new("RGBA", (CELL * 4, CELL * 4))
    for output_row, source_row in enumerate(OUTPUT_DIRECTIONS):
        if source_row in (2, 3):
            selections = (
                (movement[source_row][movement_start], movement_scale),
                (idle[source_row][idle_column], idle_scale),
                (movement[source_row][movement_start + 2], movement_scale),
                # Kept only to preserve the 4-column sheet format. Runtime uses
                # the first three frames: walk -> idle -> opposite walk.
                (movement[source_row][movement_start], movement_scale),
            )
        else:
            selections = tuple(
                (movement[source_row][movement_start + column], movement_scale)
                for column in range(4)
            )
        for column, (frame, scale) in enumerate(selections):
            sheet.alpha_composite(
                normalized(frame, scale),
                (column * CELL, output_row * CELL),
            )
    sheet.save(OUT / f"{name}.png", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    idle = prepare_grid(
        SOURCE / "idle.png",
        4,
        3,
        ((15, 340), (345, 690), (690, 1020), (1020, 1365)),
    )
    idle_scale = scale_for([frame for row in idle for frame in row])
    for name, column in (("armed", 0), ("sheathed", 1), ("unarmed", 2)):
        frames = [[row[column]] * 4 for row in idle]
        save_sheet(f"idle-{name}", frames, idle_scale)

    movement = prepare_grid(
        SOURCE / "movement.png",
        4,
        12,
        ((20, 245), (250, 475), (480, 705), (705, 930)),
    )
    movement_scale = scale_for([frame for row in movement for frame in row])
    for name, start, idle_column in (
        ("armed", 0, 0),
        ("sheathed", 4, 1),
        ("unarmed", 8, 2),
    ):
        save_movement_sheet(
            f"walk-{name}",
            movement,
            idle,
            movement_scale,
            idle_scale,
            start,
            idle_column,
        )
        save_movement_sheet(
            f"run-{name}",
            movement,
            idle,
            movement_scale,
            idle_scale,
            start,
            idle_column,
        )

    attacks = prepare_grid(SOURCE / "attacks.png", 4, 4)
    attack_scale = scale_for([frame for row in attacks for frame in row])
    for name in ("attack-1", "attack-2", "vorpal-arc"):
        # Feet measured once per direction in the original cells. Anchoring to
        # the full alpha box made the body jump whenever a sword tip extended
        # below the boots, most visibly while attacking to the right.
        save_sheet(name, attacks, attack_scale, (276, 264, 253, 247))

    print(
        "Generated player v2 sheets; global scales:",
        f"movement={movement_scale:.4f}",
        f"idle={idle_scale:.4f}",
        f"attack={attack_scale:.4f}",
    )


if __name__ == "__main__":
    main()
