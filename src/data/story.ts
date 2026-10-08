/** Intro comic (GAME_DESIGN 2.1) and splash (8.1). Times in seconds. */
export const SPLASH = { sec: 1.5 } as const;

export const COMIC = {
  /** Panel i starts at starts[i]; the smash cut happens at `end`. */
  starts: [0, 8.3, 16.6] as const,
  end: 24.6,
  skipAfter: 3,
  borderDrawSec: 0.6,
  flashSec: 0.35,
  /** Ink line strength, line jitter boil rate (fps) and posterize levels. */
  ink: { depth: 9, color: 2.2, threshold: [0.12, 0.38] as const, boilFps: 8, wobble: 1.2, levels: 5 },
  paper: 0xf4ead6,
  inkColor: 0x2a201c,
  panels: [
    { title: 'Sunday.', caption: "Ada said she'd be back soon. Ada always says that." },
    { title: 'The Sausage.', caption: 'One perfect sausage. Reserved, apparently.' },
    { title: 'Run.', caption: "Nine lives. Let's not waste any." },
  ],
  whistle: 'FWEEEET!',
  tag: 'RESERVED: DUKE',
} as const;

export const ADA = {
  skin: 0xf0c4a8,
  hair: 0x5a3a2a,
  sweater: 0x6fa38a,
  pants: 0x3f4a6a,
  suitcase: 0xd9562e,
} as const;

export const STORY_COLORS = {
  houseWall: 0x9fc0e0,
  sill: 0xfbf6ec,
  table: 0x8d5f38,
  postcard: 0xf3e6c9,
  shopWall: 0xf3e2c4,
  awning: 0xd9483b,
  window: 0xf3e2c4,
  hook: 0xf2c14e,
  sausage: 0xb5513a,
  street: 0x6e6a73,
  door: 0x7a4a33,
  fence: 0xfaf4e6,
  sky: 0xffd6a0,
} as const;
