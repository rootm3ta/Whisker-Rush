import type { DogDef } from '../dogs';
import type { ObstacleDef } from '../obstacles';
import { base } from '../obstacleBase';
import { arc, bell, C, coins, L, line, loot, o, R, type Pattern } from '../patterns';
import type { LootItem } from '../pickups';
import type { BasePalette, CityDef } from './types';

/** Tokyo: cherry blossom pink, vending-machine glow, city-pop. No real brands anywhere. */
export const TOKYO_PALETTE = {
  skyTop: 0x7fb6e6,
  skyHorizon: 0xf6dfe6,
  fog: 0xeed8e0,
  sun: 0xfff0e6,
  hemiSky: 0xfff0f4,
  hemiGround: 0x9a8c9a,
  road: 0x56565e,
  stripe: 0xf6f6f2,
  curb: 0xc9c4c0,
  sidewalk: 0xb8b4b0,
  lawn: 0xa8a49e,
  glass: [0x8fb8d8, 0xa8c8e0, 0x6a8aa8, 0xb8d0e0],
  concrete: [0xd8d4ce, 0xc8c2bc, 0xe6e0d8],
  wood: [0x5a3a2a, 0x7a4a32, 0x6a4430],
  houses: [0xefe6d8, 0xd8e0e6, 0xe8dcc8, 0xf3ece2],
  roofTile: 0x4a5664,
  lantern: 0xd9483b,
  vending: [0xd9483b, 0x3f7ac9, 0xf3f3f0, 0x6fb38a],
  sakura: [0xf7c6d9, 0xf2a8c4, 0xfbe0ec],
  trunk: 0x5a4036,
  river: 0x6fa8c8,
  torii: 0xd9482e,
  neonDark: [0x1e1a34, 0x241c3e, 0x2a1e30],
  bikes: [0xc9d4e0, 0xe85d8a, 0x6fb38a, 0xf2c14e],
  robot: 0xf3f3f0,
  wire: 0x2a2a30,
} satisfies BasePalette & Record<string, unknown>;

/** Heights of walkable tops (shortcuts and the high layer). */
const VEND = 1.9;
const AWN = 2.1;
const OVER = 2.6;
const ELEV = 3.2;

const OBSTACLES: Record<string, ObstacleDef> = {
  // Crossing crowds surge across lanes when the signal changes (warning chime first).
  crowd: { ...base, length: 1.2, halfWidth: 1.0, body: [0, 1.8], weaves: true, warn: 'chime', capacity: 8 },
  // Delivery robots trundle along the lane (you catch up with them). Low: jump over.
  deliveryRobot: { ...base, length: 0.9, halfWidth: 0.6, body: [0, 0.8], rolls: 3.5, capacity: 8 },
  // Mamachari: city bicycles with baskets, weaving.
  mamachari: { ...base, length: 1.7, halfWidth: 0.6, body: [0, 1.2], lethal: true, weaves: true, capacity: 8, tints: TOKYO_PALETTE.bikes },
  // Crows swoop down to head height when you get close: slide under.
  crow: { ...base, length: 0.6, halfWidth: 1.2, body: [0.85, 2.2], drops: true, warn: 'caw', capacity: 8 },
  ramenCart: { ...base, length: 2.2, halfWidth: 1.1, body: [0, 1.4], lethal: true, warn: 'steam', capacity: 6 },
  // A sakura branch snaps in the wind and lands in the lane: jump the pile.
  sakuraBranch: { ...base, length: 1.2, halfWidth: 1.2, body: [0, 0.6], drops: true, capacity: 8 },
  // Railway crossing barrier arm: slide under (or jump), with a dinging bell.
  railBarrier: { ...base, length: 0.4, halfWidth: 1.3, body: [0.85, 1.4], warn: 'bell', capacity: 8 },
  // Green commuter train on the side track (scenery that rushes past).
  commuterTrain: { ...base, length: 22, halfWidth: 1.4, body: null, rolls: -24, sideX: 10.5, warn: 'rumble', capacity: 2 },
  vendingMachine: { ...base, length: 1.0, halfWidth: 1.1, body: [0, VEND], top: VEND, lethal: true, kickable: true, capacity: 10, tints: TOKYO_PALETTE.vending },
  tokyoAwning: { ...base, length: 8, halfWidth: 1.4, body: null, top: AWN, capacity: 6 },
  overpass: { ...base, length: 12, halfWidth: 1.4, body: null, top: OVER, capacity: 4 },
  elevatedTrack: { ...base, length: 24, halfWidth: 1.4, body: null, top: ELEV, capacity: 3 },
  tokyoStairs: { ...base, length: 7, halfWidth: 1.2, body: null, top: ELEV, ramp: true, capacity: 4 },
  shutterWall: { ...base, length: 10, halfWidth: 1.2, body: [0, 2.2], top: 2.2, lethal: true, kickable: true, capacity: 8 },
  catDoorTokyo: { ...base, length: 10, halfWidth: 1.2, body: [0, 2.2], top: 2.2, lethal: true, kickable: true, capacity: 2, catDoor: true },
  // What Duke throws from his kei truck.
  cardboard: { ...base, length: 0.8, halfWidth: 0.9, body: [0, 0.8], lethal: true, capacity: 12 },
  onigiriToss: { ...base, length: 0.7, halfWidth: 0.8, body: [0, 0.7], capacity: 10 },
};

