import type { DogDef } from '../dogs';
import type { ObstacleDef } from '../obstacles';
import { base } from '../obstacleBase';
import { arc, bell, C, coins, L, line, loot, o, R, type Pattern } from '../patterns';
import type { LootItem } from '../pickups';
import type { BasePalette, CityDef } from './types';

/** Rome: terracotta, cream, deep blue sky. */
export const ROME_PALETTE = {
  skyTop: 0x2f6db8,
  skyHorizon: 0xf6d7a8,
  fog: 0xf0d2a4,
  sun: 0xfff0d0,
  hemiSky: 0xfff4e0,
  hemiGround: 0xb59a7a,
  road: 0x8a7a6a,
  stripe: 0xe8dcc4,
  curb: 0xd8c8a8,
  sidewalk: 0xc9b48e,
  lawn: 0xd8c49a,
  cobble: 0x7a6a5a,
  walls: [0xd9814f, 0xe8c48a, 0xf3e2c4, 0xc96a4a, 0xe0a86a],
  shutters: [0x3f7a5a, 0x2f5f6a, 0x6a8a4a],
  window: 0x3a3030,
  cornice: 0xf3e6cf,
  roofTiles: 0xa9573f,
  awnings: [0xd9483b, 0x3f6f8a, 0x6fb38a, 0xf2c14e],
  cypress: [0x3f5f3a, 0x4a6a40],
  stone: 0xd8c8a8,
  lamp: 0x2a2a2a,
  lampHead: 0xffe0a0,
  pot: 0xc0603a,
  lemon: [0xf2d43a, 0x6f9e4f],
  water: 0x7fc6e8,
  vespas: [0x8fd3c8, 0xd9483b, 0xf2e2b8, 0xf2c14e, 0x4a8fe0],
  fiats: [0xf2e2b8, 0x8fd3c8, 0xd9483b, 0x6fb38a],
} satisfies BasePalette & Record<string, unknown>;

const APE_TOP = 3.0;
const FIAT_TOP = 1.9;
const RIM = 1.4;
const AWNING = 2.7;

const OBSTACLES: Record<string, ObstacleDef> = {
  crates: { ...base, length: 1.0, halfWidth: 1.0, body: [0, 1.0], lethal: true, capacity: 16 },
  planter: { ...base, length: 1.0, halfWidth: 1.1, body: [0, 0.85], capacity: 12 },
  cafeTable: { ...base, length: 1.0, halfWidth: 1.2, body: [0, 0.9], capacity: 10 },
  // Vespas drive along slower than you and weave between lanes. Low enough to jump.
  vespa: { ...base, length: 1.6, halfWidth: 0.75, body: [0, 1.15], lethal: true, weaves: true, capacity: 8, tints: ROME_PALETTE.vespas },
  fiat: { ...base, length: 3.4, halfWidth: 1.0, body: [0, 1.3], top: 1.3, lethal: true, kickable: true, capacity: 10, tints: ROME_PALETTE.fiats },
  apeTruck: { ...base, length: 4.5, halfWidth: 1.15, body: [0, 2.4], top: 2.4, lethal: true, kickable: true, capacity: 6 },
  // Laundry falls from the balconies when you get close, landing as a pile you jump.
  laundryDrop: { ...base, length: 1.2, halfWidth: 1.2, body: [0, 0.6], drops: true, capacity: 8 },
  // Fountain: head-on is a stumble, its rim is a walkable shortcut.
  fountain: { ...base, length: 3.0, halfWidth: 1.3, body: [0, 0.8], top: 0.8, capacity: 4 },
  // Market awning: overhead high layer you can run along.
  awning: { ...base, length: 8, halfWidth: 1.4, body: null, top: 2.1, capacity: 6 },
  stoneWall: { ...base, length: 10, halfWidth: 1.2, body: [0, 2.2], top: 2.2, lethal: true, kickable: true, capacity: 8 },
  catDoorStone: { ...base, length: 10, halfWidth: 1.2, body: [0, 2.2], top: 2.2, lethal: true, kickable: true, capacity: 2, catDoor: true },
  pizzaBoxes: { ...base, length: 0.8, halfWidth: 0.9, body: [0, 0.8], lethal: true, capacity: 12 },
};

