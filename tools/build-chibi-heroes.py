"""Build the player and alternate hero sheets from the supplied chibi atlases.

The source atlases contain one pose for each direction.  Runtime sheets use the
same 128px/4-direction contract as the existing player renderer. Movement gets
a small three-frame step cycle; attacks transition idle -> strike -> strike ->
idle so every character can use the shared movement/combat state machine.
"""

from pathlib import Path
import json
import shutil

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "heroes"
PLAYER_OUT = ROOT / "public" / "sprites" / "player"
HEROES_OUT = ROOT / "public" / "sprites" / "personagens" / "herois"
MOVEMENT_SOURCE = SOURCE / "aventureiros.png"
ACTION_SOURCE = SOURCE / "acao.png"

CELL = 128
FOOT_Y = 119
TARGET_BODY_HEIGHT = 69
DIRECTIONS = ("down", "up", "left", "right")
HERO_IDS = (
    "espadachim-negro",
    "espadachim-sombrio",
    "espadachim-laranja",
    "arqueira-verde",
    "atirador-azul",
    "guerreiro-vermelho",
    "guerreiro-machado",
    "guerreira-rosa",
)


def grid_box(width: int, height: int, column: int, row: int, columns: int, rows: int):
    return (
        round(column * width / columns),
        round(row * height / rows),
        round((column + 1) * width / columns),
        round((row + 1) * height / rows),
    )


def isolated(source: Image.Image, box) -> Image.Image:
    frame = source.crop(box)
    array = np.asarray(frame).copy()
    alpha = array[:, :, 3]
    count, labels, stats, _ = cv2.connectedComponentsWithStats(
        (alpha > 0).astype(np.uint8), connectivity=8
    )
    if count <= 1:
        raise ValueError(f"Empty hero frame: {box}")
    main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    mx, my, mw, mh, _ = stats[main]

    def box_gap(label: int) -> float:
        x, y, w, h, _ = stats[label]
        dx = max(mx - (x + w), x - (mx + mw), 0)
        dy = max(my - (y + h), y - (my + mh), 0)
        return float((dx * dx + dy * dy) ** 0.5)

    # Preserve nearby detached weapon flashes/details while rejecting slivers
    # from a neighboring pose at the crop boundary.
    keep = [
        label for label in range(1, count)
        if label == main or (stats[label, cv2.CC_STAT_AREA] >= 4 and box_gap(label) <= 24)
    ]
    mask = np.isin(labels, keep)
    array[~mask] = 0
    ys, xs = np.nonzero(mask)
    return Image.fromarray(array, "RGBA").crop(
        (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    )


def movement_frames(source: Image.Image, hero_index: int):
    frames = {}
    # Each hero occupies two columns by two rows: front/back, then left/right.
    x_edges = (0, 136, 259, 380, 495, 616, 730, 850, 963,
               1078, 1199, 1313, 1427, 1551, 1669, 1787, 1916)
    y_edges = (0, 421, 821)
    for direction, local_column, row in (
        ("down", 0, 0), ("up", 1, 0), ("left", 0, 1), ("right", 1, 1)
    ):
        column = hero_index * 2 + local_column
        frames[direction] = isolated(
            source,
            (x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1]),
        )
    return frames


