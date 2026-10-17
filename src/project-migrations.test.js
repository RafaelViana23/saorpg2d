import { describe, expect, it } from "vitest";
import {
  captureProjectContent,
  restoreProjectContent,
} from "./project-migrations";

const oldProject = () => ({
  version: 10,
  current: "village",
  currentFloor: "floor_custom",
  maps: {
    village: {
      name: "Minha cidade editada",
      w: 20,
      h: 15,
      terrain: { "1,1": "water" },
      objects: [{ uid: "user-tree", id: "tree", x: 4, y: 7 }],
      portals: { A1: { to: "house", arrival: "B2" } },
    },
    house: { name: "Minha casa", w: 8, h: 8, objects: [], portals: {} },
  },
  assets: [
    { id: "tree", name: "Minha árvore", src: "data:image/png;base64,user" },
    { id: "custom-sign", name: "Placa", src: "data:image/png;base64,sign" },
  ],
  folders: {
    Mundo: { Natureza: ["tree"] },
    Importados: { "Meus sprites": ["custom-sign"] },
  },
  floors: [
    { id: "floor_custom", number: 1, name: "Meu andar", maps: ["village", "house"] },
  ],
});

describe("non-destructive project migration", () => {
  it("preserves edited maps, imported assets, folders and active locations", () => {
    const project = oldProject();
    const before = structuredClone(project);
    const preserved = captureProjectContent(project);

    project.version = 42;
    project.maps.village = { name: "Template", objects: [], portals: {} };
    project.maps.fields = { name: "New template map", objects: [], portals: {} };
    project.assets = [
      { id: "tree", name: "Template tree", src: "/tree.png", layer: "decor" },
      { id: "wolf", name: "Wolf", src: "/wolf.png" },
    ];
    project.folders = { Monstros: { Criaturas: ["wolf"] } };
    project.floors = [
      { id: "floor_01", number: 1, maps: ["fields"] },
      { id: "floor_02", number: 2, maps: [] },
    ];
    project.current = "fields";
    project.currentFloor = "floor_01";

    restoreProjectContent(project, preserved);

    expect(project.maps.village).toEqual(before.maps.village);
    expect(project.maps.house).toEqual(before.maps.house);
    expect(project.maps.fields.name).toBe("New template map");
    expect(project.assets.find((asset) => asset.id === "tree")).toMatchObject(
      before.assets[0],
    );
    expect(project.assets.some((asset) => asset.id === "custom-sign")).toBe(true);
    expect(project.assets.some((asset) => asset.id === "wolf")).toBe(true);
    expect(project.folders.Importados["Meus sprites"]).toEqual(["custom-sign"]);
    expect(project.folders.Monstros.Criaturas).toEqual(["wolf"]);
    expect(project.current).toBe("village");
    expect(project.currentFloor).toBe("floor_custom");
    expect(project.floors.find((floor) => floor.id === "floor_custom").maps).toEqual([
      "village",
      "house",
    ]);
    expect(project.version).toBe(42);
  });

  it("does not mutate the captured backup while merging", () => {
    const project = oldProject();
    const preserved = captureProjectContent(project);
    const backup = structuredClone(preserved);

    restoreProjectContent(project, preserved);

    expect(preserved).toEqual(backup);
  });
});
