/** Procedural dog definitions. Model faces -z, units before `scale`. */
export interface DogDef {
  name: string;
  scale: number;
  body: { radius: number; length: number; color: number };
  head: { radius: number; color: number };
  snout: { w: number; h: number; d: number; color: number };
  nose: number;
  ears: 'floppy' | 'long' | 'folded';
  earColor: number;
  legLength: number;
  legRadius: number;
  legColor: number;
  tail: { length: number; radius: number; color: number; up: number };
  patches: readonly number[];
  gallopHz: number;
  accessories: readonly ('sunglasses' | 'spikedCollar' | 'bandana')[];
}

export const DOGS: Record<'duke' | 'pickle' | 'bolt', DogDef> = {
  duke: {
    name: 'Duke',
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
  },
  pickle: {
    name: 'Pickle',
    scale: 1.2,
    body: { radius: 0.15, length: 0.62, color: 0x8a4b2a },
    head: { radius: 0.15, color: 0x8a4b2a },
    snout: { w: 0.12, h: 0.1, d: 0.16, color: 0x8a4b2a },
    nose: 0x2a201c,
    ears: 'long',
    earColor: 0x5e301a,
    legLength: 0.16,
    legRadius: 0.05,
    legColor: 0x6e3a20,
    tail: { length: 0.28, radius: 0.035, color: 0x8a4b2a, up: -0.3 },
    patches: [],
    gallopHz: 6.2,
    accessories: ['bandana'],
  },
  bolt: {
    name: 'Bolt',
    scale: 1.2,
    body: { radius: 0.17, length: 0.36, color: 0xf6f0e4 },
    head: { radius: 0.16, color: 0xf6f0e4 },
    snout: { w: 0.12, h: 0.1, d: 0.12, color: 0xf6f0e4 },
    nose: 0x2a201c,
    ears: 'folded',
    earColor: 0x8a5a33,
    legLength: 0.3,
    legRadius: 0.05,
    legColor: 0xf6f0e4,
    tail: { length: 0.2, radius: 0.035, color: 0xf6f0e4, up: -1.0 },
    patches: [0x8a5a33, 0x2e2a2b],
    gallopHz: 5.6,
    accessories: [],
  },
};

export const DOG_ACCESSORY_COLORS = {
  lens: 0x1d1d22,
  frame: 0x2a201c,
  collar: 0x3a2a2a,
  spike: 0xd9dde2,
  bandana: 0x3f8a5a,
  tongue: 0xe88c94,
} as const;

export const DOG_ANIM = {
  legSwing: 0.9,
  bobAmp: 0.06,
  earFlop: 0.35,
  tailWagHz: 7,
  tailWag: 0.6,
  tauntSec: 0.7,
  idleHz: 1.2,
} as const;
