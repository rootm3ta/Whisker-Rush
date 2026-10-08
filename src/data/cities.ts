/** One palette per city. Colors are hex numbers. */
export interface CityPalette {
  skyTop: number;
  skyHorizon: number;
  fog: number;
  sun: number;
  hemiSky: number;
  hemiGround: number;
  road: number;
  stripe: number;
  curb: number;
  sidewalk: number;
  lawn: number;
  houseBodies: readonly number[];
  roofs: readonly number[];
  doors: readonly number[];
  window: number;
  fence: number;
  trunk: number;
  leaves: readonly number[];
  bushes: readonly number[];
  lampPost: number;
  lampHead: number;
}

export interface CityDef {
  name: string;
  palette: CityPalette;
  zones: readonly string[];
}

export const CITIES = {
  mapleLane: {
    name: 'Maple Lane',
    zones: ['Suburbs', 'Market Street', 'Park', 'Old Town', 'Riverside'],
    palette: {
      skyTop: 0x86bde6,
      skyHorizon: 0xffd6a0,
      fog: 0xffd6a0,
      sun: 0xffe2b8,
      hemiSky: 0xfff1dc,
      hemiGround: 0x9aaed4,
      road: 0x6e6a73,
      stripe: 0xf6e7c1,
      curb: 0xe2dac8,
      sidewalk: 0xcdc3ae,
      lawn: 0x9cc46b,
      houseBodies: [0x9fdcc4, 0xbfe8d6, 0xf3e6c9, 0xf6c9a8, 0x8ccfbf],
      roofs: [0x8a4b3a, 0x5b4a5e, 0xa9573f, 0x4f5d6b],
      doors: [0x7a4a33, 0x3f6f8a, 0xc8553d],
      window: 0xffe3a1,
      fence: 0xfaf4e6,
      trunk: 0x6b4a35,
      leaves: [0xe9813a, 0xd9562e, 0xf2b33d, 0xe9813a, 0x8fb35a],
      bushes: [0x6f9e4f, 0x86b25a, 0x5f8f48],
      lampPost: 0x3b4a45,
      lampHead: 0xffe9b0,
    },
  },
} satisfies Record<string, CityDef>;

export const FOG = { near: 30, far: 140 } as const;
