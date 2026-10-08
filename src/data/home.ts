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
} as const;
