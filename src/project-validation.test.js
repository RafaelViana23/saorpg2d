import { describe, expect, it } from "vitest";
import { validateImportedProject } from "./project-validation";

const validProject = () => ({
  current: "village",
  maps: {
    village: { name: "Village", w: 20, h: 15, objects: [], portals: {} },
  },
  assets: [{ id: "tree", name: "Tree" }],
  folders: { Mundo: { Natureza: ["tree"] } },
});

describe("project import validation", () => {
  it("accepts a structurally valid project", () => {
    const project = validProject();
    expect(validateImportedProject(project)).toBe(project);
  });

  it.each([
    ["missing maps", (project) => delete project.maps],
    ["invalid dimensions", (project) => { project.maps.village.w = -1; }],
    ["unsafe dimensions", (project) => { project.maps.village.h = 501; }],
    ["invalid objects", (project) => { project.maps.village.objects = {}; }],
    ["missing current map", (project) => { project.current = "unknown"; }],
    ["duplicate assets", (project) => { project.assets.push({ id: "tree" }); }],
  ])("rejects %s", (_name, mutate) => {
    const project = validProject();
    mutate(project);
    expect(() => validateImportedProject(project)).toThrow(/Projeto incompatível/);
  });
});
