export const ATTACKS = {
  "attack-1": { damage: 1, duration: 330, cooldown: 380, range: 38, activeFrame: 2, fps: 12 },
  "attack-2": { damage: 1.6, duration: 480, cooldown: 750, range: 44, activeFrame: 2, fps: 10 },
  "vorpal-arc": { damage: 2.8, duration: 650, cooldown: 4500, range: 70, sp: 25, activeFrame: 2, fps: 14 },
};

export const attackImpactDelay = (attackName) => {
  const attack = ATTACKS[attackName];
  return attack ? (attack.activeFrame * 1000) / attack.fps : 0;
};

export function attackDamage(baseDamage, attackName) {
  return Math.round(baseDamage * (ATTACKS[attackName]?.damage || 1));
}
