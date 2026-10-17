export const HERO_COLLISION = { width: 20, height: 14, offsetY: -7 };

export function isInDirectionalRange(player, target, facing, rangePx, tileSize) {
  const dx = (target.x - player.x) * tileSize;
  const dy = (target.y - player.y) * tileSize;
  const distance = Math.hypot(dx, dy);
  const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const [fx, fy] = vectors[facing] || vectors.down;
  return distance <= rangePx && dx * fx + dy * fy >= -5;
}