const LOOT: LootItem[] = [
  { city: 'tokyo', id: 'gachapon', name: 'Gachapon Capsule', rarity: 0, value: 7 },
  { city: 'tokyo', id: 'onigiri', name: 'Onigiri', rarity: 0, value: 6 },
  { city: 'tokyo', id: 'taiyaki', name: 'Taiyaki', rarity: 0, value: 6 },
  { city: 'tokyo', id: 'fortuneSlip', name: 'Fortune Slip', rarity: 0, value: 5 },
  { city: 'tokyo', id: 'manekiNeko', name: 'Maneki-neko Charm', rarity: 1, value: 32 },
  { city: 'tokyo', id: 'omamori', name: 'Omamori Charm', rarity: 1, value: 26 },
  { city: 'tokyo', id: 'emaPlaque', name: 'Ema Plaque', rarity: 1, value: 24 },
  { city: 'tokyo', id: 'sakeCup', name: 'Tiny Sake Cup', rarity: 1, value: 28 },
  { city: 'tokyo', id: 'templeBell', name: 'Temple Bell', rarity: 2, value: 130 },
  { city: 'tokyo', id: 'daruma', name: 'Daruma Doll', rarity: 3, value: 520 },
  { city: 'tokyo', id: 'goldenDaruma', name: 'Golden Daruma', rarity: 4, value: 1400 },
  { city: 'tokyo', id: 'postcardTokyo', name: 'Postcard Fragment (Tokyo)', rarity: 4, value: 1000 },
];

/** Districts (each 1000 m, cycling): Shibuya, Yokocho, Shitamachi, Riverside, Neon Night. */
const SHIBUYA = 0;
const YOKOCHO = 1;
const SHITAMACHI = 2;
const RIVERSIDE = 3;
const NEON = 4;

