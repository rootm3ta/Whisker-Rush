/** One palette per city. Colors are hex numbers. */
export interface CityPalette {
  skyTop: number;
  skyHorizon: number;
  fog: number;
  ground: number;
  lane: number;
  props: number[];
  sun: number;
  ambient: number;
}

export const CITIES: Record<string, { name: string; palette: CityPalette }> = {
  mapleLane: {
    name: 'Maple Lane',
    palette: {
      skyTop: 0x7fb7e6,
      skyHorizon: 0xffd9a8,
      fog: 0xffd9a8,
      ground: 0x8a8f99,
      lane: 0xf3ead8,
      props: [0xe0754f, 0x6fa36b, 0xf2c14e, 0x5b7fa6],
      sun: 0xfff1d6,
      ambient: 0xbcc8e8,
    },
  },
};

export const FOG = { near: 40, far: 200 } as const;
