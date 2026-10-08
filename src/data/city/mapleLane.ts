import type { DogDef } from '../dogs';
import type { ObstacleDef } from '../obstacles';
import { base } from '../obstacleBase';
import { arc, bell, C, coins, L, line, loot, o, R, type Pattern } from '../patterns';
import type { LootItem } from '../pickups';
import type { BasePalette, CityDef } from './types';

/** Maple Lane (home): golden-hour suburb, mint houses, orange leaves. */
export const MAPLE_PALETTE = {
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
} satisfies BasePalette & Record<string, unknown>;

const CAR_TOP = 2.0;
const TRUCK_TOP = 3.1;

const OBSTACLES: Record<string, ObstacleDef> = {
  trashCans: { ...base, length: 1.0, halfWidth: 1.0, body: [0, 1.0], lethal: true, capacity: 16 },
  hedge: { ...base, length: 1.2, halfWidth: 1.2, body: [0, 0.85], capacity: 12 },
  bike: { ...base, length: 0.8, halfWidth: 1.0, body: [0, 0.75], capacity: 8 },
  sprinkler: { ...base, length: 0.8, halfWidth: 1.1, body: [0, 0.65], capacity: 8 },
  gardenFence: { ...base, length: 0.3, halfWidth: 1.3, body: [0, 1.0], lethal: true, capacity: 10 },
  lowBranch: { ...base, length: 0.6, halfWidth: 1.3, body: [0.85, 2.6], capacity: 8 },
  laundry: { ...base, length: 0.4, halfWidth: 1.3, body: [0.85, 2.6], capacity: 8 },
  car: { ...base, tints: [0xd9562e, 0x4a8fe0, 0xf2c14e, 0x6fb38a, 0xe8e2d4], length: 4.2, halfWidth: 1.05, body: [0, 1.4], top: 1.4, lethal: true, kickable: true, capacity: 12 },
  mailTruck: { ...base, length: 6.5, halfWidth: 1.2, body: [0, 2.5], top: 2.5, lethal: true, kickable: true, capacity: 6 },
  hedgeWall: { ...base, length: 10, halfWidth: 1.2, body: [0, 2.2], top: 2.2, lethal: true, kickable: true, capacity: 8 },
  catDoorWall: { ...base, length: 10, halfWidth: 1.2, body: [0, 2.2], top: 2.2, lethal: true, kickable: true, capacity: 2, catDoor: true },
};

const LOOT: LootItem[] = [
  { city: 'mapleLane', id: 'bottleCap', name: 'Bottle Cap', rarity: 0, value: 5 },
  { city: 'mapleLane', id: 'sock', name: 'Sock', rarity: 0, value: 6 },
  { city: 'mapleLane', id: 'rubberBand', name: 'Rubber Band', rarity: 0, value: 5 },
  { city: 'mapleLane', id: 'lostButton', name: 'Lost Button', rarity: 0, value: 8 },
  { city: 'mapleLane', id: 'toyMouse', name: 'Toy Mouse', rarity: 1, value: 25 },
  { city: 'mapleLane', id: 'shinySpoon', name: 'Shiny Spoon', rarity: 1, value: 35 },
  { city: 'mapleLane', id: 'feather', name: 'Feather', rarity: 1, value: 20 },
  { city: 'mapleLane', id: 'silverBell', name: 'Silver Bell', rarity: 2, value: 120 },
  { city: 'mapleLane', id: 'lostEarring', name: 'Lost Earring', rarity: 2, value: 150 },
  { city: 'mapleLane', id: 'vintageStamp', name: 'Vintage Stamp', rarity: 2, value: 90 },
  { city: 'mapleLane', id: 'goldenMouse', name: 'Golden Mouse', rarity: 3, value: 500 },
  { city: 'mapleLane', id: 'grandmasBrooch', name: "Grandma's Brooch", rarity: 3, value: 400 },
  { city: 'mapleLane', id: 'dukesSunglasses', name: "Duke's Lost Sunglasses", rarity: 4, value: 1200 },
  { city: 'mapleLane', id: 'postcardFragment', name: 'Postcard Fragment', rarity: 4, value: 1000 },
];