const PATTERNS: Pattern[] = [
  // Anywhere.
  { name: 't-vending', tier: 1, weight: 1, length: 24, entries: [o('vendingMachine', L, 10), o('vendingMachine', R, 14), coins(C, 2, 8), coins(L, 10.2, 3, VEND, 1.2)] },
  { name: 't-mamachari', tier: 1, weight: 1, length: 30, entries: [o('mamachari', C, 24), coins(L, 4, 6), loot(R, 16)] },
  { name: 't-robots', tier: 1, weight: 1, length: 28, entries: [o('deliveryRobot', L, 10), o('deliveryRobot', R, 18), arc(L, 7, 5, 8), coins(C, 2, 8)] },
  { name: 't-awning-run', tier: 2, weight: 1, length: 30, entries: [o('vendingMachine', C, 4), o('tokyoAwning', C, 6), coins(C, 7, 4, AWN, 1.8), o('mamachari', L, 22), o('deliveryRobot', R, 12), bell(C, 12, AWN + 0.2)] },
  { name: 't-overpass', tier: 2, weight: 0.9, length: 34, entries: [o('vendingMachine', C, 4), o('overpass', C, 6), coins(C, 7, 5, OVER, 2), o('ramenCart', L, 10), o('shutterWall', R, 6), loot(C, 14, OVER + 0.3)] },
  { name: 't-elevated', tier: 3, weight: 0.8, length: 40, entries: [o('tokyoStairs', C, 2), o('elevatedTrack', C, 9), coins(C, 10, 8, ELEV, 2.4), o('crowd', L, 20), o('mamachari', R, 28), bell(C, 26, ELEV + 0.2)] },
  { name: 'cat-door-tokyo', tier: 2, weight: 0.12, length: 20, entries: [o('catDoorTokyo', L, 4), o('vendingMachine', C, 12), arc(C, 8, 5, 8)] },
  // Shibuya Crossing.
  { name: 't-scramble', tier: 1, weight: 1.2, length: 28, districts: [SHIBUYA], entries: [o('crowd', C, 18), coins(L, 4, 6), coins(R, 10, 5)] },
  { name: 't-scramble-2', tier: 2, weight: 1.2, length: 34, districts: [SHIBUYA, NEON], entries: [o('crowd', L, 18), o('crowd', R, 28), o('deliveryRobot', C, 10), coins(C, 2, 6)] },
  { name: 't-scramble-3', tier: 3, weight: 1, length: 38, districts: [SHIBUYA], entries: [o('crowd', L, 16), o('crowd', C, 26), o('crowd', R, 34), o('vendingMachine', R, 8), coins(R, 8.2, 3, VEND, 1.2)] },
  // Yokocho Alley.
  { name: 't-ramen-alley', tier: 1, weight: 1.2, length: 28, districts: [YOKOCHO], entries: [o('ramenCart', L, 10), o('ramenCart', R, 18), coins(C, 2, 10), bell(C, 14, 2.4)] },
  { name: 't-yokocho-wall', tier: 2, weight: 1, length: 30, districts: [YOKOCHO], entries: [o('shutterWall', L, 4), o('shutterWall', R, 4), o('mamachari', C, 24), arc(C, 6, 5, 8, 1, 2.6), bell(L, 9, 2.6)] },
  { name: 't-lantern-lines', tier: 2, weight: 0.8, length: 32, districts: [YOKOCHO], entries: [line(L, 6, 18, 4), o('ramenCart', C, 12), coins(R, 4, 8)] },
  // Shitamachi.
  { name: 't-rail-crossing', tier: 1, weight: 1.2, length: 30, districts: [SHITAMACHI], entries: [o('railBarrier', L, 16), o('railBarrier', C, 16), o('railBarrier', R, 16), o('commuterTrain', R, 28), coins(C, 4, 5), coins(C, 15, 2, 0.4)] },
  { name: 't-shrine', tier: 1, weight: 1, length: 26, districts: [SHITAMACHI], entries: [o('vendingMachine', C, 10), coins(C, 10.2, 3, VEND, 1.2), bell(C, 12, VEND + 0.4), o('deliveryRobot', L, 16), coins(R, 4, 6)] },
  { name: 't-backstreet', tier: 3, weight: 1, length: 36, districts: [SHITAMACHI], entries: [o('railBarrier', C, 8), o('vendingMachine', L, 14), o('mamachari', R, 26), o('crow', C, 22), o('commuterTrain', R, 34), coins(L, 14.2, 3, VEND, 1.2), bell(L, 16, VEND + 0.4)] },
  // Riverside Sakura.
  { name: 't-sakura-fall', tier: 1, weight: 1.2, length: 26, districts: [RIVERSIDE], entries: [o('sakuraBranch', C, 14), arc(C, 9, 6, 10), coins(L, 2, 6), bell(R, 18, 2.2)] },
  { name: 't-crows', tier: 2, weight: 1, length: 30, districts: [RIVERSIDE, SHITAMACHI], entries: [o('crow', L, 12), o('crow', R, 20), o('sakuraBranch', C, 24), coins(C, 2, 8)] },
  { name: 't-river-run', tier: 3, weight: 1, length: 36, districts: [RIVERSIDE], entries: [o('sakuraBranch', L, 10), o('crow', C, 16), o('mamachari', R, 30), o('vendingMachine', C, 26), coins(C, 26.2, 3, VEND, 1.2), loot(L, 22)] },
  // Neon Night.
  { name: 't-neon-robots', tier: 1, weight: 1.2, length: 30, districts: [NEON], entries: [o('deliveryRobot', C, 10), o('deliveryRobot', L, 22), coins(R, 2, 10), bell(R, 16, 2.4)] },
  { name: 't-neon-overpass', tier: 3, weight: 1, length: 40, districts: [NEON], entries: [o('vendingMachine', C, 4), o('overpass', C, 6), coins(C, 7, 5, OVER, 2), o('crowd', L, 22), o('crowd', R, 30), o('ramenCart', L, 10), bell(C, 14, OVER + 0.3)] },
];