const LOOT: LootItem[] = [
  { city: 'rome', id: 'espressoCup', name: 'Espresso Cup', rarity: 0, value: 8 },
  { city: 'rome', id: 'pizzaCrust', name: 'Pizza Crust', rarity: 0, value: 6 },
  { city: 'rome', id: 'cork', name: 'Wine Cork', rarity: 0, value: 5 },
  { city: 'rome', id: 'romanCoin', name: 'Old Roman Coin', rarity: 1, value: 30 },
  { city: 'rome', id: 'gelatoSpoon', name: 'Gelato Spoon', rarity: 1, value: 25 },
  { city: 'rome', id: 'vespaKey', name: 'Vespa Key', rarity: 2, value: 140 },
  { city: 'rome', id: 'mosaicTile', name: 'Mosaic Tile', rarity: 2, value: 110 },
  { city: 'rome', id: 'goldenLaurel', name: 'Golden Laurel', rarity: 3, value: 550 },
  { city: 'rome', id: 'treviCoin', name: 'Trevi Wish Coin', rarity: 4, value: 1300 },
  { city: 'rome', id: 'postcardRome', name: 'Postcard Fragment (Rome)', rarity: 4, value: 1000 },
];

const DOGS: Record<string, DogDef> = {
  greyhound: {
    name: 'Nico',
    scale: 1.25,
    body: { radius: 0.12, length: 0.5, color: 0x9aa0a8 },
    head: { radius: 0.11, color: 0x9aa0a8 },
    snout: { w: 0.07, h: 0.07, d: 0.2, color: 0x9aa0a8 },
    nose: 0x2a201c,
    ears: 'folded',
    earColor: 0x7a8088,
    legLength: 0.4,
    legRadius: 0.035,
    legColor: 0xf3ead8,
    tail: { length: 0.3, radius: 0.025, color: 0x9aa0a8, up: 0.3 },
    patches: [0xf3ead8],
    gallopHz: 6.8,
    accessories: ['bandana'],
  },
  spinone: {
    name: 'Bruno',
    scale: 1.3,
    body: { radius: 0.2, length: 0.45, color: 0xf3ead8 },
    head: { radius: 0.17, color: 0xf3ead8 },
    snout: { w: 0.15, h: 0.13, d: 0.14, color: 0xf3ead8 },
    nose: 0x8a5a33,
    ears: 'long',
    earColor: 0xc8682a,
    legLength: 0.3,
    legRadius: 0.06,
    legColor: 0xf3ead8,
    tail: { length: 0.18, radius: 0.04, color: 0xf3ead8, up: -0.4 },
    patches: [0xc8682a, 0xc8682a],
    gallopHz: 4.8,
    accessories: [],
  },
};

