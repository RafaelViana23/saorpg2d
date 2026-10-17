import { describe, expect, it } from "vitest";
import { animationFrame, frameIndex, movementAnimation } from "./animations";
import { attackDamage, attackImpactDelay } from "./combat";
import { isInDirectionalRange } from "./hitboxes";

describe("combat rules", () => {
  it("applies attack multipliers and impact timing", () => {
    expect(attackDamage(10, "attack-1")).toBe(10);
    expect(attackDamage(10, "attack-2")).toBe(16);
    expect(attackDamage(10, "vorpal-arc")).toBe(28);
    expect(attackImpactDelay("attack-1")).toBeCloseTo(166.67, 1);
  });

  it("only reaches targets within range and roughly in front", () => {
    const player = { x: 5, y: 5 };
    expect(isInDirectionalRange(player, { x: 6, y: 5 }, "right", 40, 32)).toBe(true);
    expect(isInDirectionalRange(player, { x: 4, y: 5 }, "right", 40, 32)).toBe(false);
    expect(isInDirectionalRange(player, { x: 7, y: 5 }, "right", 40, 32)).toBe(false);
  });
});

describe("animation rules", () => {
  const animations = {
    test: { fps: 10, frames: 3, startFrame: 2, loop: true, frame: { width: 16, height: 24 } },
    "idle-armed": { fps: 1, frames: 1, startFrame: 0, loop: true, frame: { width: 16, height: 24 } },
  };

  it("loops frames and resolves sprite-sheet rows", () => {
    expect(frameIndex("test", 0, 0, animations)).toBe(2);
    expect(frameIndex("test", 0, 300, animations)).toBe(2);
    expect(animationFrame("test", "left", 0, 100, animations)).toMatchObject({
      x: 48,
      y: 48,
      width: 16,
      height: 24,
      index: 3,
    });
  });

  it("selects movement animation from stance and speed", () => {
    expect(movementAnimation({ armed: true, moving: false })).toBe("idle-armed");
    expect(movementAnimation({ armed: false, equipped: true, moving: true })).toBe("walk-sheathed");
    expect(movementAnimation({ armed: false, moving: true, running: true })).toBe("run-unarmed");
  });
});