/** The Akita lunges (and shoves); the Shiba runs the Pack Rush with side-step feints. */
const DOGS: Record<string, DogDef> = {};

/** Loading card: torii, lattice tower, skyline and sakura (inline SVG, no raster files). */
const CARD = `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="tks" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb6e6"/><stop offset="1" stop-color="#f6dfe6"/></linearGradient></defs>
<rect width="320" height="180" fill="url(#tks)"/>
<g fill="#c8c2d8">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i * 42 - 6}" y="${78 + (i % 3) * 12}" width="34" height="${110 - (i % 3) * 12}"/>`).join('')}</g>
<g stroke="#d9482e" stroke-width="2.4" fill="none"><path d="M236 150 L252 30 L268 150 M240 120 H264 M244 90 H260 M247 62 H257 M240 120 L262 90 M262 120 L242 90"/></g>
<rect x="250" y="22" width="4" height="10" fill="#d9482e"/>
<g fill="#d9482e" stroke="#2a201c" stroke-width="2"><rect x="52" y="74" width="10" height="90"/><rect x="128" y="74" width="10" height="90"/><path d="M30 64 Q95 54 160 64 L158 74 Q95 66 32 74Z"/><rect x="44" y="84" width="102" height="8"/></g>
<rect x="0" y="160" width="320" height="20" fill="#56565e"/>
<g fill="#fff">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${i * 36 + 4}" y="166" width="22" height="6"/>`).join('')}</g>
<g fill="#f7c6d9">${[[20, 30], [70, 18], [120, 40], [180, 24], [210, 60], [290, 34], [300, 80], [160, 100], [96, 120]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2.4" transform="rotate(30 ${x} ${y})"/>`).join('')}</g>
</svg>`;

/** Postcard comic: Ada judging a Tokyo dog show, a Shiba champion with a rosette. */
const POSTCARD = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
<rect width="320" height="200" fill="#fbe0ec"/>
<rect y="140" width="320" height="60" fill="#c8e0b0"/>
<g fill="#f7c6d9" stroke="#2a201c" stroke-width="2"><rect x="16" y="30" width="288" height="24" rx="4"/></g>
<text x="160" y="47" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="14" fill="#2a201c">TOKYO DOG SHOW</text>
<g stroke="#2a201c" stroke-width="2.4" stroke-linejoin="round">
  <rect x="190" y="120" width="70" height="30" fill="#f2c14e"/><text x="225" y="141" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="16" fill="#2a201c">1</text>
  <path d="M206 120 C200 96 214 82 226 84 C238 82 250 96 244 120Z" fill="#d9823a"/>
  <path d="M212 90 L208 70 L222 84Z M240 90 L244 70 L230 84Z" fill="#d9823a"/>
  <path d="M216 104 Q226 112 236 104" fill="#f6e6cc"/>
  <circle cx="218" cy="96" r="2.6" fill="#2a201c"/><circle cx="234" cy="96" r="2.6" fill="#2a201c"/>
  <circle cx="226" cy="114" r="7" fill="#3f6f8a"/><path d="M222 120 L218 132 M230 120 L234 132" stroke="#3f6f8a"/>
  <path d="M80 160 L86 98 Q100 86 114 98 L120 160Z" fill="#3f6f8a"/>
  <circle cx="100" cy="78" r="16" fill="#f0c8a8"/>
  <path d="M82 70 Q100 50 118 70 Q120 62 116 58 Q100 44 84 58 Q80 62 82 70Z" fill="#6b4a35"/>
  <path d="M112 104 L160 92" fill="none"/><rect x="156" y="84" width="22" height="14" rx="2" fill="#fbf6ec"/>
  <circle cx="95" cy="78" r="1.8" fill="#2a201c"/><circle cx="105" cy="78" r="1.8" fill="#2a201c"/><path d="M95 86 Q100 90 105 86" fill="none"/>
</g>
<g stroke="#2a201c" stroke-width="2" fill="#faf3e6"><path d="M30 170 C26 150 40 140 52 146 C62 140 72 150 66 170Z"/><path d="M36 148 L34 136 L44 144Z M60 148 L64 136 L54 144Z" fill="#e8863a"/></g>
<circle cx="44" cy="156" r="1.8" fill="#2a201c"/><circle cx="56" cy="156" r="1.8" fill="#2a201c"/>
</svg>`;

export const TOKYO: CityDef = {
  id: 'tokyo',
  name: 'Tokyo',
  palette: TOKYO_PALETTE,
  zones: ['Shibuya Crossing', 'Yokocho Alley', 'Shitamachi', 'Riverside Sakura', 'Neon Night'],
  districts: [
    { name: 'Shibuya Crossing' },
    {
      name: 'Yokocho Alley',
      particles: 'steam',
      palette: { skyTop: 0x3a2a4a, skyHorizon: 0xe88a5a, fog: 0x9a5a4a, sun: 0xffb070, hemiSky: 0xffc890, hemiGround: 0x5a3a2a, road: 0x4a4040, sidewalk: 0x6a5a50, lawn: 0x5a4a40 },
    },
    {
      name: 'Shitamachi',
      palette: { skyTop: 0x8fc6ea, skyHorizon: 0xfbe8c8, fog: 0xf0e0c8, road: 0x6a6a6a, lawn: 0x8fa86a, sidewalk: 0xc8c0b0 },
    },
    {
      name: 'Riverside Sakura',
      particles: 'petals',
      palette: { skyTop: 0xa8d4f0, skyHorizon: 0xfbe0ec, fog: 0xf6dce6, lawn: 0x9fc87a, hemiSky: 0xfff4f8 },
    },
    {
      name: 'Neon Night',
      night: true,
      palette: { skyTop: 0x120a2a, skyHorizon: 0x3a1a5a, fog: 0x2a1846, sun: 0x8a7aff, hemiSky: 0x6a5ac0, hemiGround: 0x201030, road: 0x26203a, stripe: 0x7ae0ff, curb: 0x4a3a6a, sidewalk: 0x3a2e52, lawn: 0x2a2040 },
    },
  ],
  obstacles: OBSTACLES,
  patterns: PATTERNS,
  loot: LOOT,
  dogs: { defs: DOGS, pups: ['akita', 'shiba'], rush: 'shiba' },
  boss: { vehicle: 'keiTruck', throwIds: ['cardboard', 'onigiriToss', 'cardboard', 'onigiriToss'], riderY: 1.55, riderZ: -2.2 },
  music: {
    bpm: 112,
    homeBpm: 88,
    chords: [
      ['F3', 'A3', 'C4', 'E4'],
      ['E3', 'G3', 'B3', 'D4'],
      ['D3', 'F3', 'A3', 'C4'],
      ['G3', 'B3', 'D4', 'F4'],
    ],
    bass: ['F1', 'E1', 'D1', 'G1'],
    leadScale: ['D5', 'E5', 'G5', 'A5', 'C6', 'D6'],
    seed: 112,
    swing: 0.08,
    pad: 'fmPiano',
    lead: 'koto',
    groove: 'citypop',
    nightPad: 'synthPad',
    motif: ['E6', 'C6'],
  },
  unlock: { bestDistance: 6000, coins: 45000, fishBones: 80 },
  map: {
    x: 0.86,
    y: 0.4,
    mood: 'Cherry blossom pink, vending-machine glow',
    hazard: 'Crossing crowds, delivery robots, crows, railway crossings',
    shortcut: 'Vending machine tops, awnings, the elevated track',
    musicName: 'City pop with a koto lead',
  },
  huntWords: ['NEKO', 'SUSHI', 'RAMEN'],
  ambience: ['crossingChime', 'crowCaw', 'trainChime', 'crowd'],
  alley: { name: 'CAT CAFE!', fog: 0xf3d6c8 },
  powerVariants: [{ of: 'magnet', name: 'Bento Box', bonusLoot: 3, sfx: 'pop' }],
  outfitSet: { name: 'Tokyo Street', pieces: ['bucketHat', 'hoodie', 'headphones'], bonus: 0.1 },
  card: CARD,
  postcard: {
    title: 'Ada in Tokyo',
    caption: 'Ada judged the Tokyo dog show. The Shiba won. Duke did not take it well.',
    svg: POSTCARD,
  },
};
