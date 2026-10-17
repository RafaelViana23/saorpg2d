import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import {
  MousePointer2,
  Paintbrush,
  Eraser,
  PaintBucket,
  DoorOpen,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Layers,
  Undo2,
  Redo2,
  Plus,
  Minus,
  Grid3X3,
  RotateCw,
  Play,
  Square,
  Upload,
  Download,
  Image as ImageIcon,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MessageSquare,
  Map,
  Save,
  FilePlus,
  Check,
  X,
} from "lucide-react";
import {
  initialProject,
  initialAssets,
  newMap,
  drawSprite,
  renderMap,
  rotatedSize,
  coord,
  parseCoord,
  TILE,
} from "./engine";
import "./style.css";
import Gameplay from "./Gameplay";
import Controller from "./Controller";
import { randomId } from "./id";
import { supabase } from "./lib/supabase";
const clone = (x) => structuredClone(x),
  uid = randomId;
const DB_NAME = "pixel-forge-autosave",
  STORE_NAME = "projects",
  SAVE_KEY = "current";
const ENEMY_TEMPLATES = {
  slime: { hp: 28, damage: 6, xp: 12 },
  boar: { hp: 44, damage: 9, xp: 18 },
  wolf: { hp: 52, damage: 10, xp: 24 },
  kobold: { hp: 70, damage: 13, xp: 35 },
  kobold_lord: { hp: 360, damage: 18, xp: 250, boss: true, name: "Kobold Lord" },
  bee: { hp: 38, damage: 9, xp: 18 },
  plant: { hp: 62, damage: 12, xp: 28 },
  golem: { hp: 180, damage: 20, xp: 75 },
  lizard: { hp: 86, damage: 15, xp: 42 },
  skeleton: { hp: 72, damage: 14, xp: 38 },
  dragon: { hp: 320, damage: 24, xp: 140, boss: true, name: "Dragão Vermelho" },
};
let dbPromise;
function openProjectDb() {
  if (!("indexedDB" in window))
    return Promise.reject(new Error("IndexedDB indisponível"));
  return (dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
async function loadSavedProject() {
  try {
    const db = await openProjectDb();
    const data = await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(SAVE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (data) return data;
  } catch {}
  const backup = localStorage.getItem("pixel-forge-project");
  return backup ? JSON.parse(backup) : null;
}
function upgradeProject(project) {
  if ((project.version || 0) < 7) {
    const asset = initialAssets.find((a) => a.id === "stone_walk_grass_clean");
    if (asset && !project.assets.some((a) => a.id === asset.id)) {
      project.assets.push(asset);
      const terrain = project.folders?.Mundo?.Terrenos;
      if (terrain && !terrain.includes(asset.id)) terrain.unshift(asset.id);
    }
    project.version = 7;
  }
  if ((project.version || 0) < 8) {
    const asset = project.assets.find((a) => a.id === "stone_walk_grass_clean");
    if (asset) asset.src = "/terrain/stone_walk_grass_clean.png?v=2";
    project.version = 8;
  }
  if ((project.version || 0) < 9) {
    const template = initialProject();
    for (const id of ["fields", "forest", "ruins"])
      if (!project.maps[id]) project.maps[id] = template.maps[id];
    project.floors = template.floors;
    project.currentFloor = "floor_01";
    project.version = 9;
  }
  if ((project.version || 0) < 10) {
    const template = initialProject();
    for (const asset of template.assets)
      if (!project.assets.some((item) => item.id === asset.id))
        project.assets.push(asset);
    if (!project.folders.Monstros)
      project.folders.Monstros = template.folders.Monstros;
    for (const id of ["fields", "forest", "ruins"]) {
      const target = project.maps[id];
      const source = template.maps[id];
      if (target && source && !target.objects.some((object) => object.enemy))
        target.objects.push(...source.objects.filter((object) => object.enemy));
    }
    project.version = 10;
  }
  if ((project.version || 0) < 11) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    // Versions before 11 only contained sparse demo layouts for these screens.
    for (const id of ["village", "fields", "forest", "ruins"])
      project.maps[id] = template.maps[id];
    project.floors = template.floors;
    project.currentFloor = "floor_01";
    project.version = 11;
  }
  if ((project.version || 0) < 12) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    for (const id of ["village", "fields", "forest", "ruins"])
      if (project.maps[id]) project.maps[id].referenceAsset = template.maps[id].referenceAsset;
    project.version = 12;
  }
  if ((project.version || 0) < 13) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    for (const id of ["village", "fields", "forest", "ruins"])
      project.maps[id] = template.maps[id];
    project.version = 13;
  }
  if ((project.version || 0) < 14) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    for (const id of ["village", "fields", "forest", "ruins"])
      project.maps[id] = template.maps[id];
    project.version = 14;
  }
  if ((project.version || 0) < 15) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    for (const id of ["village", "fields", "forest", "ruins"])
      project.maps[id] = template.maps[id];
    project.version = 15;
  }
  if ((project.version || 0) < 16) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    for (const id of ["village", "fields", "forest", "ruins"])
      project.maps[id] = template.maps[id];
    project.version = 16;
  }
  if ((project.version || 0) < 17) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    for (const id of ["village", "fields", "forest", "ruins"])
      project.maps[id] = template.maps[id];
    project.version = 17;
  }
  if ((project.version || 0) < 18) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    for (const id of ["village", "fields", "forest", "ruins"])
      project.maps[id] = template.maps[id];
    project.version = 18;
  }
  if ((project.version || 0) < 19) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    project.version = 19;
  }
  if ((project.version || 0) < 20) {
    const template = initialProject();
    project.folders = template.folders;
    project.version = 20;
  }
  if ((project.version || 0) < 21) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    project.version = 21;
  }
  if ((project.version || 0) < 22) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    project.version = 22;
  }
  if ((project.version || 0) < 23) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    project.version = 23;
  }
  if ((project.version || 0) < 24) {
    const template = initialProject();
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    project.version = 24;
  }
  if ((project.version || 0) < 25) {
    const player = project.maps?.village?.objects?.find(
      (object) => object.id === "player",
    );
    if (player) {
      player.x = 26;
      player.y = 14;
      player.solid = false;
    }
    project.version = 25;
  }
  if ((project.version || 0) < 26) {
    const template = initialProject();
    project.maps.village = template.maps.village;
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    project.version = 26;
  }

  // v27 removes the temporary numbered atlas assets. Rebuild the city map
  // with its permanent, semantic asset IDs so restored projects do not keep
  // references to deleted atlas_png_* files.
  if ((project.version || 0) < 27) {
    const template = initialProject();
    project.maps.village = template.maps.village;
    for (const asset of template.assets) {
      const index = project.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) project.assets[index] = { ...project.assets[index], ...asset };
      else project.assets.push(asset);
    }
    project.folders = template.folders;
    project.version = 27;
  }
  if ((project.version || 0) < 28) {
    const template = initialProject();
    project.maps.village = template.maps.village;
    project.version = 28;
  }
  if ((project.version || 0) < 29) {
    project.assets = [];
    project.folders = { Importados: { "Meus sprites": [] } };
    project.version = 29;
  }
  if ((project.version || 0) < 30) {
    const template = initialProject();
    project.assets = template.assets;
    project.folders = template.folders;
    project.version = 30;
  }
  if ((project.version || 0) < 31) {
    const template = initialProject();
    project.assets = template.assets;
    project.folders = template.folders;
    project.version = 31;
  }
  if ((project.version || 0) < 32) {
    const template = initialProject();
    project.assets = template.assets;
    project.folders = template.folders;
    project.version = 32;
  }
  if ((project.version || 0) < 33) {
    const template = initialProject();
    const templateById = Object.fromEntries(
      template.assets.map((asset) => [asset.id, asset]),
    );
    project.assets = project.assets.map((asset) =>
      templateById[asset.id]?.src
        ? { ...asset, src: templateById[asset.id].src }
        : asset,
    );
    project.version = 33;
  }
  if ((project.version || 0) < 34) {
    const template = initialProject();
    project.assets = [
      ...project.assets.filter((asset) => !asset.id.startsWith("sao_")),
      ...template.assets.filter((asset) => asset.id.startsWith("sao_")),
    ];
    project.folders = template.folders;
    project.version = 34;
  }
  if ((project.version || 0) < 35) {
    const template = initialProject();
    project.assets = [
      ...project.assets.filter((asset) => !asset.id.startsWith("sao_")),
      ...template.assets.filter((asset) => asset.id.startsWith("sao_")),
    ];
    project.folders = template.folders;
    project.version = 35;
  }
  if ((project.version || 0) < 36) {
    const template = initialProject();
    const heroIds = new Set(["espadachim-sombrio", "espadachim-laranja", "guerreiro-vermelho", "guerreiro-machado", "guerreira-rosa"]);
    project.assets = [
      ...project.assets.filter((asset) => !heroIds.has(asset.id)),
      ...template.assets.filter((asset) => heroIds.has(asset.id)),
    ];
    project.folders = template.folders;
    project.version = 36;
  }
  if ((project.version || 0) < 37) {
    const template = initialProject();
    const monsterIds = new Set(["boar", "wolf", "bee", "plant", "golem", "lizard", "skeleton", "dragon"]);
    project.assets = [
      ...project.assets.filter((asset) => !monsterIds.has(asset.id)),
      ...template.assets.filter((asset) => monsterIds.has(asset.id)),
    ];
    project.folders = template.folders;
    project.version = 37;
  }
  if ((project.version || 0) < 38) {
    project.folders.Monstros ||= {};
    project.folders.Monstros.Criaturas ||= [];
    project.folders.Monstros.Chefes ||= [];
    for (const id of ["dragon", "kobold_lord"]) {
      project.folders.Monstros.Criaturas = project.folders.Monstros.Criaturas.filter((item) => item !== id);
      if (!project.folders.Monstros.Chefes.includes(id)) project.folders.Monstros.Chefes.push(id);
    }
    project.animations ||= [];
    project.version = 38;
  }
  if ((project.version || 0) < 39) {
    const characters = [
      ["player", "Rafael", "player", "/sprites/player"],
      ["espadachim-sombrio", "Kirito", "hero", "/sprites/personagens/herois/espadachim-sombrio"],
      ["espadachim-laranja", "Asuna", "hero", "/sprites/personagens/herois/espadachim-laranja"],
      ["guerreiro-vermelho", "Klein", "hero", "/sprites/personagens/herois/guerreiro-vermelho"],
      ["guerreiro-machado", "Agil", "hero", "/sprites/personagens/herois/guerreiro-machado"],
      ["guerreira-rosa", "Lisbeth", "hero", "/sprites/personagens/herois/guerreira-rosa"],
    ];
    project.animations ||= [];
    project.folders.Personagens ||= {};
    project.folders.Personagens.Player ||= [];
    project.folders.Personagens.NPCs ||= [];
    project.folders.Personagens.NPCs = project.folders.Personagens.NPCs.filter((id) => id !== "player");
    if (!project.folders.Personagens.Player.includes("player")) project.folders.Personagens.Player.push("player");
    const files = {
      front: "idle-down.png", back: "idle-up.png", right: "idle-right.png", left: "idle-left.png",
      attackFront: "attack-down.png", attackBack: "attack-up.png", attackRight: "attack-right.png", attackLeft: "attack-left.png",
    };
    for (const [characterId, name, classType, root] of characters) {
      const frames = {};
      for (const [state, filename] of Object.entries(files)) {
        const frameId = `${characterId}__${state}`;
        frames[state] = [frameId];
        if (!project.assets.some((asset) => asset.id === frameId)) project.assets.push({
          id: frameId,
          name: `${name} · ${state}`,
          w: 1,
          h: 1,
          layer: "characters",
          color: "#ffffff",
          src: `${root}/frames/${filename}`,
          hiddenFrame: true,
        });
      }
      const folderPath = classType === "player" ? "Personagens/Player" : "Personagens/Heróis";
      const record = { id: characterId, name, classType, folderPath, hp: 100, damage: 12, xp: 0, animationFps: 6, frames };
      const animationIndex = project.animations.findIndex((item) => item.id === characterId);
      if (animationIndex >= 0) project.animations[animationIndex] = { ...record, ...project.animations[animationIndex] };
      else project.animations.push(record);
      const asset = project.assets.find((item) => item.id === characterId);
      if (asset) {
        asset.src ||= `${root}/frames/idle-down.png`;
        asset.w = 1;
        asset.h = 1.5;
        asset.hitbox = { x: 0.15, y: 0.5, w: 0.7, h: 1 };
        asset.animationSet = { frames, fps: 6, classType };
      }
    }
    project.version = 39;
  }
  if ((project.version || 0) < 40) {
    for (const animation of project.animations || []) {
      const asset = project.assets.find((item) => item.id === animation.id);
      if (!asset) continue;
      const boss = animation.classType === "boss";
      asset.w = boss ? 3 : 1;
      asset.h = boss ? 4 : 1.5;
      asset.hitbox = boss
        ? { x: 0.35, y: 1, w: 2.3, h: 3 }
        : { x: 0.15, y: 0.5, w: 0.7, h: 1 };
    }
    project.version = 40;
  }
  if ((project.version || 0) < 41) {
    const removed = new Set(["arqueira-verde", "atirador-azul"]);
    project.assets = project.assets.filter((asset) =>
      !removed.has(asset.id) &&
      ![...removed].some((id) => asset.id.startsWith(`${id}__`)),
    );
    project.animations = (project.animations || []).filter((animation) => !removed.has(animation.id));
    Object.values(project.folders).forEach((subfolders) =>
      Object.keys(subfolders).forEach((subfolder) => {
        subfolders[subfolder] = subfolders[subfolder].filter((id) => !removed.has(id) && ![...removed].some((hero) => id.startsWith(`${hero}__`)));
      }),
    );
    Object.values(project.maps).forEach((map) => {
      map.objects = map.objects.filter((object) => !removed.has(object.id));
    });
    project.version = 41;
  }
  if ((project.version || 0) < 42) {
    for (const animation of project.animations || []) {
      if (animation.classType !== "boss") continue;
      const asset = project.assets.find((item) => item.id === animation.id);
      if (asset) {
        asset.w = 6;
        asset.h = 6;
        asset.hitbox = { x: 1, y: 4, w: 4, h: 2 };
      }
    }
    project.version = 42;
  }
  return project;
}
async function persistProject(project) {
  try {
    const db = await openProjectDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(project, SAVE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (error) {
    localStorage.setItem("pixel-forge-project", JSON.stringify(project));
  }
}

function SpriteThumb({ asset, size = 76 }) {
  const canvas = useRef(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !asset) return;
    const g = c.getContext("2d");
    g.clearRect(0, 0, size, size);
    g.imageSmoothingEnabled = false;
    const unit = Math.min(size / (asset.w + 0.3), size / (asset.h + 0.3));
    let timer;
    if (asset.src) {
      let im = new Image();
      im.onload = () => {
        const paint = () => {
          g.clearRect(0, 0, size, size);
          const source = asset.source;
          if (source)
            g.drawImage(im, source.x, source.y, source.w, source.h, (size - asset.w * unit) / 2, (size - asset.h * unit) / 2, asset.w * unit, asset.h * unit);
          else if (asset.animation?.frames > 1) {
            const frames = Math.max(1, Math.floor(asset.animation.frames));
            const frame = Math.floor(Date.now() / (1000 / Math.max(1, asset.animation.fps || 6))) % frames;
            const legacyVertical = asset.animation.direction === "vertical";
            const columns = Math.max(1, Math.floor(asset.animation.columns || (legacyVertical ? 1 : frames)));
            const rows = Math.max(1, Math.floor(asset.animation.rows || (legacyVertical ? frames : 1)));
            const sw = im.naturalWidth / columns;
            const sh = im.naturalHeight / rows;
            const column = frame % columns;
            const row = Math.floor(frame / columns) % rows;
            g.drawImage(im, column * sw, row * sh, sw, sh, (size - asset.w * unit) / 2, (size - asset.h * unit) / 2, asset.w * unit, asset.h * unit);
          } else g.drawImage(im, (size - asset.w * unit) / 2, (size - asset.h * unit) / 2, asset.w * unit, asset.h * unit);
        };
        paint();
        if (asset.animation?.frames > 1) timer = setInterval(paint, 1000 / Math.max(1, asset.animation.fps || 6));
      };
      im.src = asset.src;
    } else
      drawSprite(
        g,
        asset,
        (size - asset.w * unit) / 2,
        (size - asset.h * unit) / 2,
        unit,
      );
    return () => clearInterval(timer);
  }, [asset, size]);
  return (
    <canvas width={size} height={size} ref={canvas} className="sprite-thumb" />
  );
}
const ANIMATION_STATES = [
  ["front", "Frente"], ["back", "Costas"], ["right", "Direita"], ["left", "Esquerda"],
  ["attackFront", "Ataque frente"], ["attackBack", "Ataque costas"],
  ["attackRight", "Ataque direita"], ["attackLeft", "Ataque esquerda"],
];
function AnimationPreview({ draft, assetById }) {
  const [tick, setTick] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 52 });
  const [facing, setFacing] = useState("front");
  const [attacking, setAttacking] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1000 / Math.max(1, +draft.animationFps || 6));
    return () => clearInterval(timer);
  }, [draft.animationFps]);
  const key = attacking ? `attack${facing[0].toUpperCase()}${facing.slice(1)}` : facing;
  const frames = draft.frames?.[key] || [];
  const asset = assetById[frames[tick % Math.max(1, frames.length)]];
  const frameSize = draft.classType === "boss"
    ? { width: 210, height: 210 }
    : { width: 96, height: 144 };
  const move = (direction, dx, dy) => {
    setFacing(direction);
    setAttacking(false);
    setPosition((point) => ({ x: Math.max(8, Math.min(92, point.x + dx)), y: Math.max(15, Math.min(78, point.y + dy)) }));
  };
  const attack = () => {
    setAttacking(true);
    setTimeout(() => setAttacking(false), 550);
  };
  useEffect(() => {
    const onKeyDown = (event) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target?.tagName)) return;
      const key = event.key.toLowerCase();
      const commands = {
        arrowup: ["back", 0, -4],
        w: ["back", 0, -4],
        arrowdown: ["front", 0, 4],
        s: ["front", 0, 4],
        arrowleft: ["left", -4, 0],
        a: ["left", -4, 0],
        arrowright: ["right", 4, 0],
        d: ["right", 4, 0],
      };
      if (commands[key]) {
        event.preventDefault();
        move(...commands[key]);
      } else if (key === "j" || key === " ") {
        event.preventDefault();
        if (!event.repeat) attack();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  return (
    <div className="animation-tester">
      <div className="animation-mini-map">
        <div className="animation-test-character" style={{ left: `${position.x}%`, top: `${position.y}%`, width: frameSize.width, height: frameSize.height }}>
          {asset ? <img src={asset.src} alt="" /> : <span>Envie frames</span>}
          <i className="feet-baseline" />
        </div>
      </div>
      <div className="animation-test-controls">
        <small>{ANIMATION_STATES.find(([state]) => state === key)?.[1] || key}</small>
      </div>
      <div className="animation-key-hint">WASD / setas para andar · J / Espaço para atacar</div>
    </div>
  );
}
function AuthControl({ user, ready }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const sendMagicLink = async (event) => {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setSending(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: location.origin },
    });
    setMessage(error ? error.message : "Link enviado. Confira seu e-mail.");
    setSending(false);
  };

  if (!ready) return <span className="auth-status">Conta...</span>;
  if (user)
    return (
      <div className="auth-account">
        <span title={user.email}>{user.email}</span>
        <button onClick={() => supabase?.auth.signOut()}>Sair</button>
      </div>
    );
  return (
    <div className="auth-login">
      <button onClick={() => setOpen((value) => !value)}>Entrar</button>
      {open && (
        <form className="auth-popover" onSubmit={sendMagicLink}>
          <strong>Salvar na nuvem</strong>
          <small>Receba um link de acesso, sem senha.</small>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu@email.com"
            required
          />
          <button className="primary" disabled={sending}>
            {sending ? "Enviando..." : "Enviar link"}
          </button>
          {message && <small className="auth-message">{message}</small>}
        </form>
      )}
    </div>
  );
}

