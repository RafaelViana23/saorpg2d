import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Backpack,
  Bug,
  GitBranch,
  Gamepad2,
  Heart,
  MessageSquare,
  Menu,
  MapPin,
  Settings,
  Users,
  User,
  Shield,
  Sparkles,
  Sword,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { drawSprite, objectHitbox, renderMap, TILE } from "./engine";
import {
  anchoredDrawRect,
  animationFrame,
  createHeroAnimations,
  DIRECTIONS,
  frameIndex,
  HERO_ANIMATIONS,
  isAttackAnimation,
  movementAnimation,
} from "./gameplay/animations";
import { ATTACKS, attackDamage, attackImpactDelay } from "./gameplay/combat";
import { isInDirectionalRange } from "./gameplay/hitboxes";
import { drawAttackVfx } from "./gameplay/vfx";
import QRCode from "qrcode";
import { randomId } from "./id";
import { supabase } from "./lib/supabase";
import {
  CHARACTER_PROFILES,
  friendshipLabel,
  randomConversation,
} from "./data/character-dialogues";

const SAVE_KEY = "pixel-forge-gameplay-save";
const CONTROLLER_TOKEN_KEY = "sao-controller-session";
const GAMEPLAY_SAVE_VERSION = 3;
const VILLAGE_SPAWN = { mapId: "village", x: 26, y: 14 };
const ENEMY_IDS = new Set(["slime", "boar", "wolf", "bee", "plant", "golem", "lizard", "skeleton", "dragon", "kobold", "kobold_lord"]);
const CUSTOM_MONSTER_IDS = new Set(["boar", "wolf", "bee", "plant", "golem", "lizard", "skeleton", "dragon"]);
const enemyAggroRadius = (enemy) => enemy.enemy?.boss ? 8 : 5;
const HERO_IDS = new Set(["espadachim-sombrio", "espadachim-laranja", "guerreiro-vermelho", "guerreiro-machado", "guerreira-rosa"]);
const COMPANION_DEFINITIONS = [
  ["espadachim-sombrio", 12, 11],
  ["espadachim-laranja", 16, 11],
  ["guerreiro-vermelho", 12, 17],
  ["guerreiro-machado", 22, 17],
  ["guerreira-rosa", 28, 17],
].map(([id, x, y], index) => ({
  id,
  name: CHARACTER_PROFILES[id]?.name || id,
  mapId: "village",
  x,
  y,
  anchorX: x,
  anchorY: y,
  facing: index % 2 ? "left" : "right",
  moving: false,
  hp: 100,
  maxHp: 100,
  speed: 1.15 + (index % 3) * 0.08,
  directionX: 0,
  directionY: 0,
  nextDecision: 0,
  animationStartedAt: 0,
}));
const COMPANION_ANIMATIONS = Object.fromEntries(
  COMPANION_DEFINITIONS.map((companion) => [
    companion.id,
    createHeroAnimations(`/sprites/personagens/herois/${companion.id}`),
  ]),
);
const MONSTER_FRAMES = {
  slime: {
    idle: [20, 420, 78, 73],
    walk: [110, 420, 78, 73],
    attack: [278, 420, 92, 73],
    hurt: [370, 420, 88, 73],
    death: [462, 420, 100, 73],
  },
  boar: {
    idle: [605, 413, 108, 82],
    walk: [720, 413, 108, 82],
    attack: [940, 413, 112, 82],
    hurt: [1055, 413, 106, 82],
    death: [1172, 413, 123, 82],
  },
  wolf: {
    idle: [22, 535, 102, 105],
    walk: [130, 535, 102, 105],
    attack: [344, 535, 107, 105],
    hurt: [452, 535, 105, 105],
    death: [558, 535, 118, 105],
  },
  kobold: {
    idle: [520, 535, 85, 105],
    walk: [605, 535, 85, 105],
    attack: [698, 535, 92, 105],
    hurt: [790, 535, 82, 105],
    death: [870, 535, 110, 105],
  },
  kobold_lord: {
    idle: [982, 528, 125, 124],
    walk: [1100, 528, 125, 124],
    attack: [1210, 528, 145, 124],
    hurt: [1350, 528, 92, 124],
    death: [1430, 528, 105, 124],
  },
};
const DEFAULT_HERO = {
  ...VILLAGE_SPAWN,
  facing: "down",
  step: 0,
  hp: 100,
  maxHp: 100,
  level: 1,
  xp: 0,
  coins: 0,
  potions: 2,
  mp: 100,
  maxMp: 100,
  equipment: { weapon: "iron_sword", armor: "starter_coat" },
  inventory: [
    {
      id: "iron_sword",
      name: "Espada de Ferro",
      type: "weapon",
      rarity: "Comum",
      attack: 6,
    },
    {
      id: "starter_coat",
      name: "Casaco do Iniciante",
      type: "armor",
      rarity: "Comum",
      defense: 3,
    },
  ],
  stats: { attack: 10, defense: 5, agility: 5, points: 0 },
  skills: { vorpal: true, cyclone: false },
  defeated: [],
  quest: { id: "first_hunt", active: false, kills: 0, complete: false },
  bossDefeated: false,
  isArmed: true,
  friendships: {},
  partners: [],
};

const readSave = (project) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (parsed && project.maps[parsed.mapId]) {
      const inventory = parsed.inventory || DEFAULT_HERO.inventory;
      const savedEquipment = {
        ...DEFAULT_HERO.equipment,
        ...parsed.equipment,
      };
      for (const type of ["weapon", "armor"]) {
        const value = savedEquipment[type];
        const legacyItem = inventory.find(
          (item) => item.id === value || item.name === value,
        );
        savedEquipment[type] = legacyItem?.id || null;
      }
      const migratedPosition = parsed.saveVersion === GAMEPLAY_SAVE_VERSION
        ? {}
        : VILLAGE_SPAWN;
      return {
        ...DEFAULT_HERO,
        ...parsed,
        ...migratedPosition,
        saveVersion: GAMEPLAY_SAVE_VERSION,
        inventory,
        quest: { ...DEFAULT_HERO.quest, ...parsed.quest },
        equipment: savedEquipment,
        stats: { ...DEFAULT_HERO.stats, ...parsed.stats },
        skills: { ...DEFAULT_HERO.skills, ...parsed.skills },
        friendships: { ...DEFAULT_HERO.friendships, ...parsed.friendships },
        partners: Array.isArray(parsed.partners) ? parsed.partners.slice(0, 2) : [],
      };
    }
  } catch {}
  return { ...DEFAULT_HERO };
};

const equippedItem = (hero, type) =>
  hero.inventory.find((item) => item.id === hero.equipment[type]) || null;

const drawAtlasFrame = (context, sheet, frame, x, y, width, height) => {
  if (!sheet || !frame) return false;
  const [sx, sy, sw, sh] = Array.isArray(frame)
    ? frame
    : [frame.x, frame.y, frame.width, frame.height];
  context.drawImage(sheet, sx, sy, sw, sh, x, y, width, height);
  return true;
};

function SpriteFramePreview({ image, animationName, direction, index }) {
  const preview = useRef(null);
  useEffect(() => {
    const target = preview.current;
    const animation = HERO_ANIMATIONS[animationName];
    if (!target || !image || !animation) return;
    const ratio = window.devicePixelRatio || 1;
    target.width = 150 * ratio;
    target.height = 150 * ratio;
    const context = target.getContext("2d");
    context.scale(ratio, ratio);
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, 150, 150);
    const frame = animationFrame(animationName, direction, 0, (index * 1000) / animation.fps);
    const scale = 1.35;
    const rect = anchoredDrawRect(
      { ...animation, render: { width: animation.render.width * scale, height: animation.render.height * scale } },
      75,
      126,
    );
    drawAtlasFrame(context, image, frame, rect.x, rect.y, rect.width, rect.height);
    context.strokeStyle = "#6be1a7";
    context.beginPath();
    context.moveTo(58, 126.5);
    context.lineTo(92, 126.5);
    context.stroke();
  }, [animationName, direction, image, index]);
  return <canvas className="sprite-debug-preview" ref={preview} />;
}

