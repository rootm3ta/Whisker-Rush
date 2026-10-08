/** UI copy. */
export const UI_TEXT = {
  title: 'Whisker Rush',
  homeHint: 'Swipe or tap to run',
  pausedTitle: 'Paused',
  pausedHint: 'Tap to keep running',
  keysHint: 'Arrows / WASD to move, P to pause',
  crashTitle: 'Bonk!',
  caughtTitle: 'Caught!',
  crashHint: 'Tap to run again',
  nearMiss: 'NEAR MISS',
  stumble: 'OOF!',
  satchelFull: 'SATCHEL FULL',
  fishBone: 'FISH BONE!',
} as const;

/** HUD stamp colors (ink on paper). */
export const STAMP_COLORS = {
  nearMiss: '#d9562e',
  stunt: '#3f6f8a',
  warn: '#8a4b3a',
  loot: '#5b4a5e',
} as const;

export const HUD = {
  stampMs: 900,
} as const;