const PATTERNS: Pattern[] = [
  // Tier 1
  { name: 'r-crates', tier: 1, weight: 1, length: 24, entries: [o('crates', C, 12), coins(L, 2, 8), coins(R, 16, 4)] },
  { name: 'r-planters', tier: 1, weight: 1, length: 22, entries: [o('planter', L, 12), o('planter', C, 12), arc(C, 7, 6, 10), coins(R, 2, 6)] },
  { name: 'r-cafe', tier: 1, weight: 1, length: 26, entries: [o('cafeTable', L, 8), o('cafeTable', R, 18), coins(C, 0, 10)] },
  { name: 'r-vespa', tier: 1, weight: 1, length: 30, entries: [o('vespa', C, 24), coins(L, 4, 6), loot(R, 18)] },
  { name: 'r-laundry', tier: 1, weight: 0.9, length: 26, entries: [o('laundryDrop', C, 14), arc(C, 9, 6, 10), coins(L, 2, 5)] },
  { name: 'r-fountain', tier: 1, weight: 0.9, length: 28, entries: [o('fountain', C, 10), coins(C, 10.5, 3, RIM, 1.1), coins(R, 4, 6), bell(C, 12, RIM + 0.2)] },
  { name: 'r-lines', tier: 1, weight: 0.7, length: 30, entries: [line(L, 6, 18, 4), coins(C, 4, 8)] },
  // Tier 2
  { name: 'r-fiat-ramp', tier: 2, weight: 1, length: 28, entries: [o('ramp', C, 4), o('fiat', C, 8), o('fiat', C, 11.4), coins(C, 8.5, 4, FIAT_TOP, 1.6), o('crates', L, 10), o('vespa', R, 22)] },
  { name: 'r-two-vespas', tier: 2, weight: 1, length: 34, entries: [o('vespa', L, 20), o('vespa', R, 30), coins(C, 6, 8)] },
  { name: 'r-fountain-awning', tier: 2, weight: 0.9, length: 34, entries: [o('fountain', C, 6), o('awning', C, 10), coins(C, 6.5, 2, RIM, 1.2), coins(C, 11, 4, AWNING, 1.8), o('planter', L, 12), o('crates', R, 14), bell(C, 16, AWNING)] },
  { name: 'r-laundry-row', tier: 2, weight: 1, length: 30, entries: [o('laundryDrop', L, 12), o('laundryDrop', C, 12), o('cafeTable', R, 12), arc(L, 7, 6, 10)] },
  { name: 'r-alley', tier: 2, weight: 0.9, length: 30, entries: [o('stoneWall', L, 6), o('stoneWall', R, 6), coins(C, 4, 5), arc(C, 8, 5, 8, 1.0, 2.6), loot(C, 12, 3.2)] },
  { name: 'cat-door-rome', tier: 2, weight: 0.12, length: 20, entries: [o('catDoorStone', L, 4), o('planter', C, 12), arc(C, 8, 5, 8)] },
  // Tier 3
  { name: 'r-ape-run', tier: 3, weight: 1, length: 34, entries: [o('ramp', C, 2), o('fiat', C, 6), o('apeTruck', C, 9.4), coins(C, 6.5, 2, FIAT_TOP, 1.6), coins(C, 11, 3, APE_TOP, 1.6), o('crates', L, 12), o('vespa', R, 26), bell(C, 13, APE_TOP)] },
  { name: 'r-piazza', tier: 3, weight: 1, length: 32, entries: [o('fountain', L, 6), o('cafeTable', C, 8), o('crates', R, 8), o('laundryDrop', C, 22), o('vespa', L, 28)] },
  { name: 'r-traffic', tier: 3, weight: 1, length: 36, entries: [o('vespa', L, 18), o('vespa', C, 26), o('apeTruck', R, 8), o('planter', L, 30), coins(C, 4, 6)] },
  { name: 'r-high-street', tier: 3, weight: 0.8, length: 34, entries: [o('stoneWall', L, 2), o('awning', C, 6), o('awning', R, 6), o('crates', C, 4), o('cafeTable', R, 4), coins(C, 7, 4, AWNING, 1.8), line(R, 16, 14, 3)] },
];

export const ROME: CityDef = {
  id: 'rome',
  name: 'Rome',
  palette: ROME_PALETTE,
  zones: ['Trastevere', 'Campo Market', 'Piazza', 'Old Forum', 'Tiber Bank'],
  obstacles: OBSTACLES,
  patterns: PATTERNS,
  loot: LOOT,
  dogs: { defs: DOGS, pups: ['spinone', 'greyhound'], rush: 'greyhound' },
  boss: { vehicle: 'deliveryScooter', throwIds: ['pizzaBoxes', 'crates', 'pizzaBoxes', 'cafeTable'], riderY: 0.75, riderZ: -0.55 },
  music: {
    bpm: 116,
    homeBpm: 90,
    chords: [
      ['A3', 'C4', 'E4'],
      ['D4', 'F4', 'A4'],
      ['E3', 'G#3', 'B3', 'D4'],
      ['A3', 'C4', 'E4', 'A4'],
    ],
    bass: ['A1', 'D2', 'E1', 'A1'],
    leadScale: ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'],
    seed: 116,
    swing: 0.33,
    pad: 'accordion',
    lead: 'mandolin',
    groove: 'swing',
  },
  unlock: { bestDistance: 3000, coins: 20000, fishBones: 40 },
  map: { x: 0.52, y: 0.44, mood: 'Terracotta, cream, deep blue sky', hazard: 'Vespas weaving lanes, falling laundry', shortcut: 'Fountain rims, market awnings', musicName: 'Mandolin swing, accordion' },
};