def all_action_frames(source: Image.Image) -> list[list[Image.Image]]:
    """Extract attacks by alpha islands, never by a rectangle through artwork."""
    alpha = np.asarray(source.getchannel("A"), dtype=np.uint8)
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(
        (alpha > 0).astype(np.uint8), connectivity=8
    )
    main_labels = [
        label for label in range(1, count)
        if stats[label, cv2.CC_STAT_AREA] >= 5_000
    ]
    if len(main_labels) != 32:
        raise ValueError(f"Expected 32 complete action poses, found {len(main_labels)}")

    # Attach small detached sparks to the nearest complete pose.
    assigned = {label: [label] for label in main_labels}
    for label in range(1, count):
        if label in assigned:
            continue
        center = centroids[label]
        nearest = min(
            main_labels,
            key=lambda candidate: float(np.sum((center - centroids[candidate]) ** 2)),
        )
        assigned[nearest].append(label)

    row_edges = (0, 255, 470, 680, source.height)
    rows = []
    source_array = np.asarray(source)
    for row in range(4):
        row_labels = sorted(
            (
                label for label in main_labels
                if row_edges[row] <= centroids[label][1] < row_edges[row + 1]
            ),
            key=lambda label: centroids[label][0],
        )
        if len(row_labels) != 8:
            raise ValueError(f"Expected 8 action poses in row {row}, found {len(row_labels)}")
        extracted = []
        for label in row_labels:
            mask = np.isin(labels, assigned[label])
            ys, xs = np.nonzero(mask)
            rgba = np.zeros_like(source_array)
            rgba[mask] = source_array[mask]
            extracted.append(
                Image.fromarray(rgba, "RGBA").crop(
                    (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
                )
            )
        rows.append(extracted)
    return rows


def action_frames(action_rows: list[list[Image.Image]], hero_index: int):
    hero_column = hero_index % 4
    hero_row = hero_index // 4
    column = hero_column * 2
    row = hero_row * 2
    return {
        "down": action_rows[row][column],
        "up": action_rows[row][column + 1],
        "left": action_rows[row + 1][column],
        "right": action_rows[row + 1][column + 1],
    }


def global_scale(movement: dict[str, Image.Image]) -> float:
    return TARGET_BODY_HEIGHT / max(frame.height for frame in movement.values())


def cell(frame: Image.Image, scale: float, bob: int = 0) -> Image.Image:
    size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
    sprite = frame.resize(size, Image.Resampling.LANCZOS)
    if sprite.width > CELL or sprite.height > CELL:
        fit = min((CELL - 4) / sprite.width, (CELL - 4) / sprite.height)
        sprite = sprite.resize(
            (round(sprite.width * fit), round(sprite.height * fit)),
            Image.Resampling.LANCZOS,
        )
    result = Image.new("RGBA", (CELL, CELL))
    result.alpha_composite(sprite, ((CELL - sprite.width) // 2, FOOT_Y - sprite.height + bob))
    return result


def save_sheet(path: Path, rows: dict[str, tuple[Image.Image, ...]], scale: float, bobs=(0, 0, 0, 0)):
    sheet = Image.new("RGBA", (CELL * 4, CELL * 4))
    for row, direction in enumerate(DIRECTIONS):
        for column, frame in enumerate(rows[direction]):
            sheet.alpha_composite(cell(frame, scale, bobs[column]), (column * CELL, row * CELL))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, optimize=True)


def build_hero(output: Path, movement: dict[str, Image.Image], action: dict[str, Image.Image]):
    scale = global_scale(movement)
    idle = {direction: (frame,) * 4 for direction, frame in movement.items()}
    walking = {direction: (frame,) * 4 for direction, frame in movement.items()}
    striking = {
        direction: (movement[direction], action[direction], action[direction], movement[direction])
        for direction in DIRECTIONS
    }

    for stance in ("unarmed", "sheathed", "armed"):
        save_sheet(output / f"idle-{stance}.png", idle, scale)
        save_sheet(output / f"walk-{stance}.png", walking, scale, (0, -2, 0, -1))
        save_sheet(output / f"run-{stance}.png", walking, scale, (0, -3, 0, -2))
    for attack in ("attack-1", "attack-2", "vorpal-arc"):
        save_sheet(output / f"{attack}.png", striking, scale)

    # Keep the actual isolated PNG poses as well. They are useful to inspect or
    # reuse without ever sampling across another character in an atlas.
    frames_output = output / "frames"
    frames_output.mkdir(parents=True, exist_ok=True)
    for direction in DIRECTIONS:
        movement[direction].save(frames_output / f"idle-{direction}.png", optimize=True)
        action[direction].save(frames_output / f"attack-{direction}.png", optimize=True)

    # Retain the old aliases for any consumers outside the current renderer.
    for alias, target in (("idle", "idle-armed"), ("walk", "walk-armed"), ("run", "run-armed")):
        shutil.copyfile(output / f"{target}.png", output / f"{alias}.png")


def main():
    movement_source = Image.open(MOVEMENT_SOURCE).convert("RGBA")
    action_source = Image.open(ACTION_SOURCE).convert("RGBA")
    action_rows = all_action_frames(action_source)
    manifest = []
    for index, hero_id in enumerate(HERO_IDS):
        movement = movement_frames(movement_source, index)
        action = action_frames(action_rows, index)
        output = PLAYER_OUT if index == 0 else HEROES_OUT / hero_id
        build_hero(output, movement, action)
        manifest.append({
            "id": "player" if index == 0 else hero_id,
            "name": "Player" if index == 0 else hero_id.replace("-", " ").title(),
            "path": "/sprites/player" if index == 0 else f"/sprites/personagens/herois/{hero_id}",
        })

    HEROES_OUT.mkdir(parents=True, exist_ok=True)
    (HEROES_OUT / "manifest.json").write_text(
        json.dumps(manifest[1:], ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built player plus {len(HERO_IDS) - 1} alternate heroes")


if __name__ == "__main__":
    main()