function SaoHpGauge({ value, max, compact = false }) {
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const width = compact ? 198 : 286;
  const height = compact ? 23 : 29;
  const shape = compact
    ? "M2 2 H196 L187 21 H2 Z"
    : "M2 2 H284 L274 18 H170 L164 27 H2 Z";
  const inner = compact
    ? "M7 6 H188 L182 17 H7 Z"
    : "M7 6 H276 L269 14 H166 L160 23 H7 Z";
  const clipId = useMemo(() => `hp-${randomId()}`, []);
  return (
    <svg className="sao-hp-gauge" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${clipId}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eeeeee" /><stop offset=".45" stopColor="#777" /><stop offset="1" stopColor="#cfcfcf" />
        </linearGradient>
        <linearGradient id={`${clipId}-green`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c6ed59" /><stop offset=".38" stopColor="#9bd12d" /><stop offset="1" stopColor="#6c9e12" />
        </linearGradient>
        <clipPath id={`${clipId}-clip`}><path d={inner} /></clipPath>
      </defs>
      <path d={shape} fill={`url(#${clipId}-metal)`} stroke="#e7e7e7" strokeWidth="1" />
      <path d={inner} fill="#282828" />
      <rect className="sao-hp-fill" x="7" y="6" width={(width - 16) * ratio} height={height - 11} fill={`url(#${clipId}-green)`} clipPath={`url(#${clipId}-clip)`} />
      <path d={inner} fill="none" stroke="#4c4c4c" strokeWidth="1.2" />
    </svg>
  );
}

export default function Gameplay({ project, setProject, onExit, user }) {
  const [hero, setHero] = useState(() => readSave(project));
  const [gameMapId, setGameMapId] = useState(() => readSave(project).mapId);
  const [enemies, setEnemies] = useState(() =>
    Object.fromEntries(
      Object.entries(project.maps).map(([mapId, map]) => [
        mapId,
        map.objects
          .filter(
            (object) =>
              object.enemy && !readSave(project).defeated.includes(object.uid),
          )
          .map((object) => ({
            ...object,
            hp: object.enemy.hp,
            maxHp: object.enemy.hp,
            anchorX: object.x,
            anchorY: object.y,
            lastAttack: 0,
            wanderX: 0,
            wanderY: 0,
            nextWander: 0,
          })),
      ]),
    ),
  );
  const [dialogue, setDialogue] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [notice, setNotice] = useState("Bem-vindo a Aincrad");
  const [currentSector, setCurrentSector] = useState(null);
  const [skillCooldown, setSkillCooldown] = useState(0);
  const [heroAnimation, setHeroAnimation] = useState(() =>
    movementAnimation({
      armed: hero.isArmed,
      equipped: Boolean(equippedItem(hero, "weapon")),
      moving: false,
    }),
  );
  const [animationStartedAt, setAnimationStartedAt] = useState(() => performance.now());
  const [attackFacing, setAttackFacing] = useState("down");
  const [effects, setEffects] = useState([]);
  const [loot, setLoot] = useState([]);
  const [panel, setPanel] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnimating, setMenuAnimating] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [menuColumn, setMenuColumn] = useState("root");
  const [activeDetailIndex, setActiveDetailIndex] = useState(0);
  const [debug, setDebug] = useState(false);
  const [debugAnimation, setDebugAnimation] = useState("idle-armed");
  const [debugDirection, setDebugDirection] = useState("down");
  const [debugFrame, setDebugFrame] = useState(0);
  const [debugPlaying, setDebugPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [defending, setDefending] = useState(false);
  const [controllerOpen, setControllerOpen] = useState(false);
  const [controllerConnected, setControllerConnected] = useState(false);
  const [controllerQr, setControllerQr] = useState("");
  const [cloudState, setCloudState] = useState(user ? "Conectando..." : "Salvo neste dispositivo");
  const [cloudReady, setCloudReady] = useState(!user);
  const controllerToken = useRef(null);
  if (!controllerToken.current) {
    controllerToken.current = localStorage.getItem(CONTROLLER_TOKEN_KEY) || randomId();
    localStorage.setItem(CONTROLLER_TOKEN_KEY, controllerToken.current);
  }
  const [assetRevision, requestUiRefresh] = useState(0);
  const canvas = useRef(null);
  const worldCanvas = useRef(document.createElement("canvas"));
  const viewportCanvas = useRef(document.createElement("canvas"));
  const minimapCanvas = useRef(null);
  const images = useRef({});
  const atlas = useRef(null);
  const heroSheets = useRef({});
  const companionSheets = useRef({});
  const companionsRef = useRef(
    COMPANION_DEFINITIONS.map((companion) => {
      for (const [mapId, candidateMap] of Object.entries(project.maps)) {
        const placed = candidateMap.objects.find((object) => object.id === companion.id);
        if (placed) return { ...companion, mapId, x: placed.x, y: placed.y, anchorX: placed.x, anchorY: placed.y };
      }
      return { ...companion };
    }),
  );
  const attackSequence = useRef(0);
  const basicCombo = useRef(0);
  const attackReadyAt = useRef(0);
  const audio = useRef(null);
  const menuAudio = useRef({ open: null, click: null });
  const keys = useRef(new Set());
  const directionOrder = useRef([]);
  const heroRef = useRef(hero);
  const enemiesRef = useRef(enemies);
  const effectsRef = useRef(effects);
  const heroAnimationRef = useRef(heroAnimation);
  const animationStartedAtRef = useRef(animationStartedAt);
  const attackFacingRef = useRef(attackFacing);
  const movementSoundStep = useRef(0);
  const currentSectorRef = useRef(null);
  const dialogueRef = useRef(dialogue);
  const menuTimerRef = useRef(null);
  const defendingRef = useRef(false);
  const map = project.maps[gameMapId] || project.maps.village;
  const assetById = useMemo(
    () => Object.fromEntries(project.assets.map((asset) => [asset.id, asset])),
    [project.assets],
  );
  const currentEnemies = enemies[gameMapId] || [];
  const boss = currentEnemies.find((enemy) => enemy.enemy?.boss);
  const equippedWeapon = equippedItem(hero, "weapon");
  const equippedArmor = equippedItem(hero, "armor");

  const sound = useCallback(
    (frequency = 220, duration = 0.08, type = "square") => {
      if (muted) return;
      try {
        audio.current ??= new AudioContext();
        const oscillator = audio.current.createOscillator();
        const gain = audio.current.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.045, audio.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.current.currentTime + duration,
        );
        oscillator.connect(gain).connect(audio.current.destination);
        oscillator.start();
        oscillator.stop(audio.current.currentTime + duration);
      } catch {}
    },
    [muted],
  );

  const playMenuSound = useCallback((kind) => {
    if (muted) return;
    const target = menuAudio.current[kind];
    if (!target) return;
    target.currentTime = 0;
    target.play().catch(() => {});
  }, [muted]);

  useEffect(() => {
    menuAudio.current.open = new Audio("/audio/menu-open.mp3");
    menuAudio.current.click = new Audio("/audio/menu-click.mp3");
    menuAudio.current.open.preload = "auto";
    menuAudio.current.click.preload = "auto";
    return () => {
      menuAudio.current.open?.pause();
      menuAudio.current.click?.pause();
    };
  }, []);

  useEffect(() => {
    heroRef.current = hero;
  }, [hero]);
  useEffect(() => {
    dialogueRef.current = dialogue;
  }, [dialogue]);
  useEffect(() => {
    if (!dialogue) {
      setTypedText("");
      return undefined;
    }
    const fullText = dialogue.lines[dialogue.index] || "";
    setTypedText("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedText(fullText.slice(0, index));
      if (index >= fullText.length) window.clearInterval(timer);
    }, 24);
    return () => window.clearInterval(timer);
  }, [dialogue?.id, dialogue?.index]);
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);
  useEffect(() => {
    effectsRef.current = effects;
  }, [effects]);
  useEffect(() => {
    heroAnimationRef.current = heroAnimation;
  }, [heroAnimation]);
  useEffect(() => {
    animationStartedAtRef.current = animationStartedAt;
  }, [animationStartedAt]);
  useEffect(() => {
    attackFacingRef.current = attackFacing;
  }, [attackFacing]);
  useEffect(() => {
    defendingRef.current = defending;
  }, [defending]);

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    let socket;
    let retry;
    let stopped = false;
    const releaseRemoteControls = () => {
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "l"].forEach((key) =>
        window.dispatchEvent(new KeyboardEvent("keyup", { key })),
      );
    };
    const connect = () => {
      socket = new WebSocket(`${protocol}://${location.host}/controller-socket?role=host&token=${encodeURIComponent(controllerToken.current)}`);
      socket.onmessage = ({ data }) => {
        try {
          const message = JSON.parse(data);
          if (message.type === "status") {
            setControllerConnected(message.connected);
            if (message.connected) setControllerOpen(false);
            if (!message.connected) releaseRemoteControls();
            return;
          }
          const keyByControl = {
            up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
            attack: "j", interact: "e", menu: "p", defend: "l",
          };
          const key = keyByControl[message.control];
          if (!key) return;
          const isDown = message.type === "buttonDown" || message.type === "directionDown";
          window.dispatchEvent(new KeyboardEvent(isDown ? "keydown" : "keyup", { key }));
        } catch {}
      };
      socket.onclose = () => {
        setControllerConnected(false);
        releaseRemoteControls();
        if (!stopped) retry = setTimeout(connect, 1200);
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket?.close();
      releaseRemoteControls();
    };
  }, []);

  useEffect(() => {
    const url = `${location.origin}/controller?token=${encodeURIComponent(controllerToken.current)}`;
    QRCode.toDataURL(url, { width: 260, margin: 1, color: { dark: "#101820", light: "#ffffff" } })
      .then(setControllerQr)
      .catch(() => setControllerQr(""));
  }, []);
  useEffect(() => {
    const save = () =>
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          ...heroRef.current,
          mapId: gameMapId,
          saveVersion: GAMEPLAY_SAVE_VERSION,
        }),
      );
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [gameMapId]);
  useEffect(() => {
    if (!supabase || !user) {
      setCloudState("Salvo neste dispositivo");
      setCloudReady(true);
      return undefined;
    }
    let cancelled = false;
    setCloudReady(false);
    setCloudState("Carregando save da nuvem...");
    supabase
      .from("game_saves")
      .select("data")
      .eq("user_id", user.id)
      .eq("slot", "main")
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setCloudState("Nuvem indisponível · save local ativo");
          setCloudReady(true);
          return;
        }
        if (data?.data) {
          localStorage.setItem(SAVE_KEY, JSON.stringify(data.data));
          const restored = readSave(project);
          setHero(restored);
          setGameMapId(restored.mapId);
          setEnemies(
            Object.fromEntries(
              Object.entries(project.maps).map(([mapId, target]) => [
                mapId,
                target.objects
                  .filter(
                    (object) =>
                      object.enemy && !restored.defeated.includes(object.uid),
                  )
                  .map((object) => ({
                    ...object,
                    hp: object.enemy.hp,
                    maxHp: object.enemy.hp,
                    anchorX: object.x,
                    anchorY: object.y,
                    lastAttack: 0,
                    wanderX: 0,
                    wanderY: 0,
                    nextWander: 0,
                  })),
              ]),
            ),
          );
          setNotice("Progresso restaurado da nuvem");
        }
        setCloudState("Sincronizado com a nuvem");
        setCloudReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [project, user?.id]);
  useEffect(() => {
    const data = {
      ...hero,
      mapId: gameMapId,
      saveVersion: GAMEPLAY_SAVE_VERSION,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    if (!supabase || !user || !cloudReady) return undefined;
    setCloudState("Sincronizando...");
    const timeout = window.setTimeout(async () => {
      const { error } = await supabase.from("game_saves").upsert(
        {
          user_id: user.id,
          slot: "main",
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,slot" },
      );
      setCloudState(
        error ? "Nuvem indisponível · save local ativo" : "Sincronizado com a nuvem",
      );
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [cloudReady, gameMapId, hero, user?.id]);
  useEffect(() => {
    const regionTone = { village: 262, fields: 330, forest: 196, ruins: 146 };
    sound(regionTone[gameMapId] || 220, 0.35, "sine");
  }, [gameMapId, sound]);
  useEffect(() => {
    const timeout = notice ? setTimeout(() => setNotice(""), 2600) : null;
    return () => timeout && clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    const loadSheet = (src, ref) => {
      const sheet = new Image();
      sheet.onload = () => {
        const processed = document.createElement("canvas");
        processed.width = sheet.naturalWidth;
        processed.height = sheet.naturalHeight;
        const context = processed.getContext("2d", {
          willReadFrequently: true,
        });
        context.drawImage(sheet, 0, 0);
        const pixels = context.getImageData(
          0,
          0,
          processed.width,
          processed.height,
        );
        for (let i = 0; i < pixels.data.length; i += 4) {
          const red = pixels.data[i],
            green = pixels.data[i + 1],
            blue = pixels.data[i + 2];
          const isAtlasBackground =
            red < 18 &&
            green < 25 &&
            blue < 32 &&
            blue >= green &&
            green >= red &&
            blue - red >= 5;
          if (isAtlasBackground) pixels.data[i + 3] = 0;
        }
        context.putImageData(pixels, 0, 0);
        ref.current = processed;
        requestUiRefresh((value) => value + 1);
      };
      sheet.src = src;
    };
    loadSheet("/sprites/aincrad-atlas.png", atlas);
    for (const [name, animation] of Object.entries(HERO_ANIMATIONS)) {
      const image = new Image();
      image.onload = () => {
        heroSheets.current[name] = image;
        requestUiRefresh((value) => value + 1);
      };
      image.src = animation.src;
    }
    for (const companion of COMPANION_DEFINITIONS) {
      companionSheets.current[companion.id] ??= {};
      for (const name of ["idle-armed", "walk-armed"]) {
        const image = new Image();
        image.onload = () => {
          companionSheets.current[companion.id][name] = image;
          requestUiRefresh((value) => value + 1);
        };
        image.src = COMPANION_ANIMATIONS[companion.id][name].src;
      }
    }
    for (const asset of project.assets.filter((item) => item.src)) {
      if (images.current[asset.id]) continue;
      const image = new Image();
      image.onload = () => requestUiRefresh((value) => value + 1);
      image.src = asset.src;
      images.current[asset.id] = image;
    }
    for (const id of CUSTOM_MONSTER_IDS) {
      const image = new Image();
      image.onload = () => requestUiRefresh((value) => value + 1);
      image.src = `/sprites/monsters/custom/${id}-attack.png`;
      images.current[`${id}-attack`] = image;
    }
  }, [project.assets]);

  useEffect(() => {
    if (!debugPlaying) return undefined;
    const animation = HERO_ANIMATIONS[debugAnimation];
    const timer = setInterval(
      () => setDebugFrame((frame) => (frame + 1) % animation.frames),
      1000 / animation.fps,
    );
    return () => clearInterval(timer);
  }, [debugAnimation, debugPlaying]);

  const terrainBlocked = useCallback(
    (x, y, targetMap = map) => {
      const pointBlocked = (sampleX, sampleY) => {
        const tx = Math.floor(sampleX + 0.5),
          ty = Math.floor(sampleY + 0.5);
        if (tx < 0 || ty < 0 || tx >= targetMap.w || ty >= targetMap.h)
          return true;
        const inside = (box) =>
          sampleX + 0.5 >= box.x &&
          sampleX + 0.5 < box.x + box.w &&
          sampleY + 0.5 >= box.y &&
          sampleY + 0.5 < box.y + box.h;
        const walkableStructure = targetMap.objects.some((object) => {
          if (object.solid !== false || !["bridge", "bridge_h"].includes(object.id)) return false;
          const asset = assetById[object.id];
          return asset && inside(objectHitbox(asset, object));
        });
        if (walkableStructure) return false;
        if (targetMap.collisions?.[String.fromCharCode(65 + ty) + (tx + 1)])
          return true;
        const ground = targetMap.ground[ty * targetMap.w + tx] || "grass";
        if (ground.startsWith("water")) return true;
        if (ground.startsWith("bank_") && !ground.endsWith("_base")) return true;
        return targetMap.objects.some((object) => {
          if (object.enemy || object.id === "player" || object.solid === false)
            return false;
          const asset = assetById[object.id];
          return asset && inside(objectHitbox(asset, object));
        });
      };
      return [
        [x - 0.22, y - 0.12],
        [x + 0.22, y - 0.12],
        [x - 0.22, y + 0.12],
        [x + 0.22, y + 0.12],
      ].some(([sampleX, sampleY]) => pointBlocked(sampleX, sampleY));
    },
    [map, assetById],
  );

  const crossEdge = useCallback(
    (next) => {
      const floor = project.floors?.find((item) => item.id === "floor_01");
      const index = floor?.maps.indexOf(gameMapId) ?? -1;
      if (index < 0) return null;
      const row = Math.floor(index / 2),
        column = index % 2;
      let destinationIndex = -1;
      if (next.x < 0 && column === 1) destinationIndex = index - 1;
      if (next.x >= map.w && column === 0) destinationIndex = index + 1;
      if (next.y < 0 && row === 1) destinationIndex = index - 2;
      if (next.y >= map.h && row === 0) destinationIndex = index + 2;
      const id = floor?.maps[destinationIndex];
      const destination = project.maps[id];
      if (!destination) return null;
      const position = {
        ...next,
        x: next.x < 0 ? destination.w - 1 : next.x >= map.w ? 0 : next.x,
        y: next.y < 0 ? destination.h - 1 : next.y >= map.h ? 0 : next.y,
      };
      setGameMapId(id);
      setNotice(destination.name);
      return position;
    },
    [gameMapId, map, project.floors, project.maps],
  );

  const toggleWeapon = useCallback(() => {
    const player = heroRef.current;
    if (!equippedItem(player, "weapon")) {
      setNotice("Equipe uma arma primeiro");
      return;
    }
    player.isArmed = !player.isArmed;
    setHero({ ...player });
    if (!isAttackAnimation(heroAnimationRef.current)) {
      const nextAnimation = movementAnimation({
        armed: player.isArmed,
        equipped: true,
        moving: false,
      });
      heroAnimationRef.current = nextAnimation;
      animationStartedAtRef.current = performance.now();
      setHeroAnimation(nextAnimation);
      setAnimationStartedAt(animationStartedAtRef.current);
    }
    setNotice(player.isArmed ? "Espada em punho" : "Espada guardada");
  }, []);

  const toggleSaoMenu = useCallback(() => {
    if (menuAnimating) return;
    playMenuSound("open");
    window.clearTimeout(menuTimerRef.current);
    keys.current.clear();
    if (!menuOpen) {
      setPanel(null);
      setActiveCategory(null);
      setActiveSubcategory(null);
      setMenuColumn("root");
      setActiveDetailIndex(0);
      setMenuClosing(false);
      setMenuOpen(true);
      setMenuAnimating(true);
      menuTimerRef.current = window.setTimeout(() => setMenuAnimating(false), 430);
      return;
    }
    setActiveSubcategory(null);
    setActiveCategory(null);
    setMenuClosing(true);
    setMenuAnimating(true);
    menuTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
      setMenuAnimating(false);
    }, 430);
  }, [menuAnimating, menuOpen, playMenuSound]);

  useEffect(() => () => window.clearTimeout(menuTimerRef.current), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        )
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "l") {
        event.preventDefault();
        if (menuOpen && !event.repeat) {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        } else if (dialogueRef.current && !event.repeat) {
          setDialogue(null);
        } else if (!event.repeat) setDefending(true);
        return;
      }
      if (key === "e" && menuOpen && !event.repeat) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        return;
      }
      if ((key === "p" || key === "escape") && !event.repeat) {
        event.preventDefault();
        toggleSaoMenu();
        return;
      }
      if (menuOpen && !menuAnimating && !event.repeat && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        playMenuSound("click");
        const roots = ["character", "party", "messages", "location", "settings"];
        const sections = ["items", "skills", "equipment"];
        if (key === "arrowright") {
          if (menuColumn === "root" && activeCategory === "character") {
            setMenuColumn("category");
            setActiveSubcategory((current) => current || "items");
          } else if (menuColumn === "category" && activeSubcategory) {
            setMenuColumn("detail");
            setActiveDetailIndex(0);
          }
        } else if (key === "arrowleft") {
          if (menuColumn === "detail") setMenuColumn("category");
          else if (menuColumn === "category") setMenuColumn("root");
        } else if (menuColumn === "root") {
          const direction = key === "arrowdown" ? 1 : -1;
          const currentIndex = activeCategory == null ? -1 : roots.indexOf(activeCategory);
          const nextRoot = roots[(currentIndex + direction + roots.length) % roots.length];
          setActiveCategory(nextRoot);
          setActiveSubcategory(nextRoot === "character" ? "items" : null);
          if (nextRoot === "character") setMenuColumn("category");
          setActiveDetailIndex(0);
        } else if (menuColumn === "category" && activeCategory === "character") {
          const direction = key === "arrowdown" ? 1 : -1;
          const currentIndex = activeSubcategory == null ? -1 : sections.indexOf(activeSubcategory);
          setActiveSubcategory(sections[(currentIndex + direction + sections.length) % sections.length]);
          setActiveDetailIndex(0);
        } else if (menuColumn === "detail") {
          const direction = key === "arrowdown" ? 1 : -1;
          const detailCount = activeSubcategory === "items"
            ? Math.max(1, Math.min(4, heroRef.current.inventory.length))
            : activeSubcategory === "skills" ? 4 : 2;
          setActiveDetailIndex((current) => (current + direction + detailCount) % detailCount);
        }
        return;
      }
      if (panel || menuOpen) return;
      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "w",
          "a",
          "s",
          "d",
          "shift",
        ].includes(key)
      ) {
        event.preventDefault();
        keys.current.add(key);
        if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
          directionOrder.current = directionOrder.current.filter((item) => item !== key);
          directionOrder.current.push(key);
        }
      }
      if (dialogueRef.current) {
        if ((key === "e" || key === "t" || key === " ") && !event.repeat) {
          event.preventDefault();
          advanceDialogue();
        }
        return;
      }
      if ((key === "q" || key === "tab") && !event.repeat) {
        event.preventDefault();
        toggleWeapon();
      }
      if ((key === " " || key === "j") && !event.repeat) {
        event.preventDefault();
        attack(false);
      }
      if (key === "k" && !event.repeat) attack(true);
      if ((key === "e" || key === "t") && !event.repeat) interact();
      if (key === "h" && !event.repeat) usePotion();
    };
    const onKeyUp = (event) => {
      const key = event.key.toLowerCase();
      keys.current.delete(key);
      directionOrder.current = directionOrder.current.filter((item) => item !== key);
      if (key === "l") setDefending(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  const defeatEnemy = (enemy, current) => {
    const defeated = [...new Set([...current.defeated, enemy.uid])];
    const kills = current.quest.active
      ? current.quest.kills + 1
      : current.quest.kills;
    let quest = { ...current.quest, kills };
    let coins = current.coins + (enemy.enemy?.boss ? 100 : 8);
    let xp = current.xp + enemy.enemy.xp;
    let bossDefeated = current.bossDefeated;
    const drop = enemy.enemy?.boss
      ? {
          id: `boss_blade_${Date.now()}`,
          name: "Lâmina do Kobold Lord",
          type: "weapon",
          rarity: "Épico",
          attack: 24,
        }
      : enemy.id === "wolf"
        ? {
            id: `wolf_hide_${Date.now()}`,
            name: "Pele de Lobo",
            type: "material",
            rarity: "Incomum",
          }
        : enemy.id === "boar"
          ? {
              id: `boar_tusk_${Date.now()}`,
              name: "Presa de Javali",
              type: "material",
              rarity: "Comum",
            }
          : {
              id: `gel_${Date.now()}`,
              name: "Gel de Slime",
              type: "material",
              rarity: "Comum",
            };
    setLoot((items) => [...items.slice(-3), drop]);
    if (quest.active && kills >= 3 && !quest.complete) {
      quest = { ...quest, complete: true };
      coins += 40;
      setNotice("Missão concluída · +40 col · +1 poção");
    }
    if (enemy.enemy?.boss) {
      bossDefeated = true;
      setNotice("Kobold Lord derrotado · Andar 02 desbloqueado!");
      setProject((value) => ({
        ...value,
        floors: value.floors.map((floor) =>
          floor.number === 2 ? { ...floor, unlocked: true } : floor,
        ),
      }));
    }
    const level = Math.floor(xp / 100) + 1;
    return {
      ...current,
      defeated,
      quest,
      coins,
      xp,
      level,
      potions:
        current.potions + (quest.complete && !current.quest.complete ? 1 : 0),
      inventory: [...current.inventory, drop],
      bossDefeated,
      maxHp: 100 + (level - 1) * 12,
      stats: {
        ...current.stats,
        points: current.stats.points + Math.max(0, level - current.level) * 2,
      },
    };
  };

  const attack = useCallback(
    (skill) => {
      const now = Date.now();
      if (heroRef.current.hp <= 0 || defendingRef.current) return;
      const weapon = equippedItem(heroRef.current, "weapon");
      if (!weapon) {
        setNotice("Equipe uma arma para atacar");
        return;
      }
      if (now < attackReadyAt.current || (skill && skillCooldown > now)) return;
      const animationName = skill
        ? "vorpal-arc"
        : basicCombo.current++ % 2
          ? "attack-2"
          : "attack-1";
      const config = ATTACKS[animationName];
      if (skill && heroRef.current.mp < config.sp) {
        setNotice("SP insuficiente");
        return;
      }
      const baseDamage =
        24 +
        heroRef.current.level * 4 +
        heroRef.current.stats.attack +
        (weapon.attack || 0);
      const damage = attackDamage(baseDamage, animationName);
      const lockedFacing = heroRef.current.facing;
      const startedAt = performance.now();
      heroAnimationRef.current = animationName;
      animationStartedAtRef.current = startedAt;
      attackFacingRef.current = lockedFacing;
      setHeroAnimation(animationName);
      setAnimationStartedAt(startedAt);
      setAttackFacing(lockedFacing);
      const sequence = ++attackSequence.current;
      attackReadyAt.current = now + config.cooldown;
      setTimeout(() => {
        if (attackSequence.current !== sequence) return;
        const player = heroRef.current;
        const defeated = [];
        const hitEffects = [];
        const nextEnemies = (enemiesRef.current[gameMapId] || [])
          .map((enemy) => {
            if (!isInDirectionalRange(player, enemy, lockedFacing, config.range, TILE))
              return enemy;
            const hp = enemy.hp - damage;
            if (hp <= 0) defeated.push(enemy);
            hitEffects.push({
              id: randomId(),
              type: hp <= 0 ? "death" : "impact",
              x: enemy.x,
              y: enemy.y,
              value: damage,
              born: Date.now(),
              monster: enemy.id,
            });
            return { ...enemy, hp };
          })
          .filter((enemy) => enemy.hp > 0);
        setEnemies((all) => ({ ...all, [gameMapId]: nextEnemies }));
        if (defeated.length) {
          setHero(
            defeated.reduce(
              (value, enemy) => defeatEnemy(enemy, value),
              heroRef.current,
            ),
          );
        }
        if (hitEffects.length) {
          setEffects((items) => [...items, ...hitEffects]);
          const ids = new Set(hitEffects.map((item) => item.id));
          setTimeout(
            () => setEffects((items) => items.filter((item) => !ids.has(item.id))),
            720,
          );
        }
      }, attackImpactDelay(animationName));
      sound(skill ? 520 : 330, skill ? 0.2 : 0.1, "sawtooth");
      if (skill) {
        setSkillCooldown(now + config.cooldown);
        setHero((current) => ({ ...current, mp: current.mp - config.sp }));
        setNotice("Vorpal Arc!");
      }
      setTimeout(
        () => {
          if (attackSequence.current !== sequence) return;
          const idleAnimation = movementAnimation({
            armed: heroRef.current.isArmed,
            equipped: Boolean(equippedItem(heroRef.current, "weapon")),
            moving: false,
          });
          heroAnimationRef.current = idleAnimation;
          setHeroAnimation(idleAnimation);
          setAnimationStartedAt(performance.now());
        },
        config.duration,
      );
    },
    [gameMapId, skillCooldown, sound],
  );

  const advanceDialogue = useCallback(() => {
    setDialogue((current) => {
      if (!current) return null;
      const fullText = current.lines[current.index] || "";
      if (typedText.length < fullText.length) {
        setTypedText(fullText);
        return current;
      }
      if (current.index < current.lines.length - 1)
        return { ...current, index: current.index + 1 };
      if (current.canRecruit) return { ...current, choosing: true };
      return null;
    });
  }, [typedText]);

  const hasLineOfSight = useCallback((from, to) => {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(2, Math.ceil(distance * 5));
    for (let index = 1; index < steps - 1; index += 1) {
      const ratio = index / steps;
      if (terrainBlocked(
        from.x + (to.x - from.x) * ratio,
        from.y + (to.y - from.y) * ratio,
      )) return false;
    }
    return true;
  }, [terrainBlocked]);

  const interact = useCallback(() => {
    const player = heroRef.current;
    const companion = companionsRef.current
      .filter((candidate) => candidate.mapId === gameMapId)
      .filter((candidate) => Math.hypot(candidate.x - player.x, candidate.y - player.y) <= 2.15)
      .filter((candidate) => hasLineOfSight(player, candidate))
      .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
    if (companion) {
      const friendship = player.friendships?.[companion.id] || 0;
      const lines = randomConversation(companion.id, friendship);
      setHero((current) => ({
        ...current,
        friendships: {
          ...current.friendships,
          [companion.id]: Math.min(20, friendship + 1),
        },
      }));
      keys.current.clear();
      setDialogue({
        id: randomId(),
        characterId: companion.id,
        name: companion.name,
        lines,
        index: 0,
        choosing: false,
        canRecruit: friendship + 1 >= 4 && !player.partners.includes(companion.id),
        friendship: friendship + 1,
      });
      return;
    }
    const npc = map.objects.find(
      (object) =>
        object.id === "npc" &&
        Math.hypot(object.x - player.x, object.y - player.y) <= 2.2,
    );
    if (!npc) {
      setNotice("Nenhum NPC por perto");
      return;
    }
    setHero((current) => ({
      ...current,
      quest: current.quest.complete
        ? current.quest
        : { ...current.quest, active: true },
    }));
    setDialogue({
      id: randomId(),
      name: npc.name || "Aldeão",
      lines: [heroRef.current.quest.complete
        ? "Você provou seu valor. As ruínas esperam por você."
        : "Os monstros invadiram os campos. Derrote 3 criaturas e volte mais forte."],
      index: 0,
    });
  }, [gameMapId, hasLineOfSight, map.objects]);

  const answerPartnership = (accept) => {
    const current = dialogueRef.current;
    if (!current?.characterId) return setDialogue(null);
    if (!accept) {
      setDialogue(null);
      return;
    }
    setHero((value) => {
      if (value.partners.includes(current.characterId)) return value;
      if (value.partners.length >= 2) {
        setNotice("Seu grupo já tem o limite de 2 parceiros");
        return value;
      }
      setNotice(`${current.name} entrou no seu grupo`);
      return { ...value, partners: [...value.partners, current.characterId] };
    });
    setDialogue(null);
  };

  const dismissPartner = (characterId) => {
    setHero((current) => ({
      ...current,
      partners: current.partners.filter((id) => id !== characterId),
    }));
    setNotice(`${CHARACTER_PROFILES[characterId]?.name} deixou o grupo`);
  };

  const usePotion = useCallback(() => {
    setHero((current) => {
      if (!current.potions || current.hp >= current.maxHp) return current;
      setNotice("Poção usada · +45 HP");
      return {
        ...current,
        hp: Math.min(current.maxHp, current.hp + 45),
        potions: current.potions - 1,
      };
    });
  }, []);

  useEffect(() => {
    const respawn = (event) => {
      if (event.key.toLowerCase() !== "r" || heroRef.current.hp > 0) return;
      setGameMapId("village");
      setHero((current) => ({
        ...current,
        ...VILLAGE_SPAWN,
        hp: current.maxHp,
      }));
      setNotice("Você retornou à Cidade Inicial");
    };
    window.addEventListener("keydown", respawn);
    return () => window.removeEventListener("keydown", respawn);
  }, []);

  useEffect(() => {
    if (!map) return;
    const cleanMap = {
      ...map,
      objects: map.objects.filter(
        (object) => !object.enemy && object.id !== "player" && !HERO_IDS.has(object.id),
      ),
    };
    const world = worldCanvas.current;
    renderMap(world, cleanMap, project.assets, {
      zoom: 1,
      grid: false,
      play: true,
      player: null,
      night: 0,
      images: images.current,
    });
  }, [assetRevision, map, project.assets]);

  useEffect(() => {
    const target = canvas.current;
    if (!target || !map) return;
    const world = worldCanvas.current;
    const viewport = viewportCanvas.current;
    const viewWidth = 480;
    const viewHeight = 270;
    if (viewport.width !== viewWidth || viewport.height !== viewHeight) {
      viewport.width = viewWidth;
      viewport.height = viewHeight;
    }
    if (target.width !== 960 || target.height !== 540) {
      target.width = 960;
      target.height = 540;
    }
    const context = viewport.getContext("2d");
    const screen = target.getContext("2d");
    context.imageSmoothingEnabled = false;
    screen.imageSmoothingEnabled = false;
    let frameId = 0;
    let lastTime = performance.now();
    let debugRefreshElapsed = 0;
    let aiElapsed = 0;

    const frame = (now) => {
      const deltaMs = Math.min(50, Math.max(0, now - lastTime));
      lastTime = now;
      const player = heroRef.current;
      const held = keys.current;
      const activeAnimation = heroAnimationRef.current;
      const partnerIds = new Set(player.partners || []);
      for (const companion of companionsRef.current) {
        if (!partnerIds.has(companion.id) || companion.mapId === gameMapId) continue;
        companion.mapId = gameMapId;
        companion.x = player.x + 1;
        companion.y = player.y + 1;
      }
      const activeCompanions = companionsRef.current.filter(
        (companion) => companion.mapId === gameMapId,
      );
      const blockedByCompanion = (x, y, ignoredId = null) =>
        activeCompanions.some(
          (companion) =>
            companion.id !== ignoredId &&
            Math.hypot(companion.x - x, companion.y - y) < 0.72,
        );

      if (!dialogue && !panel && !menuOpen && player.hp > 0 && !isAttackAnimation(activeAnimation)) {
        const activeDirection = [...directionOrder.current].reverse().find((key) => held.has(key));
        const directionVector = {
          d: [1, 0], arrowright: [1, 0],
          a: [-1, 0], arrowleft: [-1, 0],
          s: [0, 1], arrowdown: [0, 1],
          w: [0, -1], arrowup: [0, -1],
        };
        let [dx, dy] = directionVector[activeDirection] || [0, 0];
        if (dx || dy) {
          const nextAnimation = movementAnimation({
            armed: player.isArmed,
            equipped: Boolean(equippedItem(player, "weapon")),
            moving: true,
            running: held.has("shift"),
          });
          if (activeAnimation !== nextAnimation) {
            heroAnimationRef.current = nextAnimation;
            animationStartedAtRef.current = now;
            setHeroAnimation(nextAnimation);
            setAnimationStartedAt(now);
          }
          const length = Math.hypot(dx, dy);
          const speed = held.has("shift") ? 5.4 : 3.6;
          const distance = speed * (deltaMs / 1000);
          dx = (dx / length) * distance;
          dy = (dy / length) * distance;
          const facing =
            Math.abs(dx) > Math.abs(dy)
              ? dx < 0
                ? "left"
                : "right"
              : dy < 0
                ? "up"
                : "down";
          const nextX = player.x + dx;
          const nextY = player.y + dy;
          if (nextX < 0 || nextY < 0 || nextX >= map.w || nextY >= map.h) {
            const crossed = crossEdge({ ...player, x: nextX, y: nextY, facing });
            if (crossed) Object.assign(player, crossed);
          } else {
            if (
              !terrainBlocked(nextX, player.y) &&
              !blockedByCompanion(nextX, player.y)
            )
              player.x = nextX;
            if (
              !terrainBlocked(player.x, nextY) &&
              !blockedByCompanion(player.x, nextY)
            )
              player.y = nextY;
            player.facing = facing;
            player.step += deltaMs / 50;
          }
          movementSoundStep.current += deltaMs;
          if (movementSoundStep.current >= 400) {
            movementSoundStep.current %= 400;
            sound(95, 0.025, "sine");
          }
        } else if (activeAnimation.includes("walk-") || activeAnimation.includes("run-")) {
          const idleAnimation = movementAnimation({
            armed: player.isArmed,
            equipped: Boolean(equippedItem(player, "weapon")),
            moving: false,
          });
          heroAnimationRef.current = idleAnimation;
          animationStartedAtRef.current = now;
          setHeroAnimation(idleAnimation);
          setAnimationStartedAt(now);
        }
      }

      // Friendly heroes roam independently while sharing the same world and
      // character collision rules as the player.
      for (const companion of activeCompanions) {
        if (partnerIds.has(companion.id)) {
          const offset = (player.partners || []).indexOf(companion.id) === 0 ? 0.75 : -0.75;
          const targetX = player.x - (player.facing === "right" ? 1.15 : player.facing === "left" ? -1.15 : offset);
          const targetY = player.y - (player.facing === "down" ? 1.15 : player.facing === "up" ? -1.15 : offset);
          const dx = targetX - companion.x;
          const dy = targetY - companion.y;
          const followDistance = Math.hypot(dx, dy);
          if (followDistance > 8) {
            companion.x = targetX;
            companion.y = targetY;
          } else if (followDistance > 0.55) {
            const stride = Math.min(followDistance, 3.1 * (deltaMs / 1000));
            const nextX = companion.x + (dx / followDistance) * stride;
            const nextY = companion.y + (dy / followDistance) * stride;
            if (!terrainBlocked(nextX, companion.y)) companion.x = nextX;
            if (!terrainBlocked(companion.x, nextY)) companion.y = nextY;
            companion.moving = true;
            companion.facing = Math.abs(dx) > Math.abs(dy)
              ? (dx < 0 ? "left" : "right")
              : (dy < 0 ? "up" : "down");
          } else companion.moving = false;
          continue;
        }
        if (now >= companion.nextDecision) {
          const angle = Math.random() * Math.PI * 2;
          const shouldRest = Math.random() < 0.24;
          companion.directionX = shouldRest ? 0 : Math.cos(angle);
          companion.directionY = shouldRest ? 0 : Math.sin(angle);
          companion.nextDecision = now + 900 + Math.random() * 1800;
          companion.moving = !shouldRest;
          companion.animationStartedAt = now;
        }
        if (!companion.moving) continue;
        const distance = companion.speed * (deltaMs / 1000);
        const nextX = companion.x + companion.directionX * distance;
        const nextY = companion.y + companion.directionY * distance;
        const nearPlayer = (x, y) => Math.hypot(player.x - x, player.y - y) < 0.72;
        let moved = false;
        if (
          !terrainBlocked(nextX, companion.y) &&
          !nearPlayer(nextX, companion.y) &&
          !blockedByCompanion(nextX, companion.y, companion.id)
        ) {
          companion.x = nextX;
          moved = true;
        }
        if (
          !terrainBlocked(companion.x, nextY) &&
          !nearPlayer(companion.x, nextY) &&
          !blockedByCompanion(companion.x, nextY, companion.id)
        ) {
          companion.y = nextY;
          moved = true;
        }
        if (!moved) {
          companion.nextDecision = now;
          companion.moving = false;
        } else if (Math.abs(companion.directionX) > Math.abs(companion.directionY)) {
          companion.facing = companion.directionX < 0 ? "left" : "right";
        } else {
          companion.facing = companion.directionY < 0 ? "up" : "down";
        }
      }

      aiElapsed += deltaMs;
      if (aiElapsed >= 300 && !dialogue && player.hp > 0) {
        aiElapsed %= 300;
        const wallTime = Date.now();
        let incoming = 0;
        for (const enemy of enemiesRef.current[gameMapId] || []) {
          const enemyDx = player.x - enemy.x;
          const enemyDy = player.y - enemy.y;
          const enemyDistance = Math.hypot(enemyDx, enemyDy);
          const enemyRange = enemyAggroRadius(enemy);
          const playerInZone = Math.hypot(player.x - enemy.anchorX, player.y - enemy.anchorY) < enemyRange;
          if (playerInZone && enemyDistance > 0.9) {
            const enemySpeed = enemy.enemy?.boss ? 0.34 : 0.22;
            const nextX = enemy.x + (enemyDx / enemyDistance) * enemySpeed;
            const nextY = enemy.y + (enemyDy / enemyDistance) * enemySpeed;
            if (!terrainBlocked(nextX, enemy.y)) enemy.x = nextX;
            if (!terrainBlocked(enemy.x, nextY)) enemy.y = nextY;
          } else if (!playerInZone) {
            const homeDx = enemy.anchorX - enemy.x;
            const homeDy = enemy.anchorY - enemy.y;
            const homeDistance = Math.hypot(homeDx, homeDy);
            if (homeDistance > enemyRange * 0.72) {
              enemy.wanderX = homeDx / homeDistance;
              enemy.wanderY = homeDy / homeDistance;
            } else if (wallTime >= enemy.nextWander) {
              const angle = Math.random() * Math.PI * 2;
              const rests = Math.random() < 0.28;
              enemy.wanderX = rests ? 0 : Math.cos(angle);
              enemy.wanderY = rests ? 0 : Math.sin(angle);
              enemy.nextWander = wallTime + 1200 + Math.random() * 2200;
            }
            const patrolSpeed = enemy.enemy?.boss ? 0.1 : 0.075;
            const nextX = enemy.x + enemy.wanderX * patrolSpeed;
            const nextY = enemy.y + enemy.wanderY * patrolSpeed;
            if (Math.hypot(nextX - enemy.anchorX, nextY - enemy.anchorY) <= enemyRange * 0.82) {
              if (!terrainBlocked(nextX, enemy.y)) enemy.x = nextX;
              if (!terrainBlocked(enemy.x, nextY)) enemy.y = nextY;
            } else enemy.nextWander = 0;
          }
          if (playerInZone && enemyDistance <= 1.25 && wallTime - enemy.lastAttack > 900) {
            incoming += enemy.enemy.damage;
            enemy.lastAttack = wallTime;
          }
        }
        if (incoming) {
          if (defendingRef.current) incoming = Math.ceil(incoming * 0.35);
          heroAnimationRef.current = "hurt";
          setHeroAnimation("hurt");
          setEffects((items) => [
            ...items,
            {
              id: randomId(),
              type: "damage",
              x: player.x,
              y: player.y,
              value: incoming,
              born: wallTime,
            },
          ]);
          sound(110, 0.12, "sawtooth");
          setTimeout(() => {
            const idleAnimation = movementAnimation({
              armed: heroRef.current.isArmed,
              equipped: Boolean(equippedItem(heroRef.current, "weapon")),
              moving: false,
            });
            heroAnimationRef.current = idleAnimation;
            setHeroAnimation(idleAnimation);
          }, 260);
          setHero((current) => {
            const hp = Math.max(0, current.hp - incoming);
            if (!hp) setNotice("Você foi derrotado — pressione R para renascer");
            return { ...current, hp };
          });
        }
      }

      if (debug) {
        debugRefreshElapsed += deltaMs;
        if (debugRefreshElapsed >= 200) {
          debugRefreshElapsed %= 200;
          setHero({ ...player });
        }
      }

      const sourceX = Math.round(
        Math.max(0, Math.min(world.width - viewWidth, player.x * TILE + TILE / 2 - viewWidth / 2)),
      );
      const sourceY = Math.round(
        Math.max(0, Math.min(world.height - viewHeight, player.y * TILE + TILE / 2 - viewHeight / 2)),
      );
      context.clearRect(0, 0, viewWidth, viewHeight);
      context.drawImage(world, sourceX, sourceY, viewWidth, viewHeight, 0, 0, viewWidth, viewHeight);

      const sector = map.sectors?.find(
        (item) =>
          player.x >= item.x &&
          player.x < item.x + item.w &&
          player.y >= item.y &&
          player.y < item.y + item.h,
      );
      if (sector?.id !== currentSectorRef.current?.id) {
        currentSectorRef.current = sector || null;
        setCurrentSector(sector || null);
        if (sector) setNotice(`Setor ${sector.id} · ${sector.name}`);
      }

      const minimap = minimapCanvas.current;
      if (minimap) {
        const mini = minimap.getContext("2d");
        const scaleX = minimap.width / world.width;
        const scaleY = minimap.height / world.height;
        mini.imageSmoothingEnabled = false;
        mini.clearRect(0, 0, minimap.width, minimap.height);
        mini.globalAlpha = 0.76;
        mini.drawImage(world, 0, 0, minimap.width, minimap.height);
        mini.globalAlpha = 1;
        if (sector) {
          mini.fillStyle = "rgba(232, 205, 105, 0.14)";
          mini.strokeStyle = "rgba(232, 205, 105, 0.72)";
          mini.lineWidth = 1;
          mini.fillRect(
            sector.x * TILE * scaleX,
            sector.y * TILE * scaleY,
            sector.w * TILE * scaleX,
            sector.h * TILE * scaleY,
          );
          mini.strokeRect(
            sector.x * TILE * scaleX + 0.5,
            sector.y * TILE * scaleY + 0.5,
            sector.w * TILE * scaleX - 1,
            sector.h * TILE * scaleY - 1,
          );
        }
        mini.fillStyle = "#fff3a8";
        mini.strokeStyle = "#10151b";
        mini.lineWidth = 2;
        mini.beginPath();
        mini.arc(
          (player.x * TILE + TILE / 2) * scaleX,
          (player.y * TILE + TILE / 2) * scaleY,
          3.5,
          0,
          Math.PI * 2,
        );
        mini.fill();
        mini.stroke();
        mini.strokeStyle = "rgba(255,255,255,.7)";
        mini.lineWidth = 1;
        mini.strokeRect(
          sourceX * scaleX + 0.5,
          sourceY * scaleY + 0.5,
          viewWidth * scaleX - 1,
          viewHeight * scaleY - 1,
        );
      }
      context.save();
      context.translate(-sourceX, -sourceY);

      for (const enemy of enemiesRef.current[gameMapId] || []) {
        const radius = enemyAggroRadius(enemy) * TILE;
        const active = Math.hypot(enemy.anchorX - player.x, enemy.anchorY - player.y) <= enemyAggroRadius(enemy);
        context.save();
        context.beginPath();
        context.arc(enemy.anchorX * TILE + TILE / 2, enemy.anchorY * TILE + TILE / 2, radius, 0, Math.PI * 2);
        context.fillStyle = active ? "rgba(231, 58, 58, .12)" : "rgba(205, 48, 48, .055)";
        context.fill();
        context.setLineDash([7, 6]);
        context.lineWidth = active ? 2 : 1;
        context.strokeStyle = active ? "rgba(255, 82, 82, .78)" : "rgba(231, 72, 72, .34)";
        context.stroke();
        context.restore();
      }

      for (const enemy of enemiesRef.current[gameMapId] || []) {
      const asset = assetById[enemy.id];
      const frames = MONSTER_FRAMES[enemy.id];
      const isChasing = Math.hypot(enemy.anchorX - player.x, enemy.anchorY - player.y) < enemyAggroRadius(enemy);
      const monsterFrame =
        isChasing && Math.floor(now / 220) % 2
          ? frames?.walk
          : frames?.idle;
      const monsterWidth = enemy.enemy?.boss ? 82 : 48;
      const monsterHeight = enemy.enemy?.boss ? 82 : 48;
      const customMonster = CUSTOM_MONSTER_IDS.has(enemy.id);
      const attacking = Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 1.45;
      const customSprite = images.current[attacking ? `${enemy.id}-attack` : enemy.id];
      if (customMonster && customSprite?.complete) {
        const size = enemy.enemy?.boss ? 76 : 48;
        const ratio = customSprite.naturalWidth / Math.max(1, customSprite.naturalHeight);
        const width = Math.min(size * 1.25, size * ratio);
        context.drawImage(customSprite, enemy.x * TILE + TILE / 2 - width / 2, enemy.y * TILE + TILE - size, width, size);
      } else if (
        !drawAtlasFrame(
          context,
          atlas.current,
          monsterFrame,
          enemy.x * TILE - 8,
          enemy.y * TILE - (monsterHeight - 32),
          monsterWidth,
          monsterHeight,
        )
      )
        drawSprite(
          context,
          asset?.animationSet ? {
            ...asset,
            animationSet: {
              ...asset.animationSet,
              activeState: (() => {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "Right" : "Left") : (dy > 0 ? "Front" : "Back");
                return `${attacking ? "attack" : ""}${attacking ? direction : direction.toLowerCase()}`;
              })(),
            },
          } : asset,
          enemy.x * TILE,
          enemy.y * TILE,
          TILE,
          images.current,
        );
      const width = (asset?.w || 1) * TILE;
      context.fillStyle = "#28191c";
      context.fillRect(enemy.x * TILE, enemy.y * TILE - 7, width, 4);
      context.fillStyle = enemy.enemy?.boss ? "#d9584e" : "#e18762";
      context.fillRect(
        enemy.x * TILE,
        enemy.y * TILE - 7,
        width * (enemy.hp / enemy.maxHp),
        4,
      );
      }
      for (const companion of activeCompanions) {
        const animationName = companion.moving ? "walk-armed" : "idle-armed";
        const animations = COMPANION_ANIMATIONS[companion.id];
        const animation = animations[animationName];
        const sprite = companionSheets.current[companion.id]?.[animationName];
        const spriteFrame = animationFrame(
          animationName,
          companion.facing,
          companion.animationStartedAt,
          now,
          animations,
        );
        const rect = anchoredDrawRect(
          animation,
          companion.x * TILE + 16,
          companion.y * TILE + 30,
        );
        drawAtlasFrame(
          context,
          sprite,
          spriteFrame,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
        );
        const barWidth = 30;
        const barX = companion.x * TILE + 16 - barWidth / 2;
        const barY = companion.y * TILE - 39;
        context.fillStyle = "#241519";
        context.fillRect(barX - 1, barY - 1, barWidth + 2, 5);
        context.fillStyle = "#42c96b";
        context.fillRect(barX, barY, barWidth * (companion.hp / companion.maxHp), 3);
      }
      const animationName = heroAnimationRef.current;
    const normalizedAnimation =
      animationName === "hurt" || player.hp <= 0
        ? movementAnimation({
            armed: player.isArmed,
            equipped: Boolean(equippedItem(player, "weapon")),
            moving: false,
          })
        : animationName;
    const renderFacing = isAttackAnimation(animationName)
      ? attackFacingRef.current
      : player.facing;
    const heroFrame = animationFrame(
      normalizedAnimation,
      renderFacing,
      animationStartedAtRef.current,
      now,
    );
    const heroSheet = heroSheets.current[normalizedAnimation];
    const animation = HERO_ANIMATIONS[normalizedAnimation];
    const heroRect = anchoredDrawRect(
      animation,
      player.x * TILE + 16,
      player.y * TILE + 30,
    );
    drawAtlasFrame(
      context,
      heroSheet,
      heroFrame,
      heroRect.x,
      heroRect.y,
      heroRect.width,
      heroRect.height,
    );
    if (isAttackAnimation(animationName)) {
      drawAttackVfx(context, {
        attack: animationName,
        direction: renderFacing,
        frame: frameIndex(animationName, animationStartedAtRef.current, now),
        x: player.x * TILE + 16,
        y: player.y * TILE + 4,
      });
    }
    for (const effect of effectsRef.current) {
      if (effect.type === "death") {
        const frame = MONSTER_FRAMES[effect.monster]?.death;
        drawAtlasFrame(
          context,
          atlas.current,
          frame,
          effect.x * TILE - 8,
          effect.y * TILE - 18,
          52,
          52,
        );
      }
      context.fillStyle = effect.type === "damage" ? "#ff665e" : "#fff0a0";
      context.font = "bold 18px monospace";
      context.textAlign = "center";
      context.fillText(
        `-${effect.value}`,
        effect.x * TILE + 16,
        effect.y * TILE - 16,
      );
      if (effect.type === "impact") {
        context.strokeStyle = "#78d6ff";
        context.lineWidth = 4;
        context.beginPath();
        context.arc(
          effect.x * TILE + 16,
          effect.y * TILE + 12,
          18,
          0,
          Math.PI * 1.65,
        );
        context.stroke();
      }
      }
    context.restore();
    screen.fillStyle = "#07100d";
    screen.fillRect(0, 0, target.width, target.height);
    screen.drawImage(viewport, 0, 0, target.width, target.height);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [
    assetById,
    crossEdge,
    debug,
    dialogue,
    gameMapId,
    map,
    menuOpen,
    panel,
    sound,
    terrainBlocked,
  ]);

  const resetProgress = async () => {
    if (!confirm("Reiniciar todo o progresso deste personagem?")) return;
    localStorage.removeItem(SAVE_KEY);
    if (supabase && user)
      await supabase
        .from("game_saves")
        .delete()
        .eq("user_id", user.id)
        .eq("slot", "main");
    const fresh = { ...DEFAULT_HERO, quest: { ...DEFAULT_HERO.quest } };
    setHero(fresh);
    setGameMapId("village");
    setEnemies(
      Object.fromEntries(
        Object.entries(project.maps).map(([id, target]) => [
          id,
          target.objects
            .filter((object) => object.enemy)
            .map((object) => ({
              ...object,
              hp: object.enemy.hp,
              maxHp: object.enemy.hp,
              anchorX: object.x,
              anchorY: object.y,
              lastAttack: 0,
            })),
        ]),
      ),
    );
    setNotice("Novo jogo iniciado");
  };

  const equipItem = (item) => {
    if (!item || !["weapon", "armor"].includes(item.type)) return;
    setHero((current) => {
      const next = {
        ...current,
        isArmed: item.type === "weapon" ? true : current.isArmed,
        equipment: {
          ...current.equipment,
          [item.type]: item.id,
        },
      };
      heroRef.current = next;
      return next;
    });
    if (item.type === "weapon" && !isAttackAnimation(heroAnimationRef.current)) {
      const idleAnimation = movementAnimation({
        armed: true,
        equipped: true,
        moving: false,
      });
      heroAnimationRef.current = idleAnimation;
      animationStartedAtRef.current = performance.now();
      setHeroAnimation(idleAnimation);
      setAnimationStartedAt(animationStartedAtRef.current);
    }
    setNotice(`${item.name} equipado`);
    sound(680, 0.12, "triangle");
  };

  const unequipItem = (type) => {
    const item = equippedItem(heroRef.current, type);
    if (!item) return;
    setHero((current) => {
      const next = {
        ...current,
        isArmed: type === "weapon" ? false : current.isArmed,
        equipment: { ...current.equipment, [type]: null },
      };
      heroRef.current = next;
      return next;
    });
    if (type === "weapon" && !isAttackAnimation(heroAnimationRef.current)) {
      const idleAnimation = movementAnimation({
        armed: false,
        equipped: false,
        moving: false,
      });
      heroAnimationRef.current = idleAnimation;
      animationStartedAtRef.current = performance.now();
      setHeroAnimation(idleAnimation);
      setAnimationStartedAt(animationStartedAtRef.current);
    }
    setNotice(`${item.name} removido`);
  };

  const spendStat = (stat) =>
    setHero((current) =>
      current.stats.points
        ? {
            ...current,
            stats: {
              ...current.stats,
              [stat]: current.stats[stat] + 1,
              points: current.stats.points - 1,
            },
          }
        : current,
    );

  const unlockCyclone = () =>
    setHero((current) => {
      if (current.skills.cyclone || current.level < 3) return current;
      setNotice("Habilidade Corte Ciclone desbloqueada");
      return { ...current, skills: { ...current.skills, cyclone: true } };
    });

  const debugTeleport = (mapId, x, y) => {
    setGameMapId(mapId);
    setHero((current) => ({ ...current, x, y }));
    setNotice(`Debug · ${project.maps[mapId].name}`);
  };

  const debugMission = () =>
    setHero((current) => ({
      ...current,
      quest: { ...current.quest, active: true, kills: 3, complete: true },
      coins: current.coins + 40,
    }));

  const debugBoss = () => {
    const target = (enemiesRef.current.ruins || []).find(
      (enemy) => enemy.enemy?.boss,
    );
    if (!target) return;
    setEnemies((all) => ({
      ...all,
      ruins: all.ruins.filter((enemy) => enemy.uid !== target.uid),
    }));
    setHero(defeatEnemy(target, heroRef.current));
  };

  const activePartnerData = (hero.partners || []).map((id) => {
    const companion = companionsRef.current.find((item) => item.id === id);
    return { ...companion, ...CHARACTER_PROFILES[id], id };
  });

  return (
    <div className="game-shell">
      <header className="game-topbar">
        <button className="game-back" onClick={onExit}>
          <ArrowLeft size={17} /> Editor
        </button>
        <div className="game-place">
          <span>AINCRAD · ANDAR 01</span>
          <strong>{map.name}</strong>
        </div>
        <div className="game-header-tools">
          <button className={`controller-connect ${controllerConnected ? "is-active" : ""}`} onClick={() => setControllerOpen(true)} title="Conectar controle pelo celular">
            <span className="controller-connect-icon"><Gamepad2 size={18} /><i /></span>
            <span className="controller-connect-copy">
              <strong>CONTROLE</strong>
              <small>{controllerConnected ? "CONECTADO" : "CONECTAR"}</small>
            </span>
          </button>
          <button onClick={() => setMuted((value) => !value)} title="Áudio">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            className={debug ? "is-active" : ""}
            onClick={() => setDebug((value) => !value)}
            title="Modo de depuração"
          >
            <Bug size={16} />
          </button>
          <div className="game-level">
            NÍVEL <strong>{hero.level}</strong>
          </div>
        </div>
      </header>
      <main className="game-stage" onClickCapture={(event) => {
        if (event.target.closest("button")) playMenuSound("click");
      }}>
        <div className="game-canvas-wrap">
          <canvas ref={canvas} />
        </div>
        {defending && <div className="defense-state"><Shield size={16} /> DEFENDENDO</div>}
        <aside className="game-minimap" aria-label="Minimapa da região">
          <div>
            <span>{currentSector ? `SETOR ${currentSector.id}` : "REGIÃO"}</span>
            <strong>{currentSector?.name || map.name}</strong>
          </div>
          <canvas ref={minimapCanvas} width="200" height="104" />
        </aside>
        <section className="game-hud">
          <div className="party-hud">
            <div className="party-leader">
              <span className="partner-cross">+</span>
              <strong>RAFAEL</strong>
              <div className="leader-gauge">
                <SaoHpGauge value={hero.hp} max={hero.maxHp} />
                <div className="leader-values"><small>{Math.ceil(hero.hp)} / {hero.maxHp}</small><em>LV. {hero.level}</em></div>
              </div>
            </div>
            {activePartnerData.map((partner) => (
              <div className="partner-hp" key={partner.id} style={{ "--partner-color": partner.color }}>
                <span className="party-bracket">⌟</span>
                <strong>{partner.name}</strong>
                <SaoHpGauge value={partner.hp} max={partner.maxHp} compact />
                <button onClick={() => dismissPartner(partner.id)} title="Remover do grupo">×</button>
              </div>
            ))}
          </div>
          {boss && (
            <div className="boss-bar">
              <span>{boss.enemy.name || "CHEFE DO ANDAR"}</span>
              <div>
                <i style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
              </div>
              <small>{Math.ceil(boss.hp)} HP</small>
            </div>
          )}
          <div className="quest-card">
            <span>MISSÃO ATIVA</span>
            <strong>
              {hero.quest.complete
                ? "Caçada concluída"
                : hero.quest.active
                  ? "Primeira Caçada"
                  : "Fale com o Guia"}
            </strong>
            <small>
              {hero.quest.active
                ? `${Math.min(hero.quest.kills, 3)} / 3 monstros derrotados`
                : "Pressione E perto de um NPC"}
            </small>
          </div>
          <div className="inventory-card">
            <span>⚗ {hero.potions} poções</span>
            <span>◈ {hero.coins} col</span>
            <span>✦ {hero.xp} XP</span>
          </div>
        </section>
        <nav className="game-menu">
          <button
            className={menuOpen ? "is-active sao-menu-trigger" : "sao-menu-trigger"}
            onClick={toggleSaoMenu}
          >
            <Menu size={18} /> Menu SAO <kbd>P</kbd>
          </button>
          <button
            className={panel === "skills" ? "is-active" : ""}
            onClick={() => setPanel(panel === "skills" ? null : "skills")}
          >
            <GitBranch size={17} /> Habilidades
          </button>
        </nav>
        <div className="game-actions">
          <button onClick={toggleWeapon}>
            <Sword size={20} />
            <kbd>Q</kbd>
            <span>{hero.isArmed ? "Guardar" : "Sacar"}</span>
          </button>
          <button onClick={() => attack(false)}>
            <Sword size={20} />
            <kbd>J</kbd>
            <span>Atacar</span>
          </button>
          <button
            onClick={() => attack(true)}
            className={skillCooldown > Date.now() ? "cooldown" : ""}
          >
            <Sparkles size={20} />
            <kbd>K</kbd>
            <span>Vorpal Arc</span>
          </button>
          <button onClick={usePotion}>
            <Heart size={20} />
            <kbd>H</kbd>
            <span>Poção</span>
          </button>
          <button onClick={interact}>
            <Shield size={20} />
            <kbd>E</kbd>
            <span>Interagir</span>
          </button>
        </div>
        <div className="game-help">
          WASD / setas para mover · J atacar · K habilidade · E conversar · T parceria
        </div>
        {!!loot.length && (
          <div className="loot-feed">
            {loot.slice(-3).map((item) => (
              <div
                key={item.id}
                className={`rarity-${item.rarity.toLowerCase()}`}
              >
                <span>LOOT</span>
                <strong>{item.name}</strong>
                <small>{item.rarity}</small>
              </div>
            ))}
          </div>
        )}
        {panel === "inventory" && (
          <div className="game-panel inventory-panel">
            <header>
              <div>
                <span>MENU</span>
                <strong>Inventário e Equipamentos</strong>
              </div>
              <button onClick={() => setPanel(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="equipment-slots">
              <div>
                <Sword size={18} />
                <span>ARMA</span>
                <strong>{equippedWeapon?.name || "Nenhuma"}</strong>
                {equippedWeapon && (
                  <button onClick={() => unequipItem("weapon")}>Remover</button>
                )}
              </div>
              <div>
                <Shield size={18} />
                <span>ARMADURA</span>
                <strong>{equippedArmor?.name || "Nenhuma"}</strong>
                {equippedArmor && (
                  <button onClick={() => unequipItem("armor")}>Remover</button>
                )}
              </div>
            </div>
            <div className="item-list">
              {hero.inventory.map((item) => (
                <button
                  className={
                    hero.equipment[item.type] === item.id ? "is-equipped" : ""
                  }
                  key={item.id}
                  onClick={() => equipItem(item)}
                >
                  <span
                    className={`item-gem rarity-${item.rarity.toLowerCase()}`}
                  />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.type} · {item.rarity}
                      {item.attack ? ` · +${item.attack} ATQ` : ""}
                      {item.defense ? ` · +${item.defense} DEF` : ""}
                    </small>
                  </span>
                  {["weapon", "armor"].includes(item.type) && (
                    <i>
                      {hero.equipment[item.type] === item.id
                        ? "Equipado"
                        : "Equipar"}
                    </i>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {menuOpen && (
          <div className={`sao-menu-panel ${menuClosing ? "is-closing" : "is-opening"}`}>
            <button className="sao-close" onClick={toggleSaoMenu}><X size={16} /></button>
            {activeCategory === "character" && <aside className="sao-profile-card">
              <strong>RAFAEL</strong>
              <div className="profile-divider" />
              <div className="profile-wheel">
                {Array.from({ length: 10 }, (_, index) => <i key={index} style={{ "--i": index }} className={index === 7 ? "active" : ""} />)}
                <img className="player-profile-avatar" src="/sprites/player/frames/idle-down.png" alt="Avatar de Rafael" />
              </div>
              <div className="profile-description">
                <b>⚔ Espadachim</b>
                <span>Nível {hero.level} · {hero.stats.attack} ATQ</span>
                <span>{equippedWeapon?.name || "Sem arma equipada"}</span>
                <span>{Math.ceil(hero.hp)} / {hero.maxHp} HP</span>
              </div>
            </aside>}
            <nav className="sao-root-nav" aria-label="Menu principal">
              {[
                ["character", User, "Personagem"],
                ["party", Users, "Grupo"],
                ["messages", MessageSquare, "Mensagens"],
                ["location", MapPin, "Localização"],
                ["settings", Settings, "Configurações"],
              ].map(([id, Icon, label]) => (
                <button key={id} title={label} style={{ "--order": id === "settings" ? 0 : id === "location" ? 1 : id === "messages" ? 2 : id === "party" ? 3 : 4, "--close-order": id === "character" ? 0 : id === "party" ? 1 : id === "messages" ? 2 : id === "location" ? 3 : 4 }} className={activeCategory === id ? "active" : ""} onClick={() => { setActiveCategory(id); setActiveSubcategory(id === "character" ? "items" : null); setMenuColumn(id === "character" ? "category" : "root"); setActiveDetailIndex(0); }}>
                  <Icon size={25} fill="currentColor" />
                </button>
              ))}
            </nav>
            {activeCategory && <nav className="sao-category-nav" aria-label="Categorias">
              {activeCategory === "character" ? [
                ["items", Backpack, "Items"],
                ["skills", GitBranch, "Skills"],
                ["equipment", Shield, "Equipment"],
              ].map(([id, Icon, label]) => (
                <button key={id} className={activeSubcategory === id ? "active" : ""} onClick={() => { setActiveSubcategory(id); setMenuColumn("category"); setActiveDetailIndex(0); }}>
                  <Icon size={19} fill="currentColor" /><b>{label}</b>
                </button>
              )) : activeCategory ? <>
                <button className="active">
                  {activeCategory === "party" ? <Users size={19} fill="currentColor" /> : activeCategory === "messages" ? <MessageSquare size={19} fill="currentColor" /> : activeCategory === "location" ? <MapPin size={19} fill="currentColor" /> : <Settings size={19} fill="currentColor" />}
                  <b>{activeCategory === "party" ? "Party" : activeCategory === "messages" ? "Messages" : activeCategory === "location" ? "Map" : "Settings"}</b>
                </button>
              </> : null}
            </nav>}
            {(activeCategory !== "character" || activeSubcategory) && activeCategory && <section className="sao-secondary-panel">
              {activeCategory === "character" && activeSubcategory === "skills" && <>
                <button className={activeDetailIndex === 0 ? "active" : ""} onClick={() => setActiveDetailIndex(0)}><Sword size={17} /><span><b>Tracking</b><small>Rastrear inimigos próximos</small></span></button>
                <button className={activeDetailIndex === 1 ? "active" : ""} onClick={() => setActiveDetailIndex(1)}><Sword size={17} /><span><b>One-Handed Sword</b><small>Maestria com espada</small></span></button>
                <button className={activeDetailIndex === 2 ? "active" : ""} onClick={() => setActiveDetailIndex(2)}><Sword size={17} /><span><b>Dual Blades</b><small>Estilo de duas lâminas</small></span></button>
                <button className={activeDetailIndex === 3 ? "active" : ""} onClick={() => setActiveDetailIndex(3)}><Shield size={17} /><span><b>Weapon Defense</b><small>Bloqueio e aparo</small></span></button>
              </>}
              {activeCategory === "character" && activeSubcategory === "items" && <>
                {hero.inventory.slice(0, 4).map((item, index) => <button className={activeDetailIndex === index ? "active" : ""} onClick={() => setActiveDetailIndex(index)} key={item.id}><Backpack size={17} /><span><b>{item.name}</b><small>{item.rarity}</small></span></button>)}
              </>}
              {activeCategory === "character" && activeSubcategory === "equipment" && <>
                <button className={activeDetailIndex === 0 ? "active" : ""} onClick={() => setPanel("inventory")}><Sword size={17} /><span><b>{equippedWeapon?.name || "Arma"}</b><small>Slot de arma</small></span></button>
                <button className={activeDetailIndex === 1 ? "active" : ""} onClick={() => setPanel("inventory")}><Shield size={17} /><span><b>{equippedArmor?.name || "Armadura"}</b><small>Slot de armadura</small></span></button>
              </>}
              {activeCategory === "party" && <>
                {activePartnerData.map((partner, index) => <button className={index === 0 ? "active" : ""} key={partner.id}><Users size={17} /><span><b>{partner.name}</b><small>{friendshipLabel(hero.friendships[partner.id])}</small></span></button>)}
                {!activePartnerData.length && <p>Aproxime-se de um herói e pressione E ou T.</p>}
              </>}
              {activeCategory === "messages" && <p>Converse com os heróis para aumentar a amizade e desbloquear novas falas.</p>}
              {activeCategory === "location" && <p>{currentSector?.name || map.name}<br />Aincrad · Andar 01</p>}
              {activeCategory === "settings" && <button className="active" onClick={() => setMuted((value) => !value)}><Settings size={17} /><span><b>Áudio</b><small>{muted ? "Desativado" : "Ativado"}</small></span></button>}
            </section>}
          </div>
        )}
        {panel === "skills" && (
          <div className="game-panel skill-panel">
            <header>
              <div>
                <span>PROGRESSÃO</span>
                <strong>Atributos e Habilidades</strong>
              </div>
              <button onClick={() => setPanel(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="stat-grid">
              {[
                ["attack", "Ataque"],
                ["defense", "Defesa"],
                ["agility", "Agilidade"],
              ].map(([key, label]) => (
                <button key={key} onClick={() => spendStat(key)}>
                  <span>{label}</span>
                  <strong>{hero.stats[key]}</strong>
                  <i>+</i>
                </button>
              ))}
            </div>
            <small className="points-left">
              Pontos disponíveis: {hero.stats.points}
            </small>
            <div className="skill-tree">
              <div className="skill-node unlocked">
                <Sparkles size={20} />
                <strong>Vorpal Arc</strong>
                <small>Ataque direcional</small>
              </div>
              <span>→</span>
              <button
                className={`skill-node ${hero.skills.cyclone ? "unlocked" : ""}`}
                onClick={unlockCyclone}
              >
                <Sword size={20} />
                <strong>Corte Ciclone</strong>
                <small>
                  {hero.skills.cyclone ? "Desbloqueado" : "Requer nível 3"}
                </small>
              </button>
            </div>
          </div>
        )}
        {debug && (
          <aside className="debug-panel">
            <header>
              <Bug size={15} /> SPRITES / DEBUG
            </header>
            <SpriteFramePreview
              image={heroSheets.current[debugAnimation]}
              animationName={debugAnimation}
              direction={debugDirection}
              index={debugFrame}
            />
            <label>
              Animação
              <select
                value={debugAnimation}
                onChange={(event) => {
                  setDebugAnimation(event.target.value);
                  setDebugFrame(0);
                }}
              >
                {Object.keys(HERO_ANIMATIONS).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <div className="debug-directions">
              {DIRECTIONS.map((direction) => (
                <button
                  className={debugDirection === direction ? "is-active" : ""}
                  key={direction}
                  onClick={() => setDebugDirection(direction)}
                >
                  {direction}
                </button>
              ))}
            </div>
            <div className="debug-frames">
              {Array.from({ length: HERO_ANIMATIONS[debugAnimation].frames }, (_, index) => (
                <button
                  className={debugFrame === index ? "is-active" : ""}
                  key={index}
                  onClick={() => {
                    setDebugPlaying(false);
                    setDebugFrame(index);
                  }}
                >
                  {index + 1}
                </button>
              ))}
              <button onClick={() => setDebugPlaying((playing) => !playing)}>
                {debugPlaying ? "Pausar" : "Play"}
              </button>
            </div>
            <button
              onClick={() => {
                const animation = HERO_ANIMATIONS[debugAnimation];
                setHeroAnimation(debugAnimation);
                setAttackFacing(debugDirection);
                setHero((current) => ({ ...current, facing: debugDirection }));
                setAnimationStartedAt(performance.now());
                if (!animation.loop) {
                  const sequence = ++attackSequence.current;
                  setTimeout(() => {
                    if (attackSequence.current !== sequence) return;
                    const idleAnimation = movementAnimation({
                      armed: heroRef.current.isArmed,
                      equipped: Boolean(equippedItem(heroRef.current, "weapon")),
                      moving: false,
                    });
                    heroAnimationRef.current = idleAnimation;
                    setHeroAnimation(idleAnimation);
                    setAnimationStartedAt(performance.now());
                  }, animation.duration);
                }
              }}
            >
              Testar transição no jogo
            </button>
            <hr />
            <button onClick={() => debugTeleport("village", 17, 16)}>
              NPC da missão
            </button>
            <button onClick={() => debugTeleport("fields", 13, 8)}>
              Campos / Slime
            </button>
            <button onClick={() => debugTeleport("ruins", 23, 11)}>
              Arena do chefe
            </button>
            <button onClick={debugMission}>Concluir missão</button>
            <button onClick={debugBoss}>Derrotar chefe</button>
            <button
              onClick={() => setHero((current) => ({ ...current, hp: 1 }))}
            >
              HP crítico
            </button>
            <small>
              Mapa: {gameMapId}
              <br />
              Posição: {hero.x.toFixed(1)}, {hero.y.toFixed(1)}
              <br />
              Inimigos: {currentEnemies.length}
              <br />
              Frame: {HERO_ANIMATIONS[debugAnimation].frame.width}×
              {HERO_ANIMATIONS[debugAnimation].frame.height} · render: {HERO_ANIMATIONS[debugAnimation].render.width}×
              {HERO_ANIMATIONS[debugAnimation].render.height}
              <br />
              Âncora dos pés: 50%, 95%
            </small>
          </aside>
        )}
        {notice && <div className="game-notice">{notice}</div>}
        {dialogue && (
          <div className="dialogue-panel" role="dialog" aria-label={`Conversa com ${dialogue.name}`}>
            <span className="dialogue-name">{dialogue.name}</span>
            <p>{typedText}<i className="type-cursor" /></p>
            {dialogue.characterId && <small>{friendshipLabel(dialogue.friendship)} · amizade {dialogue.friendship}</small>}
            {dialogue.choosing ? (
              <div className="dialogue-choices">
                <button onClick={() => answerPartnership(true)}>Sim, vamos juntos.</button>
                <button onClick={() => answerPartnership(false)}>Agora não.</button>
              </div>
            ) : (
              <button className="dialogue-next" onClick={advanceDialogue} aria-label="Avançar diálogo">▼</button>
            )}
          </div>
        )}
        {controllerOpen && (
          <div className="controller-pairing-backdrop" onClick={() => setControllerOpen(false)}>
            <section className="controller-pairing" onClick={(event) => event.stopPropagation()}>
              <button className="controller-pairing-close" onClick={() => setControllerOpen(false)} aria-label="Fechar">×</button>
              <span>CONTROLE REMOTO</span>
              <h2>Escaneie com o celular</h2>
              {controllerQr && <img src={controllerQr} alt="QR Code para abrir o controle" />}
              <strong className={controllerConnected ? "connected" : ""}>
                {controllerConnected ? "● Controle conectado" : "○ Aguardando conexão"}
              </strong>
              <small>Abra o jogo pelo endereço de rede deste computador para o QR funcionar no celular.</small>
            </section>
          </div>
        )}
        {hero.hp <= 0 && (
          <div className="game-over">
            <strong>YOU ARE DEAD</strong>
            <span>Pressione R para retornar à Cidade Inicial</span>
          </div>
        )}
      </main>
      <footer className="game-footer">
        <span>{cloudState}</span>
        <button onClick={resetProgress}>Reiniciar progresso</button>
      </footer>
    </div>
  );
}
