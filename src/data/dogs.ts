import { MAPLE_LANE } from './city/mapleLane';
import { ROME } from './city/rome';
import { TOKYO } from './city/tokyo';
/** Body plan used by the smooth procedural builder. */
export type DogBuild = 'bulldog' | 'dachshund' | 'terrier' | 'greyhound' | 'spinone' | 'shiba' | 'akita' | 'shepherd' | 'street';

/** Procedural dog definitions. Model faces -z, units before `scale`. */
export interface DogDef {
  name: string;
  build: DogBuild;
  /** Breed label for UI. */
  breed?: string;
  /** Lighter underside and cheeks (Shiba urajiro, Akita). */
  underside?: number;
  /** Chase personality: Shibas feint side to side, Akitas shove harder when they lunge. */
  style?: 'feint' | 'push';
  scale: number;
  body: { radius: number; length: number; color: number };
  head: { radius: number; color: number };
  snout: { w: number; h: number; d: number; color: number };
  nose: number;
  ears: 'floppy' | 'long' | 'folded' | 'pointy' | 'drop';
  earColor: number;
  legLength: number;
  legRadius: number;
  legColor: number;
  tail: { length: number; radius: number; color: number; up: number };
  patches: readonly number[];
  gallopHz: number;
  accessories: readonly ('sunglasses' | 'spikedCollar' | 'bandana' | 'earTag')[];
}

const DUKE: DogDef = {
    name: 'Duke',
    build: 'bulldog',
    breed: 'English bulldog',
    scale: 1.15,
    body: { radius: 0.27, length: 0.38, color: 0xc9a27a },
    head: { radius: 0.24, color: 0xc9a27a },
    snout: { w: 0.26, h: 0.16, d: 0.12, color: 0xe8d4b8 },
    nose: 0x2a201c,
    ears: 'folded',
    earColor: 0x8a6a4f,
    legLength: 0.26,
    legRadius: 0.08,
    legColor: 0xe8d4b8,
    tail: { length: 0.1, radius: 0.05, color: 0xc9a27a, up: -0.6 },
    patches: [0xe8d4b8],
    gallopHz: 4.2,
    accessories: ['sunglasses', 'spikedCollar'],
};

/**
 * Breeds ready for the next cities (Tokyo: Shiba and Akita; Tbilisi: Georgian Shepherd and a
 * friendly ear-tagged street dog, as Tbilisi's vaccinated strays wear).
 */
export const BREEDS: Record<string, DogDef> = {
  shiba: {
    name: 'Kenta', build: 'shiba', breed: 'Shiba Inu', scale: 1.15,
    body: { radius: 0.15, length: 0.4, color: 0xd9823a }, head: { radius: 0.15, color: 0xd9823a },
    snout: { w: 0.09, h: 0.08, d: 0.11, color: 0xf6e6cc }, nose: 0x2a201c, ears: 'pointy', earColor: 0xd9823a,
    legLength: 0.3, legRadius: 0.042, legColor: 0xf6e6cc, tail: { length: 0.34, radius: 0.042, color: 0xd9823a, up: -1.7 },
    patches: [], gallopHz: 6.4, accessories: [], underside: 0xf6e6cc, style: 'feint',
  },
  akita: {
    name: 'Haru', build: 'akita', breed: 'Akita', scale: 1.35,
    body: { radius: 0.21, length: 0.5, color: 0xe8b07a }, head: { radius: 0.19, color: 0xe8b07a },
    snout: { w: 0.12, h: 0.1, d: 0.12, color: 0xfaf0e0 }, nose: 0x2a201c, ears: 'pointy', earColor: 0xe8b07a,
    legLength: 0.36, legRadius: 0.06, legColor: 0xfaf0e0, tail: { length: 0.4, radius: 0.055, color: 0xe8b07a, up: -1.7 },
    patches: [], gallopHz: 4.6, accessories: [], underside: 0xfaf0e0, style: 'push',
  },
  nagazi: {
    name: 'Gela', build: 'shepherd', breed: 'Georgian Shepherd (Nagazi)', scale: 1.35,
    body: { radius: 0.24, length: 0.55, color: 0xf0e6d6 }, head: { radius: 0.2, color: 0xf0e6d6 },
    snout: { w: 0.14, h: 0.12, d: 0.14, color: 0xe6d8c2 }, nose: 0x2a201c, ears: 'drop', earColor: 0xc9b49a,
    legLength: 0.4, legRadius: 0.07, legColor: 0xf0e6d6, tail: { length: 0.42, radius: 0.07, color: 0xf0e6d6, up: 0.5 },
    patches: [0xc9b49a], gallopHz: 3.8, accessories: [],
  },
  streetDog: {
    name: 'Lali', build: 'street', breed: 'Tbilisi street dog', scale: 1.2,
    body: { radius: 0.16, length: 0.46, color: 0xc89a62 }, head: { radius: 0.15, color: 0xc89a62 },
    snout: { w: 0.1, h: 0.09, d: 0.13, color: 0xd8b282 }, nose: 0x2a201c, ears: 'pointy', earColor: 0xa87a48,
    legLength: 0.34, legRadius: 0.045, legColor: 0xd8b282, tail: { length: 0.3, radius: 0.04, color: 0xc89a62, up: -0.2 },
    patches: [0xf3ead8], gallopHz: 5.4, accessories: ['earTag'],
  },
};

/** Duke is everywhere; each city file adds its local pups. */
export const DOGS: Record<string, DogDef> = { duke: DUKE, ...MAPLE_LANE.dogs.defs, ...ROME.dogs.defs, ...TOKYO.dogs.defs, ...BREEDS };

export const DOG_ACCESSORY_COLORS = {
  lens: 0x1d1d22,
  frame: 0x2a201c,
  collar: 0x3a2a2a,
  spike: 0xd9dde2,
  bandana: 0x3f8a5a,
  tongue: 0xe88c94,
  earTag: 0xf2d43a,
} as const;

export const DOG_ANIM = {
  /** Transverse gallop (dogs) vs the cat's rotary one: FL, FR, BL, BR phase offsets. */
  gallopPhase: [0, 0.3, Math.PI, Math.PI + 0.3] as const,
  kneeFold: 0.7,
  spineFlex: 0.07,
  jowlBounce: 0.45,
  /** Terriers bounce more. */
  springy: { terrier: 1.7, shiba: 1.2 } as Record<string, number>,
  legSwing: 0.9,
  bobAmp: 0.06,
  earFlop: 0.35,
  tailWagHz: 7,
  tailWag: 0.6,
  tauntSec: 0.7,
  idleHz: 1.2,
} as const;
