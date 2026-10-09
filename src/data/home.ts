/** Diegetic Home room layout (GAME_DESIGN 6.1). Units are metres; camera looks toward -z. */
export type HomeAction = 'run' | 'wardrobe' | 'upgrades' | 'market' | 'map' | 'calendar' | 'missions';

export const HOME = {
  camera: { fov: 54, pos: [0, 2.7, 8.4] as const, look: [0, 1.15, -0.8] as const, driftX: 0.2, driftHz: 0.05 },
  /** Wardrobe preview framing (close on Miso, she sits in the top half). */
  preview: { pos: [0, 1.25, 2.3] as const, look: [0, 0.4, -1.2] as const },
  /** Miso is drawn smaller in the room than on the street. */
  misoScale: 0.62,
  layout: {
    door: [-1.55, -2.85] as const,
    map: [-0.85, 3.25] as const,
    closet: [1.55, -2.45] as const,
    fridge: [-1.3, 0.75] as const,
    post: [1.3, 0.75] as const,
    lamp: [-1.0, -2.2] as const,
  },
  colors: {
    wall: 0xf3e2c4,
    wallTrim: 0xd9b98a,
    floor: 0xc08a5a,
    rug: 0xd9562e,
    couch: 0x6fa38a,
    cushion: 0x86b8a0,
    table: 0x8d5f38,
    mug: 0xfbf6ec,
    notebook: 0x3f6f8a,
    closet: 0xb07a4a,
    door: 0x7a4a33,
    knob: 0xf2c14e,
    fridge: 0xf6f6f2,
    calendar: 0xfbf6ec,
    calendarRed: 0xd9562e,
    post: 0xe0c9a0,
    postRope: 0xc8a46e,
    map: 0xe8d4b8,
    mapInk: 0x6fa38a,
    windowFrame: 0xfbf6ec,
    lamp: 0xffe2a8,
  },
  sunColor: 0xffc98a,
  ambient: 0xfff1dc,
  misoSeat: [0, 0.62, -1.15] as const,
  labels: {
    run: 'Run',
    wardrobe: 'Wardrobe',
    upgrades: 'Scratching Post',
    market: "Old Tom's",
    map: 'World Tour',
    calendar: 'Daily',
    missions: 'Missions',
  } as Record<HomeAction, string>,
  reactions: ['purrr...', 'mrrp!', '*stretch*', 'oops.'] as const,
  /** Hotspot label order = placement priority. Miso on the couch is the Missions hotspot. */
  hotspotOrder: ['run', 'market', 'wardrobe', 'map', 'calendar', 'upgrades', 'missions'] as readonly HomeAction[],
  hotspot: {
    /** Halo breathing (Hz), base and "something new" strengths, flash on press. */
    pulseHz: 0.6,
    calm: 0.5,
    attention: 0.9,
    flash: 1.6,
    color: 0xffd98a,
    /** Halo sprite size (m) per hotspot; placed just behind the object so it reads as a rim. */
    halo: { run: 2.6, market: 2.5, wardrobe: 2.9, map: 1.4, calendar: 1.5, upgrades: 2.2, missions: 1.3 } as Record<HomeAction, number>,
    /** Sparkles: a few every couple of seconds, spread over the hotspots. */
    sparkleEverySec: 0.7,
    sparkleLife: 1.6,
    bounceSec: 0.32,
    /** Label: gap above the object (px), minimum tap size (pt). */
    lead: 16,
    minTap: 56,
  },
  /** First-visit tour: three spotlights, tap to advance, skippable. */
  tour: [
    { action: 'run', text: 'Tap the big paw (or the front door) to start a run.' },
    { action: 'market', text: "Old Tom's Market is out the window. Sell the loot you grab on runs." },
    { action: 'wardrobe', text: 'Your closet: cats, hats and trails. There is a free hat inside.' },
  ] as readonly { action: HomeAction; text: string }[],
  multTip: 'Score multiplier. Complete mission sets to raise it.',
} as const;

export type TimeOfDay = 'morning' | 'golden' | 'dusk' | 'night';

/** The living window (2.5D street scene behind a hole in the back wall). */
export const WINDOW = {
  /** Opening in the back wall, world space (matches the frame group). */
  hole: { x: 0.25, y: 2.2, w: 1.87, h: 1.275 },
  /** Local hours where each period starts. */
  hours: { morning: 5, golden: 12, dusk: 18, night: 21 },
  times: {
    morning: { skyTop: 0x8fc9ee, skyBottom: 0xf6e6c8, sun: 0xfff1d6, sunI: 2.4, amb: 0xfff6e8, ambI: 1.15, lamp: 0x000000, windows: 0x9cb6c4, stars: 0 },
    golden: { skyTop: 0xf2b36b, skyBottom: 0xffe2a8, sun: 0xffc98a, sunI: 2.4, amb: 0xfff1dc, ambI: 1.1, lamp: 0x000000, windows: 0xa8b4bc, stars: 0 },
    dusk: { skyTop: 0x5b4a8a, skyBottom: 0xf08a5d, sun: 0xff9a6a, sunI: 1.5, amb: 0xe8c8d8, ambI: 0.9, lamp: 0xffd27a, windows: 0xffd27a, stars: 0.3 },
    night: { skyTop: 0x141a3a, skyBottom: 0x3a3f6e, sun: 0x9fb4ff, sunI: 0.6, amb: 0x8f9ad0, ambI: 0.7, lamp: 0xffd27a, windows: 0xffc65a, stars: 1 },
  } as Record<TimeOfDay, { skyTop: number; skyBottom: number; sun: number; sunI: number; amb: number; ambI: number; lamp: number; windows: number; stars: number }>,
  /** Ambient events: one every min..max seconds, first soon after arriving. */
  eventEvery: [6, 12] as const,
  firstEventSec: 3,
  /** Weights; Duke is about 1 in 15. */
  events: { birds: 3, mail: 2, walker: 2, butterfly: 2, bike: 2, leaves: 2, duke: 1 } as Record<WindowEvent, number>,
  /** Miso's windowsill seat (world) and how long she stays after an event. */
  sill: [-0.35, 1.6, -2.72] as const,
  hopSec: 0.45,
  stayAfterSec: 2.5,
  colors: {
    houses: [0xe8b4a0, 0xa8c8b8, 0xf0d890, 0xb8b0d8],
    roof: 0x7a4a3a,
    trim: 0xfbf6ec,
    fence: 0xfbf6ec,
    sidewalk: 0xc9c2b4,
    street: 0x6d6a72,
    grass: 0x8fbf6a,
    trunk: 0x7a5232,
    leaves: 0x5f9a4f,
    lampPost: 0x3b4a45,
    cloud: 0xffffff,
    cart: 0xd9562e,
  },
} as const;

export type WindowEvent = 'birds' | 'mail' | 'walker' | 'butterfly' | 'bike' | 'leaves' | 'duke';

export function timeOfDay(hour: number): TimeOfDay {
  const H = WINDOW.hours;
  if (hour >= H.night || hour < H.morning) return 'night';
  if (hour >= H.dusk) return 'dusk';
  if (hour >= H.golden) return 'golden';
  return 'morning';
}