const DOGS: Record<string, DogDef> = {
  pickle: {
    name: 'Pickle',
    build: 'dachshund',
    breed: 'Dachshund',
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
    build: 'terrier',
    breed: 'Jack Russell terrier',
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

/** Hand-authored Maple Lane patterns. All are mirrored at random by the spawner. */
const PATTERNS: Pattern[] = [
  // Tier 1: one decision at a time.
  { name: 'cans-center', tier: 1, weight: 1, length: 24, entries: [o('trashCans', C, 12), coins(L, 2, 8), coins(R, 16, 4)] },
  { name: 'hedge-hop', tier: 1, weight: 1, length: 22, entries: [o('hedge', C, 12), arc(C, 7, 7, 11), coins(L, 0, 4)] },
  { name: 'two-cans', tier: 1, weight: 1, length: 22, entries: [o('trashCans', L, 12), o('trashCans', C, 12), coins(R, 2, 8)] },
  { name: 'bike-sprinkler', tier: 1, weight: 1, length: 26, entries: [o('bike', L, 8), o('sprinkler', R, 18), coins(C, 0, 10)] },
  { name: 'branch-slide', tier: 1, weight: 1, length: 24, entries: [o('lowBranch', C, 12), coins(C, 5, 6, 0.35), loot(L, 16)] },
  { name: 'car-ramp', tier: 1, weight: 1, length: 26, entries: [o('ramp', C, 6), o('car', C, 10), coins(C, 6, 2, 1.2), coins(C, 10.5, 2, CAR_TOP, 1.8), coins(L, 4, 6)] },
  { name: 'stagger-cans', tier: 1, weight: 1, length: 40, entries: [o('trashCans', L, 6), o('trashCans', C, 20), o('trashCans', R, 34), coins(C, 0, 5), coins(R, 14, 5), coins(L, 28, 5)] },
  { name: 'clothes-hop', tier: 1, weight: 0.8, length: 30, entries: [line(C, 8, 18, 4), arc(C, 2, 4, 6, 1.2, 0.8), coins(R, 6, 8)] },
  { name: 'fence-gap', tier: 1, weight: 1, length: 24, entries: [o('gardenFence', L, 12), o('gardenFence', R, 12), coins(C, 2, 5), loot(C, 18)] },
  { name: 'coin-snake', tier: 1, weight: 0.6, length: 34, entries: [coins(L, 0, 4), coins(C, 10, 4), coins(R, 20, 4), loot(R, 30)] },

  // Tier 2: two decisions, high layer and grinds.
  { name: 'car-sandwich', tier: 2, weight: 1, length: 24, entries: [o('car', L, 6), o('car', R, 6), o('hedge', C, 9), arc(C, 4, 7, 11)] },
  { name: 'laundry-car', tier: 2, weight: 1, length: 24, entries: [o('laundry', L, 10), o('laundry', C, 10), o('car', R, 8), coins(R, 8.5, 2, CAR_TOP, 1.8), coins(C, 4, 3, 0.35)] },
  {
    name: 'rooftop-run',
    tier: 2,
    weight: 1,
    length: 34,
    entries: [o('ramp', C, 4), o('car', C, 8), o('car', C, 12.2), o('mailTruck', C, 16.4), coins(C, 9, 4, CAR_TOP, 2), arc(C, 15, 3, 3, 1.4, CAR_TOP), coins(C, 18, 3, TRUCK_TOP, 2), bell(C, 22, TRUCK_TOP), o('trashCans', L, 12), o('trashCans', R, 20)],
  },
  {
    name: 'zigzag',
    tier: 2,
    weight: 1,
    length: 34,
    entries: [o('trashCans', L, 4), o('trashCans', C, 4), o('trashCans', C, 18), o('trashCans', R, 18), o('trashCans', L, 32), o('trashCans', C, 32), coins(R, 0, 4), coins(L, 12, 4), coins(R, 26, 4)],
  },
  { name: 'sprinkler-row', tier: 2, weight: 1, length: 24, entries: [o('sprinkler', L, 12), o('sprinkler', C, 12), o('sprinkler', R, 12), arc(C, 7, 6, 10), arc(L, 7, 6, 10)] },
  { name: 'branch-row', tier: 2, weight: 1, length: 30, entries: [o('lowBranch', L, 8), o('lowBranch', C, 8), o('lowBranch', R, 8), o('trashCans', C, 22), coins(L, 14, 5)] },
  {
    name: 'kick-alley',
    tier: 2,
    weight: 0.9,
    length: 28,
    entries: [o('hedgeWall', L, 6), o('hedgeWall', R, 6), coins(C, 4, 5), arc(C, 8, 5, 8, 1.0, 2.6), loot(C, 12, 3.2), bell(L, 14, 2.9)],
  },
  { name: 'line-hop', tier: 2, weight: 0.8, length: 42, entries: [line(L, 4, 20, 3), line(C, 20, 20, 3), coins(R, 4, 12), arc(L, 0, 3, 4, 1, 0.8)] },

  // Tier 3: dense, mixed moves.
  { name: 'choose-move', tier: 3, weight: 1, length: 24, entries: [o('gardenFence', L, 12), o('laundry', C, 12), o('bike', R, 12), arc(L, 8, 5, 8), coins(C, 9, 3, 0.35)] },
  {
    name: 'traffic',
    tier: 3,
    weight: 1,
    length: 30,
    entries: [o('car', L, 4), o('mailTruck', C, 10), o('trashCans', R, 6), o('trashCans', R, 22), coins(L, 4.5, 2, CAR_TOP, 1.8), coins(R, 10, 4)],
  },
  {
    name: 'jump-slide-center',
    tier: 3,
    weight: 0.9,
    length: 34,
    entries: [o('hedgeWall', L, 2), o('hedgeWall', R, 2), o('hedgeWall', L, 12), o('hedgeWall', R, 12), o('hedge', C, 5), o('lowBranch', C, 18), coins(C, 19, 3, 0.35), arc(C, 8, 4, 6, 1.0, 2.8)],
  },
  {
    name: 'mixed-rows',
    tier: 3,
    weight: 1,
    length: 34,
    entries: [o('bike', L, 8), o('laundry', C, 8), o('gardenFence', R, 8), o('hedge', L, 24), o('lowBranch', C, 24), o('trashCans', R, 24), coins(C, 14, 4)],
  },
  {
    name: 'high-road',
    tier: 3,
    weight: 1,
    length: 32,
    entries: [o('ramp', C, 0), o('car', C, 4), o('car', L, 6), o('mailTruck', C, 8.2), o('trashCans', R, 14), o('gardenFence', L, 22), coins(C, 4.5, 2, CAR_TOP, 1.6), coins(C, 10, 3, TRUCK_TOP, 2), bell(C, 14, TRUCK_TOP)],
  },
  {
    name: 'truck-loot',
    tier: 3,
    weight: 0.7,
    length: 28,
    entries: [o('car', R, 4), o('mailTruck', R, 8.2), loot(R, 11, TRUCK_TOP + 0.1), o('trashCans', L, 6), o('gardenFence', C, 12), coins(C, 0, 4), coins(L, 14, 4)],
  },
  { name: 'double-line', tier: 3, weight: 0.8, length: 34, entries: [line(L, 2, 24, 4), line(R, 2, 24, 4), o('hedge', C, 8), o('lowBranch', C, 20), coins(C, 26, 4), bell(R, 24, 2.1)] },

  // Rare: a glowing cat flap in a hedge wall. Swipe into it to enter the Secret Alley.
  { name: 'cat-door', tier: 1, weight: 0.12, length: 20, entries: [o('catDoorWall', L, 4), o('trashCans', R, 10), coins(C, 2, 6)] },
  { name: 'cat-door-2', tier: 2, weight: 0.12, length: 20, entries: [o('catDoorWall', R, 4), o('hedge', C, 12), arc(C, 8, 5, 8), bell(L, 10, 0.75)] },
];

export const MAPLE_LANE: CityDef = {
  id: 'mapleLane',
  name: 'Maple Lane',
  palette: MAPLE_PALETTE,
  zones: ['Suburbs', 'Market Street', 'Park', 'Old Town', 'Riverside'],
  obstacles: OBSTACLES,
  patterns: PATTERNS,
  loot: LOOT,
  dogs: { defs: DOGS, pups: ['pickle', 'bolt'], rush: 'bolt' },
  boss: { vehicle: 'mailTruck', throwIds: ['parcel', 'trashCans', 'parcel', 'bike'], riderY: 2.5, riderZ: -3 },
  music: {
    bpm: 104,
    homeBpm: 92,
    chords: [
      ['C4', 'E4', 'G4', 'B4'],
      ['A3', 'C4', 'E4', 'G4'],
      ['F3', 'A3', 'C4', 'E4'],
      ['G3', 'B3', 'D4', 'F4'],
    ],
    bass: ['C2', 'A1', 'F1', 'G1'],
    leadScale: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'],
    seed: 104,
    swing: 0.1,
    pad: 'fmPiano',
    lead: 'square',
    groove: 'lofi',
  },
  unlock: {},
  map: { x: 0.2, y: 0.36, mood: 'Golden-hour suburb', hazard: "Sprinklers, kids' bikes, the mail truck", shortcut: 'Garden fences', musicName: 'Cozy lo-fi bounce' },
};
