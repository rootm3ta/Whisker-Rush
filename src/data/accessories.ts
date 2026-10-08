/** Procedural accessories (GAME_DESIGN 6.4). Every cat can wear one per slot. */
export type Slot = 'head' | 'eyes' | 'neck' | 'back' | 'tail' | 'trail';

export const SLOTS: readonly Slot[] = ['head', 'eyes', 'neck', 'back', 'tail', 'trail'];

export interface AccessoryDef {
  name: string;
  slot: Slot;
  /** Price in the Wardrobe; `source` items are earned elsewhere and not for sale. */
  coins?: number;
  fishBones?: number;
  source?: 'set' | 'streak' | 'pass' | 'secret' | 'gift';
  colors: readonly number[];
}

export const ACCESSORIES: Record<string, AccessoryDef> = {
  beret: { name: 'Beret', slot: 'head', coins: 1200, colors: [0xd9483b, 0x2a201c] },
  vikingHelmet: { name: 'Viking Helmet', slot: 'head', source: 'secret', colors: [0xa9b2bc, 0xf3ead8] },
  chefHat: { name: 'Chef Hat', slot: 'head', coins: 1500, colors: [0xfbfbf6] },
  crown: { name: 'Crown', slot: 'head', source: 'set', colors: [0xf2c14e, 0xd9483b] },
  bucketHat: { name: 'Bucket Hat', slot: 'head', source: 'gift', colors: [0xe8d4b8, 0x6fa38a] },
  sombrero: { name: 'Tiny Sombrero', slot: 'head', source: 'secret', colors: [0xe8c27a, 0xd9483b] },
  aviators: { name: 'Aviators', slot: 'eyes', source: 'set', colors: [0x2a3a4a, 0xc9a24e] },
  heartGlasses: { name: 'Heart Glasses', slot: 'eyes', source: 'secret', colors: [0xe85d8a, 0x2a201c] },
  monocle: { name: 'Monocle', slot: 'eyes', coins: 2500, colors: [0xc9a24e, 0xdff1f7] },
  bandana: { name: 'Bandana', slot: 'neck', coins: 600, colors: [0x3f6f8a, 0xfbf6ec] },
  bellCollar: { name: 'Bell Collar', slot: 'neck', coins: 900, colors: [0xd9483b, 0xf2c14e] },
  bowTie: { name: 'Bow Tie', slot: 'neck', coins: 1100, colors: [0x2a201c] },
  goldChain: { name: 'Gold Chain', slot: 'neck', source: 'secret', colors: [0xf2c14e] },
  backpack: { name: 'Mini Backpack', slot: 'back', coins: 1800, colors: [0x6fb38a, 0x3f6f8a] },
  // City outfit pieces (Tokyo Street, Tbilisoba).
  hoodie: { name: 'Oversized Hoodie', slot: 'back', coins: 2200, colors: [0xa9b8c8, 0x2a201c] },
  headphones: { name: 'Tiny Headphones', slot: 'neck', source: 'set', colors: [0xf2f2f2, 0xe85d8a] },
  svanHat: { name: 'Felt Svan Hat', slot: 'head', coins: 1600, colors: [0xd8c8a8, 0x6b4a35] },
  chokha: { name: 'Tiny Chokha', slot: 'back', coins: 2400, colors: [0x2a2a3a, 0xc9a24e] },
  hornCharm: { name: 'Horn Cup Charm', slot: 'neck', source: 'set', colors: [0xc8a46e, 0xc9a24e] },
  cape: { name: 'Cape', slot: 'back', fishBones: 6, colors: [0xa45fd6, 0xf2c14e] },
  angelWings: { name: 'Angel Wings', slot: 'back', source: 'secret', colors: [0xfbfbf6] },
  jetpack: { name: 'Jetpack', slot: 'back', source: 'pass', colors: [0xa9b2bc, 0xd9483b] },
  tailBow: { name: 'Tail Bow', slot: 'tail', coins: 700, colors: [0xe85d8a] },
  tailRing: { name: 'Tail Ring', slot: 'tail', source: 'set', colors: [0xf2c14e] },
  sparkleTrail: { name: 'Sparkles', slot: 'trail', source: 'streak', colors: [0xfff1a8, 0xffffff] },
  rainbowTrail: { name: 'Rainbow', slot: 'trail', source: 'secret', colors: [0xe0453a, 0xf2a33a, 0xf2d43a, 0x6fd36a, 0x4a8fe0, 0xa45fd6] },
  bubbleTrail: { name: 'Fish Bubbles', slot: 'trail', coins: 3000, colors: [0x9fd8f0, 0xdff6ff] },
  musicTrail: { name: 'Music Notes', slot: 'trail', source: 'pass', colors: [0x2a201c, 0x3f6f8a] },
  pixelTrail: { name: 'Pixel Squares', slot: 'trail', fishBones: 8, colors: [0x6fd36a, 0xe85d8a, 0x4a8fe0] },
};

export const ACCESSORY_IDS = Object.keys(ACCESSORIES);

export const TRAIL = {
  perSec: 22,
  life: 0.7,
  capacity: 40,
  size: 0.16,
} as const;