function App() {
  const [project, setProject] = useState(() => upgradeProject(initialProject())),
    [mode, setMode] = useState("editor"),
    [selected, setSelected] = useState("tree"),
    [selectedRotation, setSelectedRotation] = useState(0),
    [multiSelected, setMultiSelected] = useState([]),
    [selectedCell, setSelectedCell] = useState(null),
    [selectedRange, setSelectedRange] = useState(null),
    [tool, setTool] = useState("cursor"),
    [zoom, setZoom] = useState(1),
    [grid, setGrid] = useState(true),
    [opened, setOpened] = useState({}),
    [active, setActive] = useState(null),
    [hover, setHover] = useState(null),
    [modal, setModal] = useState(null),
    [draft, setDraft] = useState({}),
    [playing, setPlaying] = useState(false),
    [player, setPlayer] = useState({ x: 10, y: 18 }),
    [playerFacing, setPlayerFacing] = useState("down"),
    [playerStep, setPlayerStep] = useState(0),
    [speech, setSpeech] = useState(""),
    [day, setDay] = useState("day"),
    [cycle, setCycle] = useState(false),
    [clock, setClock] = useState(0),
    [status, setStatus] = useState("Pronto"),
    [floorExpanded, setFloorExpanded] = useState(true),
    [storageReady, setStorageReady] = useState(false),
    [saveState, setSaveState] = useState("Carregando..."),
    [user, setUser] = useState(null),
    [authReady, setAuthReady] = useState(false),
    [projectCloudReady, setProjectCloudReady] = useState(false),
    [projectCloudState, setProjectCloudState] = useState("Save local");
  const map = project.maps[project.current],
    currentFloor =
      project.floors?.find((floor) => floor.id === project.currentFloor) ||
      project.floors?.[0],
    assetById = useMemo(
      () => Object.fromEntries(project.assets.map((a) => [a.id, a])),
      [project.assets],
    ),
    selectedAsset = assetById[selected];
  const selectMap = (id) => {
    if (!project.maps[id]) return;
    setProject((p) => ({ ...p, current: id }));
    setActive(null);
    setSelectedCell(null);
    setSelectedRange(null);
    setPlaying(false);
  };
  const sizeOf = (o) => rotatedSize(assetById[o.id], o.rotation || 0);
  const canvas = useRef(null),
    fileRef = useRef(null),
    pngRef = useRef(null),
    history = useRef([]),
    future = useRef([]),
    drag = useRef(null),
    clipboard = useRef(null),
    pasteTargetRange = useRef(false),
    images = useRef({});
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let cancelled = false;
    loadSavedProject()
      .then((saved) => {
        if (cancelled) return;
        if (saved?.maps && saved?.assets && saved?.folders) {
          setProject(upgradeProject(saved));
          setStatus("Projeto restaurado");
        }
        setSaveState("Salvo");
      })
      .catch(() => {
        if (!cancelled) setSaveState("Armazenamento indisponível");
      })
      .finally(() => {
        if (!cancelled) setStorageReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    let cancelled = false;
    setSaveState("Salvando...");
    persistProject(project)
      .then(() => {
        if (!cancelled) setSaveState("Salvo automaticamente");
      })
      .catch(() => {
        if (!cancelled) setSaveState("Falha ao salvar");
      });
    return () => {
      cancelled = true;
    };
  }, [project, storageReady]);
  useEffect(() => {
    if (!storageReady || !authReady) return undefined;
    if (!supabase || !user) {
      setProjectCloudReady(false);
      setProjectCloudState("Salvo neste dispositivo");
      return undefined;
    }
    let cancelled = false;
    setProjectCloudReady(false);
    setProjectCloudState("Carregando projeto da nuvem...");
    supabase
      .from("editor_projects")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setProjectCloudState("Nuvem indisponível · cópia local ativa");
          return;
        }
        if (data?.data?.maps && data.data.assets && data.data.folders) {
          setProject(upgradeProject(clone(data.data)));
          setStatus("Projeto restaurado da nuvem");
        } else {
          const { error: uploadError } = await supabase
            .from("editor_projects")
            .upsert({
              user_id: user.id,
              data: project,
              updated_at: new Date().toISOString(),
            });
          if (uploadError) {
            setProjectCloudState("Nuvem indisponível · cópia local ativa");
            return;
          }
        }
        if (!cancelled) {
          setProjectCloudReady(true);
          setProjectCloudState("Projeto sincronizado");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, storageReady, user?.id]);
  useEffect(() => {
    if (!supabase || !user || !projectCloudReady) return undefined;
    setProjectCloudState("Sincronizando projeto...");
    const timeout = window.setTimeout(async () => {
      const { error } = await supabase.from("editor_projects").upsert({
        user_id: user.id,
        data: project,
        updated_at: new Date().toISOString(),
      });
      setProjectCloudState(
        error ? "Nuvem indisponível · cópia local ativa" : "Projeto sincronizado",
      );
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [project, projectCloudReady, user?.id]);
  const commit = useCallback((fn) => {
    setProject((old) => {
      history.current.push(clone(old));
      if (history.current.length > 90) history.current.shift();
      future.current = [];
      const next = clone(old);
      fn(next);
      return next;
    });
  }, []);
  const undo = useCallback(() => {
    if (!history.current.length) return;
    setProject((old) => {
      future.current.push(clone(old));
      return history.current.pop();
    });
    setActive(null);
  }, []);
  const redo = useCallback(() => {
    if (!future.current.length) return;
    setProject((old) => {
      history.current.push(clone(old));
      return future.current.pop();
    });
    setActive(null);
  }, []);
  useEffect(() => {
    for (let a of project.assets.filter((a) => a.src)) {
      if (images.current[a.id]?.src === a.src) continue;
      const img = new Image();
      img.onload = () => setClock((n) => n + 1);
      img.src = a.src;
      images.current[a.id] = { src: a.src, img };
    }
  }, [project.assets]);
  const visibleNight = day === "night" ? 1 : day === "dusk" ? 0.48 : 0;
  useEffect(() => {
    renderMap(canvas.current, map, project.assets, {
      zoom,
      grid,
      selectedObject: map.objects.find((o) => o.uid === active),
      selectedCell,
      selectedRange,
      hover,
      tool,
      selectedAsset,
      selectedRotation,
      play: playing,
      player,
      playerFacing,
      playerStep,
      night: visibleNight,
      images: Object.fromEntries(
        Object.entries(images.current).map(([id, v]) => [id, v.img]),
      ),
    });
  }, [
    map,
    project.assets,
    zoom,
    grid,
    active,
    selectedCell,
    selectedRange,
    hover,
    tool,
    selectedAsset,
    selectedRotation,
    playing,
    player,
    playerFacing,
    playerStep,
    visibleNight,
    clock,
  ]);
  useEffect(() => {
    if (!cycle || !playing) return;
    const t = setInterval(
      () =>
        setDay((d) => (d === "day" ? "dusk" : d === "dusk" ? "night" : "day")),
      7000,
    );
    return () => clearInterval(t);
  }, [cycle, playing]);
  const point = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / (TILE * zoom)),
      y: Math.floor((e.clientY - r.top) / (TILE * zoom)),
    };
  };
  const valid = (x, y, m = map) => x >= 0 && y >= 0 && x < m.w && y < m.h;
  const hit = (x, y, m = map) =>
    [...m.objects].reverse().find((o) => {
      let a = assetById[o.id];
      return (
        a &&
        x >= o.x &&
        x < o.x + sizeOf(o).w &&
        y >= o.y &&
        y < o.y + sizeOf(o).h &&
        m.visible[a.layer] !== false
      );
    });
  const erase = (x, y) => {
    if (!valid(x, y)) return;
    const obj = hit(x, y);
    commit((p) => {
      let m = p.maps[p.current];
      if (obj) m.objects = m.objects.filter((o) => o.uid !== obj.uid);
      else {
        m.ground[y * m.w + x] = "grass";
        delete m.terrainRotations?.[y * m.w + x];
      }
      delete m.portals[coord(x, y)];
      delete m.collisions[coord(x, y)];
    });
    if (obj?.uid === active) setActive(null);
  };
  const eraseSelection = () => {
    if (!selectedRange) return false;
    const left = Math.min(selectedRange.x1, selectedRange.x2);
    const right = Math.max(selectedRange.x1, selectedRange.x2);
    const top = Math.min(selectedRange.y1, selectedRange.y2);
    const bottom = Math.max(selectedRange.y1, selectedRange.y2);
    commit((p) => {
      const m = p.maps[p.current];
      const baseTerrain = p.current === "village" ? "grass_clean" : "grass";
      if (!m.locked.terrain) {
        for (let y = top; y <= bottom; y++) {
          for (let x = left; x <= right; x++) {
            const index = y * m.w + x;
            m.ground[index] = baseTerrain;
            delete m.terrainRotations?.[index];
          }
        }
      }
      m.objects = m.objects.filter((object) => {
        const asset = assetById[object.id];
        if (!asset || m.locked[asset.layer]) return true;
        const footprint = rotatedSize(asset, object.rotation || 0);
        return !(
          object.x <= right &&
          object.x + footprint.w > left &&
          object.y <= bottom &&
          object.y + footprint.h > top
        );
      });
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          delete m.portals[coord(x, y)];
          delete m.collisions[coord(x, y)];
        }
      }
    });
    setSelectedRange(null);
    setSelectedCell(null);
    setActive(null);
    setStatus(`Seleção apagada: ${right - left + 1}×${bottom - top + 1}`);
    return true;
  };
  const paint = (x, y, paintTool = tool) => {
    if (!valid(x, y) || !selectedAsset) return;
    if (paintTool === "portal") {
      setDraft({
        dest:
          Object.keys(project.maps).find((k) => k !== project.current) ||
          project.current,
        arrival: "B3",
        portalWidth: 1,
      });
      setModal({ type: "portal", cell: coord(x, y) });
      return;
    }
    if (paintTool === "collision") {
      commit((p) => {
        const m = p.maps[p.current],
          k = coord(x, y);
        m.collisions[k] = !m.collisions[k];
      });
      return;
    }
    if (paintTool === "erase") {
      erase(x, y);
      return;
    }
    if (paintTool === "fill") {
      if (selectedAsset.layer !== "terrain" || map.locked.terrain) return;
      commit((p) => {
        const m = p.maps[p.current],
          start = y * m.w + x,
          old = m.ground[start],
          stack = [start],
          seen = new Set();
        while (stack.length) {
          const i = stack.pop();
          if (seen.has(i) || m.ground[i] !== old) continue;
          seen.add(i);
          m.ground[i] = selected;
          (m.terrainRotations ??= {})[i] = selectedRotation;
          let a = i % m.w,
            b = Math.floor(i / m.w);
          if (a > 0) stack.push(i - 1);
          if (a < m.w - 1) stack.push(i + 1);
          if (b > 0) stack.push(i - m.w);
          if (b < m.h - 1) stack.push(i + m.w);
        }
      });
      return;
    }
    if (selectedAsset.layer === "terrain") {
      if (map.locked.terrain) return;
      commit((p) => {
        const m = p.maps[p.current];
        const size = rotatedSize(selectedAsset, selectedRotation);
        const brushW = Math.max(1, Math.round(size.w));
        const brushH = Math.max(1, Math.round(size.h));
        for (let row = y; row < Math.min(m.h, y + brushH); row++) {
          for (let column = x; column < Math.min(m.w, x + brushW); column++) {
            const index = row * m.w + column;
            m.ground[index] = selected;
            (m.terrainRotations ??= {})[index] = selectedRotation;
          }
        }
      });
    } else if (
      !map.locked[selectedAsset.layer] &&
      x + rotatedSize(selectedAsset, selectedRotation).w <= map.w &&
      y + rotatedSize(selectedAsset, selectedRotation).h <= map.h
    ) {
      commit((p) => {
        const m = p.maps[p.current];
        m.objects = m.objects.filter((o) => {
          let a = assetById[o.id];
          return (
            a?.layer !== selectedAsset.layer ||
            !(
              x < o.x + sizeOf(o).w &&
              x + rotatedSize(selectedAsset, selectedRotation).w > o.x &&
              y < o.y + sizeOf(o).h &&
              y + rotatedSize(selectedAsset, selectedRotation).h > o.y
            )
          );
        });
        m.objects.push({
          uid: uid(),
          id: selected,
          x,
          y,
          rotation: selectedRotation,
          layer: selectedAsset.layer,
          solid: ![
            "torch",
            "bridge",
            "bridge_h",
            "bridge_side",
            "bridge_side_v",
            "player",
          ].includes(selected),
          ...(selected === "npc"
            ? { name: "Aldeão", dialogue: "Olá, viajante!" }
            : {}),
          ...(selectedAsset.enemy || ENEMY_TEMPLATES[selected]
            ? { enemy: { ...(selectedAsset.enemy || ENEMY_TEMPLATES[selected]) } }
            : {}),
        });
      });
    }
  };
  const onDown = (e) => {
    if (e.button !== 0 || playing) return;
    setMultiSelected([]);
    const p = point(e);
    if (!valid(p.x, p.y)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.ctrlKey || e.metaKey) {
      pasteTargetRange.current = true;
      setSelectedRange({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      setSelectedCell(p);
      setActive(null);
      drag.current = tool === "portal"
        ? { portalSelecting: true, start: p }
        : { selecting: true, start: p };
      return;
    }
    if (e.shiftKey && selectedAsset) {
      setSelectedRange(null);
      setActive(null);
      setTool("paint");
      drag.current = { massPainting: true, last: coord(p.x, p.y) };
      paint(p.x, p.y, "paint");
      return;
    }
    setSelectedRange(null);
    if (tool === "portal") {
      setSelectedRange({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      setSelectedCell(null);
      setActive(null);
      drag.current = { portalSelecting: true, start: p };
      return;
    }
    if (tool === "cursor") {
      let o = hit(p.x, p.y);
      setSelectedCell(p);
      setActive(o?.uid || null);
      const id = o?.id || map.ground[p.y * map.w + p.x];
      if (id) {
        setSelected(id);
        setSelectedRotation(
          o?.rotation || map.terrainRotations?.[p.y * map.w + p.x] || 0,
        );
        for (const [folder, subs] of Object.entries(project.folders))
          for (const [sub, ids] of Object.entries(subs))
            if (ids.includes(id))
              setOpened((v) => ({
                ...v,
                [folder]: true,
                [folder + "/" + sub]: true,
              }));
      }
      if (o)
        drag.current = {
          uid: o.uid,
          dx: p.x - o.x,
          dy: p.y - o.y,
          started: false,
        };
    } else {
      drag.current = { painting: true, last: coord(p.x, p.y) };
      paint(p.x, p.y);
    }
  };
  const onMove = (e) => {
    const p = point(e);
    setHover(valid(p.x, p.y) ? p : null);
    if (!valid(p.x, p.y) || !drag.current) return;
    const d = drag.current;
    if (d.portalSelecting) {
      d.end = {
        x: Math.max(0, Math.min(map.w - 1, p.x)),
        y: d.start.y,
      };
      setSelectedRange({
        x1: d.start.x,
        y1: d.start.y,
        x2: d.end.x,
        y2: d.start.y,
      });
      return;
    }
    if (d.selecting) {
      setSelectedRange({
        x1: d.start.x,
        y1: d.start.y,
        x2: Math.max(0, Math.min(map.w - 1, p.x)),
        y2: Math.max(0, Math.min(map.h - 1, p.y)),
      });
      return;
    }
    if (d.massPainting) {
      const cell = coord(p.x, p.y);
      if (d.last !== cell) {
        d.last = cell;
        paint(p.x, p.y, "paint");
      }
      return;
    }
    if (d.uid) {
      let obj = map.objects.find((o) => o.uid === d.uid),
        a = obj && assetById[obj.id];
      if (!a || map.locked[a.layer]) return;
      let footprint = sizeOf(obj),
        x = Math.max(0, Math.min(map.w - footprint.w, p.x - d.dx)),
        y = Math.max(0, Math.min(map.h - footprint.h, p.y - d.dy));
      if (x === obj.x && y === obj.y) return;
      if (!d.started) {
        history.current.push(clone(project));
        future.current = [];
        d.started = true;
      }
      setProject((prev) => {
        const next = clone(prev),
          target = next.maps[next.current].objects.find((o) => o.uid === d.uid);
        if (target) {
          target.x = x;
          target.y = y;
        }
        return next;
      });
    } else if (
      d.painting &&
      tool === "paint" &&
      selectedAsset?.layer === "terrain" &&
      d.last !== coord(p.x, p.y)
    ) {
      d.last = coord(p.x, p.y);
      paint(p.x, p.y);
    }
  };
  const onUp = () => {
    const currentDrag = drag.current;
    drag.current = null;
    if (!currentDrag?.portalSelecting) return;
    const start = currentDrag.start;
    const end = currentDrag.end || start;
    const left = Math.min(start.x, end.x);
    const width = Math.abs(end.x - start.x) + 1;
    setDraft({
      dest: Object.keys(project.maps).find((key) => key !== project.current) || project.current,
      arrival: "B3",
      portalWidth: width,
    });
    setModal({ type: "portal", cell: coord(left, start.y) });
  };
  const cellAssets =
    selectedCell && valid(selectedCell.x, selectedCell.y)
      ? [
          {
            id: map.ground[selectedCell.y * map.w + selectedCell.x],
            layer: "terrain",
          },
          ...map.objects
            .filter((o) => {
              const a = assetById[o.id];
              return (
                a &&
                selectedCell.x >= o.x &&
                selectedCell.x < o.x + sizeOf(o).w &&
                selectedCell.y >= o.y &&
                selectedCell.y < o.y + sizeOf(o).h
              );
            })
            .map((o) => ({
              id: o.id,
              layer: o.layer || assetById[o.id].layer,
            })),
        ]
      : [];
  const openAsset = (a) => {
    let folderPath = "Importados/Meus sprites";
    Object.entries(project.folders).some(([folder, subfolders]) =>
      Object.entries(subfolders).some(([subfolder, ids]) => {
        if (!ids.includes(a.id)) return false;
        folderPath = `${folder}/${subfolder}`;
        return true;
      }),
    );
    const enemy = a.enemy || ENEMY_TEMPLATES[a.id] || {};
    setMultiSelected([a.id]);
    setSelected(a.id);
    setSelectedRotation(0);
    setDraft({
      name: a.name,
      w: a.w,
      h: a.h,
      baseW: a.w,
      baseH: a.h,
      scale: 1,
      folderPath,
      hp: enemy.hp || 30,
      damage: enemy.damage || 8,
      xp: enemy.xp || 10,
      boss: !!enemy.boss,
      animationFrames: a.animation?.frames || 1,
      animationFps: a.animation?.fps || 6,
      animationColumns: a.animation?.columns || (a.animation?.direction === "vertical" ? 1 : a.animation?.frames || 1),
      animationRows: a.animation?.rows || (a.animation?.direction === "vertical" ? a.animation?.frames || 1 : 1),
    });
    setModal({ type: "asset", id: a.id });
  };
  const openMap = () => {
    setDraft({ name: "Novo Place", w: 20, h: 15, mapType: "screen" });
    setModal({ type: "map" });
  };
  const openAnimation = (animation = null) => {
    setDraft(animation ? clone(animation) : {
      id: "animation_" + Date.now(),
      name: "Nova animação",
      classType: "monster",
      folderPath: "Monstros/Criaturas",
      hp: 30,
      damage: 8,
      xp: 10,
      animationFps: 6,
      previewState: "front",
      frames: Object.fromEntries(ANIMATION_STATES.map(([key]) => [key, []])),
    });
    setModal({ type: "animation", id: animation?.id || null });
  };
  const rotateCurrent = () => {
    if (playing) return;
    const next = (selectedRotation + 1) % 4;
    if (active) {
      const obj = map.objects.find((o) => o.uid === active),
        asset = obj && assetById[obj.id];
      if (obj && asset && !map.locked[asset.layer]) {
        const size = rotatedSize(asset, next);
        if (obj.x + size.w <= map.w && obj.y + size.h <= map.h) {
          commit((p) => {
            const target = p.maps[p.current].objects.find(
              (o) => o.uid === active,
            );
            if (target) target.rotation = next;
          });
          setSelectedRotation(next);
          setStatus(`Objeto rotacionado: ${next * 90}°`);
        }
        return;
      }
    }
    if (
      tool === "cursor" &&
      selectedCell &&
      selectedAsset?.layer === "terrain" &&
      !map.locked.terrain
    ) {
      commit((p) => {
        const m = p.maps[p.current];
        (m.terrainRotations ??= {})[selectedCell.y * m.w + selectedCell.x] =
          next;
      });
      setSelectedRotation(next);
      setStatus(`Terreno rotacionado: ${next * 90}°`);
      return;
    }
    setSelectedRotation(next);
    setStatus(`Pincel: ${next * 90}°`);
  };
  const deleteAssets = (ids) => {
    const removable = [...new Set(ids)].filter(
      (id) => id !== "grass" && assetById[id],
    );
    if (!removable.length) return;
    const label =
      removable.length === 1
        ? `“${assetById[removable[0]].name}”`
        : `${removable.length} assets`;
    if (
      !window.confirm(
        `Excluir ${label} das pastas e remover suas ocorrências dos mapas?`,
      )
    )
      return;
    const removed = new Set(removable);
    commit((p) => {
      p.assets = p.assets.filter((a) => !removed.has(a.id));
      for (const subs of Object.values(p.folders))
        for (const ids of Object.values(subs)) {
          const kept = ids.filter((id) => !removed.has(id));
          ids.splice(0, ids.length, ...kept);
        }
      for (const m of Object.values(p.maps)) {
        m.ground = m.ground.map((tile, i) => {
          if (!removed.has(tile)) return tile;
          delete m.terrainRotations?.[i];
          return "grass";
        });
        m.objects = m.objects.filter((o) => !removed.has(o.id));
      }
    });
    if (removed.has(selected)) setSelected("grass");
    setMultiSelected([]);
    setActive(null);
    setSelectedCell(null);
    setSelectedRange(null);
    clipboard.current = null;
    for (const id of removable) delete images.current[id];
    setModal(null);
    if (type === "portal") {
      setSelectedRange(null);
      setTool("cursor");
    }
    setStatus(
      `${removable.length} asset${removable.length === 1 ? "" : "s"} excluído${removable.length === 1 ? "" : "s"}`,
    );
  };
  const deleteAsset = () => {
    if (modal?.type === "asset") deleteAssets([modal.id]);
  };
  const saveModal = () => {
    if (!modal) return;
    let type = modal.type;
    if (type === "animation") {
      if (!draft.name?.trim()) return;
      commit((p) => {
        p.animations ||= [];
        const canonicalHeroes = {
          kirito: "espadachim-sombrio",
          asuna: "espadachim-laranja",
          klein: "guerreiro-vermelho",
          agil: "guerreiro-machado",
          lisbeth: "guerreira-rosa",
        };
        const canonicalId = draft.classType === "hero"
          ? canonicalHeroes[draft.name.trim().toLocaleLowerCase("pt-BR")]
          : null;
        const record = {
          ...clone(draft),
          id: canonicalId || draft.id,
          name: draft.name.trim(),
          dialogueProfile: canonicalId || draft.dialogueProfile || null,
          hp: Math.max(1, +draft.hp || 1),
          damage: Math.max(0, +draft.damage || 0),
          xp: Math.max(0, +draft.xp || 0),
          animationFps: Math.max(1, Math.min(30, +draft.animationFps || 6)),
        };
        const index = p.animations.findIndex((item) => item.id === record.id);
        if (index >= 0) p.animations[index] = record;
        else p.animations.push(record);
        const firstFrameId = Object.values(record.frames || {}).flat()[0];
        const firstFrame = p.assets.find((asset) => asset.id === firstFrameId);
        let asset = p.assets.find((item) => item.id === record.id);
        const layer = "characters";
        const data = {
          id: record.id,
          name: record.name,
          w: record.classType === "boss" ? 6 : 1,
          h: record.classType === "boss" ? 6 : 1.5,
          layer,
          color: "#ffffff",
          src: firstFrame?.src,
          animationSet: { frames: record.frames, fps: record.animationFps, classType: record.classType },
          ...(["monster", "boss"].includes(record.classType)
            ? { enemy: { hp: record.hp, damage: record.damage, xp: record.xp, boss: record.classType === "boss", name: record.name } }
            : {}),
        };
        if (asset) Object.assign(asset, data);
        else p.assets.push(data);
        Object.values(p.folders).forEach((subfolders) => Object.values(subfolders).forEach((ids) => {
          const found = ids.indexOf(record.id);
          if (found >= 0) ids.splice(found, 1);
        }));
        const [folder, subfolder] = String(record.folderPath || "Personagens/Heróis").split("/");
        if (p.folders[folder]?.[subfolder]) p.folders[folder][subfolder].push(record.id);
      });
    } else if (type === "asset") {
      if (!draft.name?.trim()) return;
      commit((p) => {
        let a = p.assets.find((a) => a.id === modal.id);
        if (!a) return;
        a.name = draft.name.trim();
        a.w = Math.max(0.25, Math.min(40, +draft.w || 1));
        a.h = Math.max(0.25, Math.min(40, +draft.h || 1));
        a.hitbox = { ...(a.hitbox || {}), w: a.w, h: a.h };
        Object.values(p.folders).forEach((subfolders) =>
          Object.values(subfolders).forEach((ids) => {
            const index = ids.indexOf(a.id);
            if (index >= 0) ids.splice(index, 1);
          }),
        );
        const [folder, subfolder] = String(draft.folderPath || "Importados/Meus sprites").split("/");
        if (p.folders[folder]?.[subfolder]) p.folders[folder][subfolder].push(a.id);
        if (folder === "Monstros") {
          a.layer = "characters";
          a.enemy = {
            hp: Math.max(1, +draft.hp || 30),
            damage: Math.max(1, +draft.damage || 8),
            xp: Math.max(0, +draft.xp || 0),
            boss: !!draft.boss,
            ...(draft.boss ? { name: draft.name.trim() } : {}),
          };
        } else if (a.enemy) {
          delete a.enemy;
        }
        if (folder === "Monstros" || folder === "Personagens") {
          a.animation = {
            frames: Math.max(1, Math.min(
              Math.floor(+draft.animationFrames || 1),
              Math.floor(+draft.animationColumns || 1) * Math.floor(+draft.animationRows || 1),
            )),
            fps: Math.max(1, Math.min(30, +draft.animationFps || 6)),
            columns: Math.max(1, Math.min(64, Math.floor(+draft.animationColumns || 1))),
            rows: Math.max(1, Math.min(64, Math.floor(+draft.animationRows || 1))),
          };
        } else {
          delete a.animation;
        }
      });
    } else if (type === "map") {
      if (!draft.name?.trim()) return;
      commit((p) => {
        let id = "place_" + Date.now();
        p.maps[id] = newMap(
          draft.name.trim(),
          Math.max(4, Math.min(100, +draft.w || 20)),
          Math.max(4, Math.min(26, +draft.h || 15)),
        );
        p.maps[id].mapType = draft.mapType === "interior" ? "interior" : "screen";
        p.current = id;
      });
      setActive(null);
    } else if (type === "portal") {
      let m = project.maps[draft.dest],
        a = parseCoord(draft.arrival),
        sectorParts = String(draft.sector || modal.cell || "").toUpperCase().split("-").map((value) => parseCoord(value.trim())),
        sourceStart = sectorParts[0],
        sourceEnd = sectorParts[1] || sectorParts[0];
      if (!m || !a || !sourceStart || !sourceEnd || !valid(sourceStart.x, sourceStart.y) || !valid(sourceEnd.x, sourceEnd.y)) {
        alert("Setor ou coordenada de chegada inválida");
        return;
      }
      const left = Math.min(sourceStart.x, sourceEnd.x),
        right = Math.max(sourceStart.x, sourceEnd.x),
        top = Math.min(sourceStart.y, sourceEnd.y),
        bottom = Math.max(sourceStart.y, sourceEnd.y),
        portalWidth = right - left + 1,
        portalHeight = bottom - top + 1;
      if (!valid(a.x, a.y, m)) {
        alert("Coordenada de chegada inválida");
        return;
      }
      commit((p) => {
        for (let y = top; y <= bottom; y += 1)
          for (let x = left; x <= right; x += 1)
            p.maps[p.current].portals[coord(x, y)] = {
              name: draft.portalName?.trim() || "Porta",
              to: draft.dest,
              arrival: draft.arrival.toUpperCase(),
              width: portalWidth,
              height: portalHeight,
            };
      });
    } else if (type === "npc") {
      commit((p) => {
        let o = p.maps[p.current].objects.find((o) => o.uid === modal.uid);
        if (o) {
          o.name = draft.name;
          o.dialogue = draft.dialogue;
          o.solid = !!draft.solid;
        }
      });
    }
    setModal(null);
  };
  const download = (blob, name) => {
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const save = () =>
    download(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
      "pixel-forge-project.json",
    );
  const importProject = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.maps || !data.assets || !data.folders)
        throw Error("Arquivo incompatível");
      setProject(upgradeProject(data));
      history.current = [];
      future.current = [];
      setActive(null);
      setStatus("Projeto carregado");
    } catch (err) {
      alert(err.message);
    }
    e.target.value = "";
  };
  const importPng = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    for (const f of files) {
      const src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(f);
      });
      const im = await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = src;
      });
      const id = "sprite_" + uid(),
        w = Math.max(1, Math.ceil(im.width / 32)),
        h = Math.max(1, Math.ceil(im.height / 32));
      commit((p) => {
        p.assets.push({
          id,
          name: f.name.replace(/\.png$/i, ""),
          w,
          h,
          layer: "decor",
          color: "#ffffff",
          src,
        });
        p.folders.Importados["Meus sprites"].push(id);
      });
      setMultiSelected([id]);
      setSelected(id);
      setSelectedRotation(0);
      setTool("paint");
      setOpened((v) => ({
        ...v,
        Importados: true,
        "Importados/Meus sprites": true,
      }));
      setStatus("PNG importado");
    }
    setStatus(`${files.length} PNG${files.length > 1 ? "s" : ""} importado${files.length > 1 ? "s" : ""}`);
    e.target.value = "";
  };
  const uploadAnimationFrames = async (state, files) => {
    const created = [];
    const rejected = [];
    for (const file of [...files]) {
      const src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const image = await new Promise((resolve) => {
        const value = new Image();
        value.onload = () => resolve(value);
        value.src = src;
      });
      if (image.width !== image.height) {
        rejected.push(file.name);
        continue;
      }
      created.push({
        id: "frame_" + uid(),
        name: file.name.replace(/\.png$/i, ""),
        w: 1,
        h: 1,
        layer: "characters",
        color: "#ffffff",
        src,
      });
    }
    commit((project) => {
      project.assets.push(...created);
      project.folders.Importados["Meus sprites"].push(...created.map((asset) => asset.id));
    });
    setDraft((current) => ({
      ...current,
      frames: { ...current.frames, [state]: [...(current.frames?.[state] || []), ...created.map((asset) => asset.id)] },
    }));
    if (rejected.length) alert(`Estes frames não são quadrados e não foram adicionados:\n${rejected.join("\n")}`);
  };
  const blocked = (x, y) => {
    if (!valid(x, y)) return true;
    if (map.portals[coord(x, y)]) return false;
    if (map.collisions[coord(x, y)]) return true;
    if (
      map.ground[y * map.w + x]?.startsWith("bank_") &&
      !map.ground[y * map.w + x]?.endsWith("_base")
    )
      return true;
    if (
      map.ground[y * map.w + x]?.startsWith("water") &&
      !map.objects.some(
        (o) =>
          ["bridge", "bridge_h"].includes(o.id) &&
          x >= o.x &&
          x < o.x + sizeOf(o).w &&
          y >= o.y &&
          y < o.y + sizeOf(o).h,
      )
    )
      return true;
    return map.objects.some((o) => {
      let a = assetById[o.id];
      return (
        a &&
        o.solid !== false &&
        ![
          "bridge",
          "bridge_h",
          "bridge_side",
          "bridge_side_v",
          "player",
        ].includes(o.id) &&
        x >= o.x &&
        x < o.x + sizeOf(o).w &&
        y >= o.y &&
        y < o.y + sizeOf(o).h
      );
    });
  };
  const pasteOverRange = (item, range) => {
    const x1 = Math.min(range.x1, range.x2),
      y1 = Math.min(range.y1, range.y2),
      x2 = Math.max(range.x1, range.x2),
      y2 = Math.max(range.y1, range.y2);
    const width = x2 - x1 + 1,
      height = y2 - y1 + 1;
    commit((p) => {
      const m = p.maps[p.current];
      const place = (source, x, y) => {
        const asset = assetById[source.id];
        if (!asset || m.locked[asset.layer]) return;
        const footprint = rotatedSize(asset, source.rotation || 0);
        if (
          x < 0 ||
          y < 0 ||
          x + footprint.w > x2 + 1 ||
          y + footprint.h > y2 + 1 ||
          x + footprint.w > m.w ||
          y + footprint.h > m.h
        )
          return;
        m.objects = m.objects.filter((o) => {
          const other = assetById[o.id];
          return (
            other?.layer !== asset.layer ||
            !(
              x < o.x + sizeOf(o).w &&
              x + footprint.w > o.x &&
              y < o.y + sizeOf(o).h &&
              y + footprint.h > o.y
            )
          );
        });
        m.objects.push({ ...clone(source), uid: uid(), x, y });
      };
      if (item.type === "terrain" || item.type === "range") {
        if (!m.locked.terrain)
          for (let dy = 0; dy < height; dy++)
            for (let dx = 0; dx < width; dx++) {
              const i = (y1 + dy) * m.w + x1 + dx;
              m.ground[i] =
                item.type === "terrain"
                  ? item.id
                  : item.ground[dy % item.h][dx % item.w];
              (m.terrainRotations ??= {})[i] =
                item.type === "terrain"
                  ? item.rotation || 0
                  : item.rotations?.[dy % item.h]?.[dx % item.w] || 0;
            }
      }
      if (item.type === "object") {
        const asset = assetById[item.object.id];
        if (asset) {
          const footprint = rotatedSize(asset, item.object.rotation || 0);
          for (let y = y1; y <= y2; y += footprint.h)
            for (let x = x1; x <= x2; x += footprint.w)
              place(item.object, x, y);
        }
      } else if (item.type === "range") {
        for (let by = y1; by <= y2; by += item.h)
          for (let bx = x1; bx <= x2; bx += item.w)
            for (const original of item.objects)
              place(original, bx + original.x, by + original.y);
      }
    });
    pasteTargetRange.current = false;
    setStatus(`Colado em massa: ${width}×${height}`);
  };
  useEffect(() => {
    const onKey = (e) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        ) ||
        modal
      )
        return;
      if (!playing && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        rotateCurrent();
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        multiSelected.length > 1
      ) {
        e.preventDefault();
        deleteAssets(multiSelected);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (!selectedCell) return;
        e.preventDefault();
        const obj = map.objects.find((o) => o.uid === active);
        if (selectedRange) {
          const x = Math.min(selectedRange.x1, selectedRange.x2),
            y = Math.min(selectedRange.y1, selectedRange.y2),
            w = Math.abs(selectedRange.x2 - selectedRange.x1) + 1,
            h = Math.abs(selectedRange.y2 - selectedRange.y1) + 1;
          pasteTargetRange.current = false;
          clipboard.current = {
            type: "range",
            w,
            h,
            ground: Array.from({ length: h }, (_, dy) =>
              Array.from(
                { length: w },
                (_, dx) => map.ground[(y + dy) * map.w + x + dx],
              ),
            ),
            rotations: Array.from({ length: h }, (_, dy) =>
              Array.from(
                { length: w },
                (_, dx) =>
                  map.terrainRotations?.[(y + dy) * map.w + x + dx] || 0,
              ),
            ),
            objects: map.objects
              .filter((o) => o.x >= x && o.x < x + w && o.y >= y && o.y < y + h)
              .map((o) => ({ ...clone(o), x: o.x - x, y: o.y - y })),
          };
          setStatus("Área copiada: " + w + "×" + h);
          return;
        }
        clipboard.current = obj
          ? {
              type: "object",
              object: clone(obj),
              offsetX: selectedCell.x - obj.x,
              offsetY: selectedCell.y - obj.y,
            }
          : {
              type: "terrain",
              id: map.ground[selectedCell.y * map.w + selectedCell.x],
              rotation:
                map.terrainRotations?.[
                  selectedCell.y * map.w + selectedCell.x
                ] || 0,
            };
        setStatus(
          "Copiado: " +
            (obj
              ? assetById[obj.id]?.name || obj.id
              : assetById[clipboard.current.id]?.name || clipboard.current.id),
        );
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        const item = clipboard.current;
        if (!item) return;
        if (pasteTargetRange.current && selectedRange) {
          e.preventDefault();
          pasteOverRange(item, selectedRange);
          return;
        }
        const target = hover && valid(hover.x, hover.y) ? hover : selectedCell;
        if (!target || !valid(target.x, target.y)) return;
        e.preventDefault();
        if (item.type === "range") {
          if (target.x + item.w > map.w || target.y + item.h > map.h) return;
          commit((p) => {
            const m = p.maps[p.current];
            for (let dy = 0; dy < item.h; dy++)
              for (let dx = 0; dx < item.w; dx++)
                if (!m.locked.terrain) {
                  const i = (target.y + dy) * m.w + target.x + dx;
                  m.ground[i] = item.ground[dy][dx];
                  (m.terrainRotations ??= {})[i] =
                    item.rotations?.[dy]?.[dx] || 0;
                }
            for (const original of item.objects) {
              const asset = assetById[original.id];
              if (!asset || m.locked[asset.layer]) continue;
              const x = target.x + original.x,
                y = target.y + original.y;
              const footprint = rotatedSize(asset, original.rotation || 0);
              if (x + footprint.w > m.w || y + footprint.h > m.h) continue;
              m.objects = m.objects.filter((o) => {
                const a = assetById[o.id];
                return (
                  a?.layer !== asset.layer ||
                  !(
                    x < o.x + sizeOf(o).w &&
                    x + footprint.w > o.x &&
                    y < o.y + sizeOf(o).h &&
                    y + footprint.h > o.y
                  )
                );
              });
              m.objects.push({ ...clone(original), uid: uid(), x, y });
            }
          });
          setSelectedRange({
            x1: target.x,
            y1: target.y,
            x2: target.x + item.w - 1,
            y2: target.y + item.h - 1,
          });
          setActive(null);
        } else if (item.type === "terrain") {
          if (map.locked.terrain) return;
          commit((p) => {
            const m = p.maps[p.current];
            m.ground[target.y * m.w + target.x] = item.id;
            (m.terrainRotations ??= {})[target.y * m.w + target.x] =
              item.rotation || 0;
          });
          setActive(null);
        } else {
          const original = item.object,
            asset = assetById[original.id];
          if (!asset || map.locked[asset.layer]) return;
          const x = target.x - item.offsetX,
            y = target.y - item.offsetY;
          const footprint = rotatedSize(asset, original.rotation || 0);
          if (
            x < 0 ||
            y < 0 ||
            x + footprint.w > map.w ||
            y + footprint.h > map.h
          )
            return;
          const copy = { ...clone(original), uid: uid(), x, y };
          commit((p) => {
            const m = p.maps[p.current];
            m.objects = m.objects.filter((o) => {
              const a = assetById[o.id];
              return (
                a?.layer !== asset.layer ||
                !(
                  x < o.x + sizeOf(o).w &&
                  x + footprint.w > o.x &&
                  y < o.y + sizeOf(o).h &&
                  y + footprint.h > o.y
                )
              );
            });
            m.objects.push(copy);
          });
          setActive(copy.uid);
        }
        setSelectedCell(target);
        setStatus("Colado em " + coord(target.x, target.y));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!playing) return;
      const dirs = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        s: [0, 1],
        a: [-1, 0],
        d: [1, 0],
      };
      if (dirs[e.key]) {
        e.preventDefault();
        setSpeech("");
        let [dx, dy] = dirs[e.key],
          x = player.x + dx,
          y = player.y + dy;
        setPlayerFacing(
          dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down",
        );
        if (!valid(x, y)) {
          const floor = project.floors?.find(
            (item) => item.id === project.currentFloor,
          );
          const index = floor?.maps.indexOf(project.current) ?? -1;
          const row = Math.floor(index / 2),
            column = index % 2;
          let destinationIndex = -1;
          if (x < 0 && column === 1) destinationIndex = index - 1;
          if (x >= map.w && column === 0) destinationIndex = index + 1;
          if (y < 0 && row === 1) destinationIndex = index - 2;
          if (y >= map.h && row === 0) destinationIndex = index + 2;
          const destinationId = floor?.maps[destinationIndex];
          const destination = project.maps[destinationId];
          if (!destination) return;
          setPlayerStep((n) => n + 1);
          setProject((p) => ({ ...p, current: destinationId }));
          setPlayer({
            x: x < 0 ? destination.w - 1 : x >= map.w ? 0 : x,
            y: y < 0 ? destination.h - 1 : y >= map.h ? 0 : y,
          });
          setStatus(`Travessia contínua · ${destination.name}`);
          return;
        }
        if (blocked(x, y)) return;
        setPlayerStep((n) => n + 1);
        const portal = map.portals[coord(x, y)];
        if (portal && project.maps[portal.to]) {
          const c = parseCoord(portal.arrival) || { x: 1, y: 1 };
          setProject((p) => ({ ...p, current: portal.to }));
          setPlayer(c);
        } else setPlayer({ x, y });
      } else if (e.key === " ") {
        e.preventDefault();
        if (speech) {
          setSpeech("");
          return;
        }
        let npc = map.objects.find(
          (o) =>
            o.id === "npc" &&
            Math.abs(o.x - player.x) + Math.abs(o.y - player.y) <= 2,
        );
        if (npc)
          setSpeech((npc.name || "Aldeão") + ": " + (npc.dialogue || "Olá!"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    playing,
    player,
    map,
    project.maps,
    project.floors,
    project.current,
    project.currentFloor,
    modal,
    speech,
    undo,
    redo,
    assetById,
    active,
    selectedCell,
    selectedRange,
    hover,
    commit,
    multiSelected,
    selectedRotation,
    tool,
    selectedAsset,
  ]);
  const togglePlay = () => {
    setPlaying((v) => !v);
    setSpeech("");
    if (!playing) {
      let marker = map.objects.find((o) => o.id === "player");
      let start = marker
        ? { x: marker.x, y: marker.y }
        : { x: Math.min(10, map.w - 1), y: Math.min(18, map.h - 1) };
      if (blocked(start.x, start.y)) {
        outer: for (let y = 0; y < map.h; y++)
          for (let x = 0; x < map.w; x++)
            if (!blocked(x, y)) {
              start = { x, y };
              break outer;
            }
      }
      setPlayer(start);
    }
  };
  const launchFullScreenGame = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setMode("intro");
  };
  const exitFullScreenGame = () => {
    setMode("editor");
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };
  if (!storageReady)
    return <div className="loading-project">Carregando projeto...</div>;
  if (mode === "intro")
    return (
      <div className="sao-intro-screen">
        <video
          autoPlay
          playsInline
          src="/video/sao-link-start.mp4"
          onEnded={() => setMode("game")}
          onError={() => setMode("game")}
        />
      </div>
    );
  if (mode === "game")
    return (
      <Gameplay
        project={project}
        setProject={setProject}
        onExit={exitFullScreenGame}
        user={user}
      />
    );
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <strong>PIXEL FORGE</strong>
          <span className="version">AINCRAD STUDIO · v0.9</span>
        </div>
        <div className="header-actions">
          <span className="autosave-status">
            {user ? projectCloudState : saveState}
          </span>
          <AuthControl user={user} ready={authReady} />
          <button className="launch-game" onClick={launchFullScreenGame}>
            <Play size={15} /> Jogar
          </button>
          <button
            onClick={() => {
              if (confirm("Criar projeto novo? Salve o atual antes.")) {
                setProject(initialProject());
                setActive(null);
              }
            }}
          >
            <FilePlus size={15} /> Novo
          </button>
          <button onClick={() => fileRef.current?.click()}>
            <FolderOpen size={15} /> Abrir
          </button>
          <button onClick={save}>
            <Save size={15} /> Salvar
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <div className="assets-title">
            <strong>ASSETS</strong>
            <ChevronDown size={16} />
          </div>
          {multiSelected.length > 1 && (
            <button
              className="bulk-delete"
              onClick={() => deleteAssets(multiSelected)}
            >
              Excluir selecionados (
              {multiSelected.filter((id) => id !== "grass").length})
            </button>
          )}
          {Object.entries(project.folders).map(([folder, subs]) => (
            <div key={folder} className="folder-block">
              <button
                className="folder-row main-folder"
                onClick={() =>
                  setOpened((o) => ({ ...o, [folder]: !o[folder] }))
                }
              >
                {opened[folder] ? (
                  <ChevronDown size={13} />
                ) : (
                  <ChevronRight size={13} />
                )}{" "}
                {opened[folder] ? (
                  <FolderOpen size={16} />
                ) : (
                  <Folder size={16} />
                )}{" "}
                <span>{folder}</span>
              </button>
              {opened[folder] && (
                <div className="folder-inner">
                  {Object.entries(subs).map(([sub, ids]) => (
                    <div key={sub}>
                      <button
                        className="folder-row sub-folder"
                        onClick={() =>
                          setOpened((o) => ({
                            ...o,
                            [folder + "/" + sub]: !o[folder + "/" + sub],
                          }))
                        }
                      >
                        {opened[folder + "/" + sub] ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                        <Folder size={14} />
                        <span>{sub}</span>
                      </button>
                      {opened[folder + "/" + sub] && (
                        <div className="asset-grid">
                          {ids.map((id) => {
                            const a = assetById[id];
                            return (
                              a && (
                                <button
                                  key={id}
                                  title={`${a.name} · ${a.w}×${a.h} tiles · duplo clique para editar`}
                                  aria-pressed={
                                    multiSelected.length
                                      ? multiSelected.includes(id)
                                      : selected === id
                                  }
                                  className={
                                    "asset-card " +
                                    ((
                                      multiSelected.length
                                        ? multiSelected.includes(id)
                                        : selected === id
                                    )
                                      ? "is-selected"
                                      : "")
                                  }
                                  onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                      setMultiSelected((ids) =>
                                        ids.includes(id)
                                          ? ids.filter((item) => item !== id)
                                          : [...ids, id],
                                      );
                                      setSelected(id);
                                      setSelectedRotation(0);
                                    } else {
                                      setMultiSelected([id]);
                                      setSelected(id);
                                      setSelectedRotation(0);
                                      setTool("paint");
                                    }
                                    setActive(null);
                                  }}
                                  onDoubleClick={() => openAsset(a)}
                                >
                                  <div className="asset-image">
                                    <SpriteThumb asset={a} />
                                  </div>
                                  <span>{a.name}</span>
                                </button>
                              )
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button
            className="import-button"
            onClick={() => pngRef.current?.click()}
          >
            <Upload size={14} /> Enviar arquivos PNG
          </button>
          <div className="animations-section">
            <div className="assets-title">
              <strong>ANIMATIONS</strong>
              <button className="animation-add" onClick={() => openAnimation()} title="Criar animação">
                <Plus size={15} /> Criar nova
              </button>
            </div>
            <div className="animation-list">
              {(project.animations || []).map((animation) => (
                <button key={animation.id} onClick={() => openAnimation(animation)}>
                  <span>{animation.name}</span>
                  <small>{({ player: "Player", hero: "Herói", npc: "NPC", monster: "Monstro", boss: "Chefe" })[animation.classType]}</small>
                </button>
              ))}
              {!(project.animations || []).length && <small className="animation-empty">Nenhuma animação criada</small>}
            </div>
          </div>
        </aside>
        <section className="editor">
          <div className="editor-toolbar">
            <div className="tool-buttons">
              {[
                ["cursor", MousePointer2, "Cursor de seleção"],
                ["paint", Paintbrush, "Pincel"],
                ["erase", Eraser, "Borracha"],
                ["fill", PaintBucket, "Preencher"],
                ["portal", DoorOpen, "Porta"],
                ["collision", Grid3X3, "Colisão"],
              ].map(([id, Icon, label]) => (
                <button
                  key={id}
                  title={label}
                  className={"icon-button " + (tool === id ? "is-active" : "")}
                  onClick={() => {
                    setTool(id);
                    if (id === "portal") {
                      setSelectedRange(null);
                      setDraft({
                        portalName: "Nova porta",
                        sector: selectedCell ? coord(selectedCell.x, selectedCell.y) : "A1",
                        dest: Object.keys(project.maps).find((key) => key !== project.current) || project.current,
                        arrival: "A1",
                      });
                      setModal({ type: "portal" });
                    }
                  }}
                >
                  <Icon size={17} />
                </button>
              ))}
            </div>
            <span className="toolbar-separator" />
            <button
              className="rotate-button"
              title="Rotacionar 90° (R)"
              onClick={rotateCurrent}
            >
              <RotateCw size={16} />
              {selectedRotation * 90}°
            </button>
            <button className="icon-button" title="Desfazer" onClick={undo}>
              <Undo2 size={17} />
            </button>
            <button className="icon-button" title="Refazer" onClick={redo}>
              <Redo2 size={17} />
            </button>
            <span className="toolbar-separator" />
            <button
              className="icon-button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            >
              <Minus size={16} />
            </button>
            <span className="zoom-label">{Math.round(zoom * 100)}%</span>
            <button
              className="icon-button"
              onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
            >
              <Plus size={16} />
            </button>
            <label className="check">
              <input
                type="checkbox"
                checked={grid}
                onChange={(e) => setGrid(e.target.checked)}
              />{" "}
              Grade
            </label>
          </div>
          <div className="canvas-scroller">
            <div
              className={
                "canvas-frame " + (grid ? "with-grid" : "without-grid")
              }
            >
              {grid && (
                <>
                  <div className="grid-corner" />
                  <div
                    className="grid-columns"
                    style={{
                      gridTemplateColumns: `repeat(${map.w}, ${TILE * zoom}px)`,
                    }}
                  >
                    {Array.from({ length: map.w }, (_, x) => (
                      <span key={x}>{x + 1}</span>
                    ))}
                  </div>
                  <div
                    className="grid-rows"
                    style={{
                      gridTemplateRows: `repeat(${map.h}, ${TILE * zoom}px)`,
                    }}
                  >
                    {Array.from({ length: map.h }, (_, y) => (
                      <span key={y}>{String.fromCharCode(65 + y)}</span>
                    ))}
                  </div>
                </>
              )}
              <canvas
                ref={canvas}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerUpCapture={onUp}
                onLostPointerCapture={onUp}
                onPointerCancel={onUp}
                onPointerLeave={() => setHover(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!playing) {
                    if (eraseSelection()) return;
                    if (active) {
                      commit((p) => {
                        const m = p.maps[p.current];
                        m.objects = m.objects.filter((o) => o.uid !== active);
                      });
                      setActive(null);
                      setSelectedCell(null);
                      setStatus("Objeto selecionado apagado");
                      return;
                    }
                    const position = point(e);
                    erase(position.x, position.y);
                  }
                }}
              />
            </div>
          </div>
          {speech && (
            <div className="speech">
              <MessageSquare size={17} />
              {speech}
            </div>
          )}
          <div className="editor-status">
            <span>
              {hover && valid(hover.x, hover.y) ? coord(hover.x, hover.y) : "—"}{" "}
              · {status}
            </span>
            <span>
              {map.w} × {map.h} · 32px
            </span>
          </div>
        </section>
        <aside className="inspector">
          <div className="sidebar-title">CAMADAS</div>
          {[
            ["terrain", "Terreno"],
            ["structures", "Construções"],
            ["decor", "Decoração"],
            ["characters", "Personagens"],
          ].map(([key, label]) => (
            <div className="layer-row" key={key}>
              <Layers size={15} />
              <span>{label}</span>
              <button
                title="Visibilidade"
                onClick={() =>
                  commit((p) => {
                    let m = p.maps[p.current];
                    m.visible[key] = !m.visible[key];
                  })
                }
              >
                {map.visible[key] ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button
                title="Bloquear edição"
                onClick={() =>
                  commit((p) => {
                    let m = p.maps[p.current];
                    m.locked[key] = !m.locked[key];
                  })
                }
              >
                {map.locked[key] ? <Lock size={15} /> : <Unlock size={15} />}
              </button>
            </div>
          ))}
          <div className="side-divider" />
          <div className="sidebar-title">ILUMINAÇÃO</div>
          <div className="segmented">
            {[
              ["day", Sun, "Dia"],
              ["dusk", Sun, "Tarde"],
              ["night", Moon, "Noite"],
            ].map(([id, Icon, label]) => (
              <button
                key={id}
                className={day === id ? "is-active" : ""}
                onClick={() => setDay(id)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <label className="setting-line">
            <input
              type="checkbox"
              checked={cycle}
              onChange={(e) => setCycle(e.target.checked)}
            />{" "}
            Ciclo automático no teste
          </label>
          <div className="side-divider" />
          <div className="sidebar-title">
            SETOR{" "}
            {selectedCell && valid(selectedCell.x, selectedCell.y)
              ? coord(selectedCell.x, selectedCell.y)
              : ""}
          </div>
          {cellAssets.length ? (
            <div className="cell-assets">
              {[
                ["terrain", "Terreno"],
                ["structures", "Construções"],
                ["decor", "Decoração"],
                ["characters", "Personagens"],
              ].map(([layer, label]) => (
                <div key={layer}>
                  <strong>{label}</strong>
                  {cellAssets
                    .filter((item) => item.layer === layer)
                    .map((item, index) => (
                      <button
                        key={item.id + index}
                        className={selected === item.id ? "is-selected" : ""}
                        onClick={() => setSelected(item.id)}
                      >
                        {assetById[item.id]?.name || item.id}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="placeholder">
              Clique no mapa para ver os assets por camada.
            </p>
          )}
          <div className="side-divider" />
          <div className="sidebar-title">OBJETO</div>
          {active ? (
            (() => {
              let o = map.objects.find((o) => o.uid === active);
              return o ? (
                <div className="object-details">
                  <strong>{assetById[o.id]?.name}</strong>
                  <span>Posição: {coord(o.x, o.y)}</span>
                  <span>
                    Tamanho: {sizeOf(o).w} × {sizeOf(o).h} ·{" "}
                    {(o.rotation || 0) * 90}°
                  </span>
                  {o.id === "npc" && (
                    <button
                      className="small-action"
                      onClick={() => {
                        setDraft({
                          name: o.name || "Aldeão",
                          dialogue: o.dialogue || "",
                          solid: o.solid !== false,
                        });
                        setModal({ type: "npc", uid: o.uid });
                      }}
                    >
                      Configurar diálogo
                    </button>
                  )}
                </div>
              ) : (
                <p className="placeholder">Selecione um objeto no mapa.</p>
              );
            })()
          ) : (
            <p className="placeholder">
              Selecione um objeto no mapa para ver suas propriedades.
            </p>
          )}
          <div className="side-divider" />
          <div className="sidebar-title">ATALHOS</div>
          <p className="help-text">
            Clique: selecionar
            <br />
            Arrastar: mover objeto
            <br />
            Botão direito: apagar
            <br />
            Ctrl/⌘ + Z: desfazer
            <br />
            Ctrl/⌘ + C/V: copiar/colar
            <br />
            Ctrl/⌘ + arrastar: selecionar área para colar em massa
            <br />
            R: rotacionar 90°
            <br />
            Shift + arrastar: pintar em massa
            <br />
            Duplo clique no asset: editar
          </p>
        </aside>
      </div>
      <section className={"floor-manager " + (floorExpanded ? "is-open" : "")}>
        <div className="floor-manager-head">
          <div className="floor-heading">
            <span className="floor-kicker">GERENCIADOR DE ANDARES</span>
            <strong>
              ANDAR {String(currentFloor?.number || 1).padStart(2, "0")} —{" "}
              {currentFloor?.name || "Sem andar"}
            </strong>
            <span className="floor-meta">
              4 mapas · 50×26 cada · chefe: {currentFloor?.boss || "—"}
            </span>
          </div>
          <div className="floor-actions">
            <select
              aria-label="Selecionar andar"
              value={project.currentFloor || currentFloor?.id}
              onChange={(e) => {
                const floor = project.floors.find(
                  (f) => f.id === e.target.value,
                );
                if (!floor?.unlocked) return;
                setProject((p) => ({
                  ...p,
                  currentFloor: floor.id,
                  current: floor.maps[0] || p.current,
                }));
              }}
            >
              {project.floors?.map((floor) => (
                <option
                  key={floor.id}
                  value={floor.id}
                  disabled={!floor.unlocked}
                >
                  {floor.unlocked ? "◆" : "🔒"} Andar{" "}
                  {String(floor.number).padStart(2, "0")} · {floor.name}
                </option>
              ))}
            </select>
            <button
              className="floor-collapse"
              onClick={() => setFloorExpanded((value) => !value)}
              aria-label={floorExpanded ? "Recolher andar" : "Expandir andar"}
            >
              {floorExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </div>
        </div>
        {floorExpanded && (
          <div className="floor-grid">
            {currentFloor?.maps.map((id, index) => {
              const floorMap = project.maps[id];
              const objectIds = new Set(floorMap?.objects.map((o) => o.id));
              return (
                <button
                  key={id}
                  className={
                    "floor-card " + (project.current === id ? "is-current" : "")
                  }
                  onClick={() => selectMap(id)}
                >
                  <span className="floor-card-number">
                    TELA {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="floor-card-icon">
                    {["⌂", "♣", "♠", "⚔"][index]}
                  </span>
                  <strong>{floorMap?.name.replace(/^\d+\s—\s/, "")}</strong>
                  <span>
                    {floorMap?.w}×{floorMap?.h} tiles
                  </span>
                  <span className="floor-card-tags">
                    {objectIds.has("npc") && <i>NPC</i>}
                    {["slime", "boar", "wolf", "kobold", "kobold_lord"].some(
                      (monster) => objectIds.has(monster),
                    ) && <i>MONSTROS</i>}
                    {id === "ruins" && <i>CHEFE</i>}
                    {id === "village" && <i>PORTAL</i>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <footer className="footer">
        <div className="place-controls">
          <span className="footer-label">PLACES</span>
          <select
            value={project.current}
            onChange={(e) => selectMap(e.target.value)}
          >
            {Object.entries(project.maps).map(([id, m]) => (
              <option key={id} value={id}>
                {m.name} ({m.w}×{m.h})
              </option>
            ))}
          </select>
          <button onClick={openMap}>
            <Plus size={15} /> Mapa
          </button>
        </div>
        <div className="footer-right">
          <button
            onClick={() =>
              canvas.current?.toBlob(
                (blob) => blob && download(blob, "pixel-forge-map.png"),
              )
            }
          >
            <ImageIcon size={15} /> Exportar PNG
          </button>
          <button
            className={"play-button " + (playing ? "playing" : "")}
            onClick={togglePlay}
          >
            {playing ? <Square size={15} /> : <Play size={15} />}{" "}
            {playing ? "Parar" : "Testar"}
          </button>
        </div>
      </footer>
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="modal">
            <div className="modal-head">
            <strong>
                {modal.type === "asset"
                  ? "Editar asset"
                  : modal.type === "animation"
                    ? "Configurar animação"
                  : modal.type === "map"
                    ? "Criar Place"
                    : modal.type === "portal"
                      ? "Configurar porta"
                      : "Configurar NPC"}
              </strong>
              <button onClick={() => setModal(null)}>
                <X size={18} />
              </button>
            </div>
            {modal.type === "asset" && (
              <div className="modal-image">
                <SpriteThumb
                  asset={{
                    ...assetById[modal.id],
                    w: +draft.w || assetById[modal.id]?.w || 1,
                    h: +draft.h || assetById[modal.id]?.h || 1,
                    animation: {
                      frames: +draft.animationFrames || 1,
                      fps: +draft.animationFps || 6,
                      columns: +draft.animationColumns || 1,
                      rows: +draft.animationRows || 1,
                    },
                  }}
                  size={160}
                />
              </div>
            )}
            {modal.type === "animation" && (
              <>
                <AnimationPreview draft={draft} assetById={assetById} />
                <label>
                  O que é
                  <select value={draft.classType || "monster"} onChange={(e) => {
                    const classType = e.target.value;
                    const presets = {
                      player: { hp: 100, damage: 15, xp: 0 },
                      hero: { hp: 120, damage: 18, xp: 0 },
                      npc: { hp: 50, damage: 0, xp: 0 },
                      monster: { hp: 40, damage: 8, xp: 10 },
                      boss: { hp: 500, damage: 25, xp: 250 },
                    };
                    setDraft((d) => ({
                      ...d,
                      ...presets[classType],
                      classType,
                      folderPath: classType === "boss"
                        ? "Monstros/Chefes"
                        : classType === "monster"
                          ? "Monstros/Criaturas"
                          : classType === "player"
                            ? "Personagens/Player"
                            : classType === "npc"
                              ? "Personagens/NPCs"
                              : "Personagens/Heróis",
                    }));
                  }}>
                    <option value="player">Player</option>
                    <option value="hero">Herói</option>
                    <option value="npc">NPC</option>
                    <option value="monster">Monstro</option>
                    <option value="boss">Chefe</option>
                  </select>
                </label>
                <label>Nome<input value={draft.name || ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></label>
                <label>
                  Pasta em Assets
                  <select value={draft.folderPath || "Personagens/Heróis"} onChange={(e) => setDraft((d) => ({ ...d, folderPath: e.target.value }))}>
                    {Object.entries(project.folders).flatMap(([folder, subfolders]) => Object.keys(subfolders).map((subfolder) => (
                      <option key={`${folder}/${subfolder}`} value={`${folder}/${subfolder}`}>{folder} · {subfolder}</option>
                    )))}
                  </select>
                </label>
                <div className="two-fields">
                  <label>HP<input type="number" min="1" value={draft.hp || 1} onChange={(e) => setDraft((d) => ({ ...d, hp: e.target.value }))} /></label>
                  <label>Dano<input type="number" min="0" value={draft.damage || 0} onChange={(e) => setDraft((d) => ({ ...d, damage: e.target.value }))} /></label>
                </div>
                <div className="two-fields">
                  <label>XP<input type="number" min="0" value={draft.xp || 0} onChange={(e) => setDraft((d) => ({ ...d, xp: e.target.value }))} /></label>
                  <label>Velocidade (FPS)<input type="number" min="1" max="30" value={draft.animationFps || 6} onChange={(e) => setDraft((d) => ({ ...d, animationFps: e.target.value }))} /></label>
                </div>
                <div className="animation-frame-fields">
                  {ANIMATION_STATES.map(([key, label]) => (
                    <div className="animation-upload-card" key={key}>
                      <strong>{label}</strong>
                      <div className="animation-frame-thumbs">
                        {(draft.frames?.[key] || []).map((id, index) => assetById[id] && (
                          <button key={`${id}-${index}`} type="button" title="Remover frame" onClick={() => setDraft((d) => ({
                            ...d,
                            frames: { ...d.frames, [key]: d.frames[key].filter((_, itemIndex) => itemIndex !== index) },
                          }))}>
                            <img src={assetById[id].src} alt="" />
                          </button>
                        ))}
                      </div>
                      <label className="animation-upload-button">
                        <Upload size={15} /> Adicionar frames
                        <input type="file" accept="image/png" multiple hidden onChange={(e) => {
                          uploadAnimationFrames(key, e.target.files);
                          e.target.value = "";
                        }} />
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}
            {modal.type === "asset" && (
              <>
                <label>
                  Nome do asset
                  <input
                    value={draft.name || ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                  />
                </label>
                <label className="size-slider">
                  <span>
                    Tamanho proporcional
                    <strong>{Math.round((draft.scale || 1) * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min="0.25"
                    max="4"
                    step="0.05"
                    value={draft.scale || 1}
                    onChange={(e) => {
                      const scale = +e.target.value;
                      setDraft((d) => ({
                        ...d,
                        scale,
                        w: +(d.baseW * scale).toFixed(2),
                        h: +(d.baseH * scale).toFixed(2),
                      }));
                    }}
                  />
                </label>
                <div className="two-fields">
                  <label>
                    Largura (tiles)
                    <input
                      type="number"
                      min="0.25"
                      max="40"
                      step="0.25"
                      value={draft.w || 1}
                      onChange={(e) => setDraft((d) => ({ ...d, w: e.target.value }))}
                    />
                  </label>
                  <label>
                    Altura (tiles)
                    <input
                      type="number"
                      min="0.25"
                      max="40"
                      step="0.25"
                      value={draft.h || 1}
                      onChange={(e) => setDraft((d) => ({ ...d, h: e.target.value }))}
                    />
                  </label>
                </div>
                <label>
                  Pasta
                  <select
                    value={draft.folderPath || "Importados/Meus sprites"}
                    onChange={(e) => setDraft((d) => ({ ...d, folderPath: e.target.value }))}
                  >
                    {Object.entries(project.folders).flatMap(([folder, subfolders]) =>
                      Object.keys(subfolders).map((subfolder) => (
                        <option key={`${folder}/${subfolder}`} value={`${folder}/${subfolder}`}>
                          {folder} · {subfolder}
                        </option>
                      )),
                    )}
                  </select>
                </label>
                {(String(draft.folderPath || "").startsWith("Monstros/") ||
                  String(draft.folderPath || "").startsWith("Personagens/")) && (
                  <div className="animation-config">
                    <strong>Animação da sprite</strong>
                    <small>
                      Informe a grade real do PNG. Cada célula vira um frame inteiro, sem cortar a imagem na horizontal.
                    </small>
                    <div className="two-fields">
                      <label>
                        Quantidade de frames
                        <input
                          type="number"
                          min="1"
                          max="64"
                          value={draft.animationFrames || 1}
                          onChange={(e) => setDraft((d) => ({ ...d, animationFrames: e.target.value }))}
                        />
                      </label>
                      <label>
                        Velocidade (FPS)
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={draft.animationFps || 6}
                          onChange={(e) => setDraft((d) => ({ ...d, animationFps: e.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="two-fields">
                      <label>
                        Colunas no PNG
                        <input
                          type="number"
                          min="1"
                          max="64"
                          value={draft.animationColumns || 1}
                          onChange={(e) => setDraft((d) => ({ ...d, animationColumns: e.target.value }))}
                        />
                      </label>
                      <label>
                        Linhas no PNG
                        <input
                          type="number"
                          min="1"
                          max="64"
                          value={draft.animationRows || 1}
                          onChange={(e) => setDraft((d) => ({ ...d, animationRows: e.target.value }))}
                        />
                      </label>
                    </div>
                  </div>
                )}
                {String(draft.folderPath || "").startsWith("Monstros/") && (
                  <>
                    <div className="two-fields">
                      <label>
                        Vida (HP)
                        <input type="number" min="1" value={draft.hp || 30} onChange={(e) => setDraft((d) => ({ ...d, hp: e.target.value }))} />
                      </label>
                      <label>
                        Dano por ataque
                        <input type="number" min="1" value={draft.damage || 8} onChange={(e) => setDraft((d) => ({ ...d, damage: e.target.value }))} />
                      </label>
                    </div>
                    <div className="two-fields">
                      <label>
                        XP ao derrotar
                        <input type="number" min="0" value={draft.xp || 0} onChange={(e) => setDraft((d) => ({ ...d, xp: e.target.value }))} />
                      </label>
                      <label className="check-label">
                        <input type="checkbox" checked={!!draft.boss} onChange={(e) => setDraft((d) => ({ ...d, boss: e.target.checked }))} />
                        É um chefe
                      </label>
                    </div>
                  </>
                )}
              </>
            )}
            {modal.type === "map" && (
              <>
                <label>
                  Nome do mapa
                  <input
                    value={draft.name || ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Tipo do mapa
                  <select
                    value={draft.mapType || "screen"}
                    onChange={(e) => setDraft((d) => ({ ...d, mapType: e.target.value }))}
                  >
                    <option value="screen">Tela / área externa</option>
                    <option value="interior">Interior</option>
                  </select>
                </label>
                <div className="two-fields">
                  <label>
                    Largura
                    <input
                      type="number"
                      min="4"
                      max="100"
                      value={draft.w || 20}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, w: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Altura
                    <input
                      type="number"
                      min="4"
                      max="26"
                      value={draft.h || 15}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, h: e.target.value }))
                      }
                    />
                  </label>
                </div>
              </>
            )}
            {modal.type === "portal" && (
              <>
                <label>
                  Nome da porta
                  <input
                    value={draft.portalName || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, portalName: e.target.value }))}
                    placeholder="Ex.: Entrada da cidade"
                  />
                </label>
                <label>
                  Setor
                  <input
                    value={draft.sector || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, sector: e.target.value.toUpperCase() }))}
                    placeholder="A1 ou A1-D1"
                  />
                </label>
                <label>
                  Destino
                  <select
                    value={draft.dest}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, dest: e.target.value }))
                    }
                  >
                    {Object.entries(project.maps).map(([id, m]) => (
                      <option key={id} value={id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Chegada (ex.: B3)
                  <input
                    value={draft.arrival || ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, arrival: e.target.value.toUpperCase() }))
                    }
                  />
                </label>
                <small>Use uma célula, como A1, ou um intervalo, como A1-D1.</small>
              </>
            )}
            {modal.type === "npc" && (
              <>
                <label>
                  Nome
                  <input
                    value={draft.name || ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Diálogo
                  <textarea
                    rows="4"
                    value={draft.dialogue || ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, dialogue: e.target.value }))
                    }
                  />
                </label>
                <label className="setting-line">
                  <input
                    type="checkbox"
                    checked={!!draft.solid}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, solid: e.target.checked }))
                    }
                  />{" "}
                  Bloqueia movimento
                </label>
              </>
            )}
            <div className="modal-actions">
              {modal.type === "asset" && (
                <button
                  className="delete-asset"
                  onClick={deleteAsset}
                  disabled={modal.id === "grass"}
                  title={
                    modal.id === "grass"
                      ? "Grama é o terreno base do projeto"
                      : "Excluir asset da pasta e do projeto"
                  }
                >
                  Excluir asset
                </button>
              )}
              <button onClick={() => {
                if (modal.type === "portal") {
                  setSelectedRange(null);
                  setTool("cursor");
                }
                setModal(null);
              }}>Cancelar</button>
              <button className="primary" onClick={saveModal}>
                <Check size={15} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={importProject}
      />
      <input
        ref={pngRef}
        type="file"
        accept="image/png"
        hidden
        onChange={importPng}
        multiple
      />
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  location.pathname.replace(/\/$/, "") === "/controller" ? <Controller /> : <App />,
);
