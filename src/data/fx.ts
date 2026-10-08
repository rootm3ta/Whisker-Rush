/** Crash dust cloud and dizzy stars. */
export const DUST = {
  puffs: 9,
  puffRadius: [0.45, 0.8] as const,
  spread: 1.1,
  churnHz: 7,
  stars: 5,
  starSize: 0.22,
  colors: [0xfbf6ec, 0xeadfcb, 0xd9cbb3] as const,
  starColor: 0xf5c542,
  limbColor: 0x2a201c,
} as const;

export const DIZZY = {
  stars: 3,
  radius: 0.55,
  height: 1.55,
  spinHz: 1.1,
} as const;

export const REVIVE_BURST = {
  sec: 0.7,
  maxRadius: 3.2,
  color: 0x9fe08a,
} as const;
