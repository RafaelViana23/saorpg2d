import { describe, expect, it } from "vitest";
import { coord, newMap, parseCoord } from "./engine";

describe("map coordinates", () => {
  it.each([
    [0, 0, "A1"],
    [25, 25, "Z26"],
    [49, 12, "M50"],
  ])("formats column %i and row %i as %s", (x, y, label) => {
    expect(coord(x, y)).toBe(label);
    expect(parseCoord(label)).toEqual({ x, y });
  });

  it.each(["", "A0", "AA1", "1A", "A-1", "A 1"])(
    "rejects invalid coordinate %j",
    (value) => expect(parseCoord(value)).toBeNull(),
  );
});

describe("newMap", () => {
  it("creates independent map collections", () => {
    const first = newMap("First", 12, 20);
    const second = newMap("Second", 8, 10);
    first.objects.push({ id: "tree" });

    expect(first).toMatchObject({ name: "First", w: 12, h: 20 });
    expect(second).toMatchObject({ name: "Second", w: 8, h: 10 });
    expect(second.objects).toEqual([]);
  });
});
