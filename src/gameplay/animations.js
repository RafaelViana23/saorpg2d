export const DIRECTIONS = ["down", "up", "left", "right"];
export const DIRECTION_ROW = Object.fromEntries(
  DIRECTIONS.map((direction, index) => [direction, index]),
);

const movement = (basePath, name, fps, overrides = {}) => ({
  src: `${basePath}/${name}.png`,
  frame: { width: 128, height: 128 },
  render: { width: 96, height: 96 },
  feet: { x: 0.5, y: 0.95 },
  frames: 3,
  startFrame: 0,
  fps,
  loop: true,
  includesWeapon: true,
  ...overrides,
});

const attack = (basePath, name, fps, duration) => ({
  src: `${basePath}/${name}.png`,
  frame: { width: 128, height: 128 },
  // All player sheets use the same 128 -> 96 rule. The body occupies roughly
  // 32x48 world pixels (1x1.5 tiles); weapons may extend outside that body box.
  render: { width: 96, height: 96 },
  feet: { x: 0.5, y: 0.95 },
  frames: 4,
  fps,
  loop: false,
  duration,
  includesWeapon: true,
});

export const createHeroAnimations = (basePath = "/sprites/player") => ({
  "idle-unarmed": movement(basePath, "idle-unarmed", 1, {
    frames: 1,
    loop: false,
    includesWeapon: false,
  }),
  "walk-unarmed": movement(basePath, "walk-unarmed", 8, {
    includesWeapon: false,
  }),
  "run-unarmed": movement(basePath, "run-unarmed", 12, {
    includesWeapon: false,
  }),
  "idle-sheathed": movement(basePath, "idle-sheathed", 1, {
    frames: 1,
    loop: false,
  }),
  "walk-sheathed": movement(basePath, "walk-sheathed", 8),
  "run-sheathed": movement(basePath, "run-sheathed", 12),
  "idle-armed": movement(basePath, "idle-armed", 1, {
    frames: 1,
    loop: false,
  }),
  "walk-armed": movement(basePath, "walk-armed", 8),
  "run-armed": movement(basePath, "run-armed", 12),
  "attack-1": attack(basePath, "attack-1", 12, 330),
  "attack-2": attack(basePath, "attack-2", 10, 480),
  "vorpal-arc": attack(basePath, "vorpal-arc", 14, 650),
});

export const HERO_ANIMATIONS = createHeroAnimations();

export function frameIndex(name, startedAt, now = performance.now(), animations = HERO_ANIMATIONS) {
  const animation = animations[name] || animations["idle-armed"];
  const elapsed = Math.max(0, now - startedAt);
  const raw = Math.floor((elapsed * animation.fps) / 1000);
  const localFrame = animation.loop
    ? raw % animation.frames
    : Math.min(animation.frames - 1, raw);
  return (animation.startFrame || 0) + localFrame;
}

export function animationFrame(
  name,
  direction,
  startedAt,
  now = performance.now(),
  animations = HERO_ANIMATIONS,
) {
  const animation = animations[name] || animations["idle-armed"];
  const column = frameIndex(name, startedAt, now, animations);
  const row = DIRECTION_ROW[direction] ?? 0;
  return {
    x: column * animation.frame.width,
    y: row * animation.frame.height,
    width: animation.frame.width,
    height: animation.frame.height,
    index: column,
  };
}

export function anchoredDrawRect(animation, footX, footY) {
  return {
    x: footX - animation.render.width * animation.feet.x,
    y: footY - animation.render.height * animation.feet.y,
    width: animation.render.width,
    height: animation.render.height,
  };
}

export const isAttackAnimation = (name) => name.startsWith("attack-") || name === "vorpal-arc";

export function movementAnimation({ armed, equipped = false, moving, running = false }) {
  const stance = armed ? "armed" : equipped ? "sheathed" : "unarmed";
  if (!moving) return `idle-${stance}`;
  return `${running ? "run" : "walk"}-${stance}`;
}
