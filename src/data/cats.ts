/** Playable cats (GAME_DESIGN 6.4). Coats are generated procedurally. */
export type CatId = 'miso' | 'biscuit' | 'noir' | 'sushi' | 'mittens' | 'pixel';

export type CoatPattern = 'calico' | 'tabby' | 'solid' | 'points' | 'fluffy' | 'sphynx';

export interface CatSkin {
  name: string;
  pattern: CoatPattern;
  base: number;
  /** Patch/stripe/point color. */
  mark: number;
  /** Second patch color (calico). */
  mark2: number;
  legs: number;
  tail: number;
  tailTip: number;
  innerEar: number;
  eye: number;
  /** Mittens wears glasses, Pixel wears a sweater. */
  extra?: 'glasses' | 'sweater';
  sweater?: number;
  scale: number;
  unlock: { coins?: number; fishBones?: number; set?: string; pass?: number; default?: true };
  passive: string;
}

export const CATS: Record<CatId, CatSkin> = {
  miso: {
    name: 'Miso', pattern: 'calico', base: 0xfaf3e6, mark: 0xe8863a, mark2: 0x2e2a2b, legs: 0xfaf3e6, tail: 0xe8863a, tailTip: 0x2e2a2b,
    innerEar: 0xf2a6a8, eye: 0x2a2320, scale: 1.6, unlock: { default: true }, passive: 'None',
  },
  biscuit: {
    name: 'Biscuit', pattern: 'tabby', base: 0xf0a24e, mark: 0xc4682a, mark2: 0xc4682a, legs: 0xf6c38a, tail: 0xf0a24e, tailTip: 0xc4682a,
    innerEar: 0xf2a6a8, eye: 0x3a5a2a, scale: 1.6, unlock: { coins: 5000 }, passive: '+5% coin value',
  },
  noir: {
    name: 'Noir', pattern: 'solid', base: 0x2b2830, mark: 0x2b2830, mark2: 0x2b2830, legs: 0x2b2830, tail: 0x2b2830, tailTip: 0x2b2830,
    innerEar: 0x7a5a66, eye: 0xf2c14e, scale: 1.6, unlock: { coins: 10000 }, passive: 'Cat doors appear 2x',
  },
  sushi: {
    name: 'Sushi', pattern: 'points', base: 0xf3e6cf, mark: 0x5a4436, mark2: 0x5a4436, legs: 0x6b5242, tail: 0x5a4436, tailTip: 0x3a2a22,
    innerEar: 0xc9a0a0, eye: 0x4a8fe0, scale: 1.6, unlock: { fishBones: 15 }, passive: 'Longer Nap Time',
  },
  mittens: {
    name: 'Professor Mittens', pattern: 'fluffy', base: 0xa7a9ae, mark: 0x8a8c92, mark2: 0xd8d9dc, legs: 0xd8d9dc, tail: 0xa7a9ae, tailTip: 0xd8d9dc,
    innerEar: 0xe0b0b0, eye: 0x2a2320, extra: 'glasses', scale: 1.7, unlock: { set: 'fancyThings' }, passive: '+15% loot sell price',
  },
  pixel: {
    name: 'Pixel', pattern: 'sphynx', base: 0xf0c4b4, mark: 0xe0a898, mark2: 0xe0a898, legs: 0xf0c4b4, tail: 0xf0c4b4, tailTip: 0xe0a898,
    innerEar: 0xe08f8f, eye: 0x6fb38a, extra: 'sweater', sweater: 0x4a8fe0, scale: 1.55, unlock: { pass: 30 }, passive: 'Start with a Milk Bubble',
  },
};

export const CAT_IDS = Object.keys(CATS) as CatId[];

export const CAT_PASSIVES = {
  biscuitCoinMul: 1.05,
  noirCatDoorMul: 2,
  sushiNapBonusSec: 1,
  mittensSellMul: 1.15,
} as const;
