import type { DogDef } from '../dogs';
import type { ObstacleDef } from '../obstacles';
import { base } from '../obstacleBase';
import { arc, bell, C, coins, L, line, loot, o, power, R, type Pattern } from '../patterns';
import type { LootItem } from '../pickups';
import type { BasePalette, CityDef } from './types';

/** Tbilisi: carved wooden balconies, sulfur bath domes, sunset over the Mtkvari. */
export const TBILISI_PALETTE = {
  skyTop: 0x6a9ed8,
  skyHorizon: 0xf8d8b0,
  fog: 0xf0d6b8,
  sun: 0xffe2b8,
  hemiSky: 0xfff0dc,
  hemiGround: 0xa08a70,
  road: 0x7a6e64,
  stripe: 0xe8dcc4,
  curb: 0xb8a890,
  sidewalk: 0xa89880,
  lawn: 0xb8a888,
  cobble: 0x6a5e54,
  walls: [0xf3e2c4, 0xe8c4a0, 0xd8b8d0, 0xc8d8c0, 0xf0d0a0, 0xe0a890],
  balcony: [0x3f9a9a, 0x5ab0b0, 0xfbf6ec, 0x7a5a3a],
  roof: 0x8a5a4a,
  brick: 0xc0704a,
  stone: 0xc8b49a,
  river: 0x6a9a9a,
  vine: [0x5f9a4f, 0x6fae5c],
  ladas: [0xe8e0d0, 0x9fc0d8, 0xd9a441, 0xc8483a, 0x6a8a6a],
  marshrutka: 0xf2c84a,
  gold: 0xe8b84a,
  plane: [0x6a9a4a, 0x7aaa5a],
  steel: 0xe8eef2,
  glass: 0x9fd0e8,
} satisfies BasePalette & Record<string, unknown>;

const BALC = 2.4;
const DOME = 1.6;
const MARSH = 2.4;

const OBSTACLES: Record<string, ObstacleDef> = {
  // Yellow marshrutka minibuses pull in and out of lanes. Its roof is a ride.
  marshrutka: { ...base, length: 5, halfWidth: 1.1, body: [0, MARSH], top: MARSH, lethal: true, kickable: true, weaves: true, warn: 'horn', capacity: 6 },
  // Wine barrels roll down the Old Town slope toward you: jump them.
  wineBarrel: { ...base, length: 0.9, halfWidth: 0.8, body: [0, 0.9], rolls: -6, warn: 'rumble', capacity: 10 },
  // Churchkhela strings hanging from a stall beam: slide under.
  churchkhela: { ...base, length: 0.6, halfWidth: 1.3, body: [0.85, 2.4], capacity: 8 },
  // A baker crossing with a tray of tonis puri.
  tonisTray: { ...base, length: 1.0, halfWidth: 0.9, body: [0, 1.8], weaves: true, capacity: 6 },
  pothole: { ...base, length: 1.2, halfWidth: 1.0, body: [0, 0.3], capacity: 8 },
  cellarDoor: { ...base, length: 1.4, halfWidth: 1.0, body: [0, 0.55], capacity: 8 },
  rooster: { ...base, length: 0.6, halfWidth: 0.6, body: [0, 0.7], weaves: true, warn: 'caw', capacity: 6 },
  // Sulfur bath vents puff steam: change lanes.
  steamVent: { ...base, length: 1.2, halfWidth: 1.1, body: [0, 2.2], warn: 'steam', capacity: 6 },
  // Carved wooden balconies: the signature high layer, short sections to hop between.
  balconyRun: { ...base, length: 5, halfWidth: 1.4, body: null, top: BALC, capacity: 12 },
  bathDome: { ...base, length: 4, halfWidth: 1.3, body: [0, DOME], top: DOME, kickable: true, capacity: 6 },
  oldWall: { ...base, length: 10, halfWidth: 1.2, body: [0, 2.2], top: 2.2, lethal: true, kickable: true, capacity: 8 },
  catDoorTbilisi: { ...base, length: 10, halfWidth: 1.2, body: [0, 2.2], top: 2.2, lethal: true, kickable: true, capacity: 2, catDoor: true },
  marketTable: { ...base, length: 1.6, halfWidth: 1.1, body: [0, 0.9], top: 0.9, lethal: true, capacity: 10 },
  // What Duke throws from his marshrutka.
  khinkaliToss: { ...base, length: 0.8, halfWidth: 0.8, body: [0, 0.7], capacity: 10 },
  churchkhelaToss: { ...base, length: 1.0, halfWidth: 0.9, body: [0, 0.6], lethal: true, capacity: 10 },
};

const LOOT: LootItem[] = [
  { city: 'tbilisi', id: 'churchkhelaLoot', name: 'Churchkhela', rarity: 0, value: 6 },
  { city: 'tbilisi', id: 'khinkali', name: 'Khinkali', rarity: 0, value: 7 },
  { city: 'tbilisi', id: 'tonisPuri', name: 'Tonis Puri', rarity: 0, value: 6 },
  { city: 'tbilisi', id: 'mineralWater', name: 'Mineral Water Bottle', rarity: 0, value: 5 },
  { city: 'tbilisi', id: 'hornCup', name: 'Horn Cup (Kantsi)', rarity: 1, value: 30 },
  { city: 'tbilisi', id: 'mkhedruliTile', name: 'Mkhedruli Letter Tile', rarity: 1, value: 26 },
  { city: 'tbilisi', id: 'enamelPin', name: 'Enamel Pin', rarity: 1, value: 24 },
  { city: 'tbilisi', id: 'qvevriShard', name: 'Qvevri Shard', rarity: 2, value: 130 },
  { city: 'tbilisi', id: 'carvedBalcony', name: 'Carved Balcony Piece', rarity: 3, value: 540 },
  { city: 'tbilisi', id: 'goldenQvevri', name: 'Golden Qvevri', rarity: 4, value: 1450 },
  { city: 'tbilisi', id: 'postcardTbilisi', name: 'Postcard Fragment (Tbilisi)', rarity: 4, value: 1000 },
];

const OLD_TOWN = 0;
const BATHS = 1;
const BRIDGE = 2;
const MARKET = 3;
const RUSTAVELI = 4;

const PATTERNS: Pattern[] = [
  // Anywhere.
  { name: 'g-marshrutka', tier: 1, weight: 1, length: 32, entries: [o('marshrutka', C, 24), coins(L, 4, 6), loot(R, 18)] },
  { name: 'g-potholes', tier: 1, weight: 1, length: 26, entries: [o('pothole', L, 10), o('cellarDoor', C, 16), o('pothole', R, 22), arc(C, 12, 5, 8)] },
  { name: 'g-rooster', tier: 1, weight: 0.8, length: 24, entries: [o('rooster', C, 16), coins(L, 2, 8), coins(R, 10, 4)] },
  { name: 'g-baker', tier: 1, weight: 0.9, length: 28, entries: [o('tonisTray', C, 18), o('churchkhela', L, 10), coins(R, 4, 8)] },
  // Balcony hopping: short balconies with gaps, reached from a marshrutka roof or a wall-kick.
  { name: 'g-balcony-hop', tier: 2, weight: 1.2, length: 40, entries: [o('marketTable', C, 4), o('balconyRun', C, 8), o('balconyRun', C, 15.5), o('balconyRun', C, 23), coins(C, 9, 3, BALC, 1.6), coins(C, 16.5, 3, BALC, 1.6), coins(C, 24, 3, BALC, 1.6), bell(C, 26, BALC + 0.4), o('cellarDoor', L, 20)] },
  { name: 'g-balcony-zigzag', tier: 3, weight: 1, length: 44, entries: [o('oldWall', L, 2), o('balconyRun', L, 12), o('balconyRun', C, 19), o('balconyRun', R, 26), coins(L, 13, 3, BALC, 1.6), coins(C, 20, 3, BALC, 1.6), coins(R, 27, 3, BALC, 1.6), o('marshrutka', C, 34), bell(R, 29, BALC + 0.4)] },
  { name: 'cat-door-tbilisi', tier: 2, weight: 0.12, length: 20, entries: [o('catDoorTbilisi', L, 4), o('pothole', C, 12), arc(C, 8, 5, 8)] },
  // Old Town (Kala): barrels rolling down the slope, laundry lines.
  { name: 'g-barrels', tier: 1, weight: 1.3, length: 30, districts: [OLD_TOWN], entries: [o('wineBarrel', L, 22), o('wineBarrel', R, 28), coins(C, 4, 8), bell(C, 16, BALC)] },
  { name: 'g-kala-lines', tier: 2, weight: 1, length: 32, districts: [OLD_TOWN], entries: [line(L, 4, 18, 4), o('wineBarrel', C, 26), o('balconyRun', R, 6), coins(R, 7, 3, BALC, 1.6)] },
  // Abanotubani: bath domes, steam vents, the cable car.
  { name: 'g-domes', tier: 1, weight: 1.2, length: 30, districts: [BATHS], entries: [o('bathDome', C, 10), coins(C, 11, 3, DOME, 1.2), o('steamVent', L, 18), coins(R, 4, 8), bell(C, 12, DOME + 0.4)] },
  { name: 'g-cable-car', tier: 2, weight: 0.45, length: 30, districts: [BATHS], entries: [o('bathDome', L, 8), o('steamVent', R, 14), power('fishRocket', C, 20, 1.0), coins(C, 4, 6)] },
  { name: 'g-steam-maze', tier: 3, weight: 1, length: 36, districts: [BATHS], entries: [o('steamVent', L, 8), o('steamVent', R, 16), o('steamVent', C, 26), o('bathDome', L, 22), coins(L, 23, 3, DOME, 1.2), bell(L, 24, DOME + 0.4)] },
  // Bridge of Peace: an open curving deck; marshrutkas and bakers crossing.
  { name: 'g-bridge', tier: 1, weight: 1.2, length: 30, districts: [BRIDGE], entries: [o('tonisTray', L, 14), o('rooster', R, 22), arc(C, 6, 6, 10), coins(C, 18, 6)] },
  { name: 'g-bridge-rush', tier: 2, weight: 1, length: 34, districts: [BRIDGE, RUSTAVELI], entries: [o('marshrutka', L, 20), o('marshrutka', R, 30), o('pothole', C, 10), coins(C, 2, 6)] },
  // Dry Bridge Market.
  { name: 'g-market', tier: 1, weight: 1.2, length: 30, districts: [MARKET], entries: [o('marketTable', L, 8), o('marketTable', R, 14), o('churchkhela', C, 20), coins(C, 4, 5), loot(L, 8, 1.3)] },
  { name: 'g-market-run', tier: 3, weight: 1, length: 38, districts: [MARKET], entries: [o('marketTable', C, 6), coins(C, 6.2, 2, 1.3, 1.2), o('churchkhela', L, 14), o('churchkhela', R, 14), o('tonisTray', C, 24), o('marketTable', L, 30), bell(C, 8, 1.6)] },
  // Rustaveli Avenue at night.
  { name: 'g-rustaveli', tier: 1, weight: 1.2, length: 30, districts: [RUSTAVELI], entries: [o('marshrutka', C, 24), o('pothole', L, 12), coins(R, 2, 10), bell(L, 20, MARSH + 0.4)] },
  { name: 'g-avenue', tier: 3, weight: 1, length: 40, districts: [RUSTAVELI], entries: [o('marshrutka', L, 14), o('marshrutka', C, 24), o('marshrutka', R, 34), o('cellarDoor', R, 8), coins(L, 15, 3, MARSH, 1.6)] },
];

/** Nagazi shepherds lunge and run the rush (slow, but they block a lane). */
const DOGS: Record<string, DogDef> = {};

const CARD = `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="tbs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a9ed8"/><stop offset="1" stop-color="#f8d8b0"/></linearGradient></defs>
<rect width="320" height="180" fill="url(#tbs)"/>
<path d="M0 70 L40 52 L70 60 L110 40 L150 56 L200 36 L240 50 L320 44 V100 H0Z" fill="#a8906a"/>
<g fill="#c8b49a" stroke="#2a201c" stroke-width="1.5"><rect x="150" y="30" width="10" height="20"/><rect x="186" y="24" width="10" height="20"/><path d="M140 50 H210 V58 H140Z"/></g>
<path d="M260 20 L262 46 L258 46Z" fill="#dfe6ee"/><circle cx="260" cy="19" r="3" fill="#dfe6ee"/>
<line x1="0" y1="34" x2="320" y2="64" stroke="#2a2a30" stroke-width="1.5"/>
<g stroke="#2a201c" stroke-width="1.5"><rect x="96" y="44" width="16" height="14" fill="#d9483b"/><line x1="104" y1="44" x2="104" y2="38"/></g>
<g stroke="#2a201c" stroke-width="2">
${[0, 1, 2, 3].map((i) => `<rect x="${i * 80 + 4}" y="96" width="72" height="84" fill="${['#f3e2c4', '#e8c4a0', '#d8b8d0', '#c8d8c0'][i]}"/><rect x="${i * 80 + 10}" y="112" width="60" height="18" fill="#3f9a9a"/>${[0, 1, 2, 3, 4].map((k) => `<line x1="${i * 80 + 14 + k * 12}" y1="112" x2="${i * 80 + 14 + k * 12}" y2="130"/>`).join('')}<rect x="${i * 80 + 30}" y="140" width="18" height="40" fill="#7a5a3a"/>`).join('')}
</g>
<path d="M0 170 Q80 160 160 172 T320 166 V180 H0Z" fill="#6a9a9a"/>
</svg>`;

const POSTCARD = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
<rect width="320" height="200" fill="#f8e4c8"/>
<g stroke="#2a201c" stroke-width="2.4" stroke-linejoin="round">
  <rect x="20" y="120" width="280" height="22" fill="#fbf6ec"/>
  <rect x="34" y="142" width="10" height="50" fill="#7a5a3a"/><rect x="276" y="142" width="10" height="50" fill="#7a5a3a"/>
  <ellipse cx="80" cy="116" rx="26" ry="8" fill="#e8dcc4"/><circle cx="70" cy="110" r="7" fill="#f3e6cf"/><circle cx="84" cy="108" r="7" fill="#f3e6cf"/><circle cx="94" cy="112" r="7" fill="#f3e6cf"/>
  <rect x="210" y="98" width="20" height="22" fill="#c8483a"/><rect x="236" y="104" width="30" height="16" fill="#e8b84a"/>
  <path d="M130 120 L136 60 Q150 48 164 60 L170 120Z" fill="#8a2a4a"/>
  <circle cx="150" cy="40" r="16" fill="#f0c8a8"/>
  <path d="M132 34 Q150 14 168 34 Q170 26 166 22 Q150 8 134 22 Q130 26 132 34Z" fill="#6b4a35"/>
  <circle cx="145" cy="40" r="1.8" fill="#2a201c"/><circle cx="155" cy="40" r="1.8" fill="#2a201c"/><path d="M144 47 Q150 52 156 47" fill="none"/>
  <path d="M166 66 L186 30" fill="none"/><path d="M180 34 Q196 18 204 30 Q196 40 186 38Z" fill="#c8a46e"/>
  <path d="M60 196 C54 172 72 160 88 168 C102 160 116 172 110 196Z" fill="#f0e6d6"/>
  <path d="M66 172 L62 160 L74 168Z M104 172 L108 160 L96 168Z" fill="#c9b49a"/>
  <circle cx="80" cy="180" r="1.8" fill="#2a201c"/><circle cx="92" cy="180" r="1.8" fill="#2a201c"/>
</g>
<text x="160" y="16" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="13" fill="#8a2a4a">GAUMARJOS!</text>
</svg>`;

export const TBILISI: CityDef = {
  id: 'tbilisi',
  name: 'Tbilisi',
  palette: TBILISI_PALETTE,
  zones: ['Old Town (Kala)', 'Abanotubani', 'Bridge of Peace', 'Dry Bridge Market', 'Rustaveli Avenue'],
  districts: [
    { name: 'Old Town (Kala)', curveDown: 1.9 },
    { name: 'Abanotubani', particles: 'steam', palette: { skyHorizon: 0xf6c8a0, fog: 0xead0b8, road: 0x8a7464 } },
    { name: 'Bridge of Peace', curveSide: 5, palette: { skyTop: 0x5a8ed0, skyHorizon: 0xf8c8a0, lawn: 0x6a9a9a, sidewalk: 0xd8dce0, curb: 0xe8eef2 } },
    { name: 'Dry Bridge Market', particles: 'leaves', palette: { skyHorizon: 0xf0d0a0, lawn: 0xa89070 } },
    {
      name: 'Rustaveli Avenue',
      night: true,
      palette: { skyTop: 0x1a1e40, skyHorizon: 0x5a4a70, fog: 0x3a3450, sun: 0xffd08a, hemiSky: 0x8a80b0, hemiGround: 0x2a2030, road: 0x3a3440, sidewalk: 0x5a5060, lawn: 0x3a3a40 },
    },
  ],
  obstacles: OBSTACLES,
  patterns: PATTERNS,
  loot: LOOT,
  dogs: { defs: DOGS, pups: ['nagazi', 'nagazi'], rush: 'nagazi' },
  boss: { vehicle: 'marshrutka', throwIds: ['khinkaliToss', 'churchkhelaToss', 'khinkaliToss', 'wineBarrel'], riderY: 1.15, riderZ: -0.9 },
  music: {
    bpm: 104,
    homeBpm: 86,
    fastBpm: 126,
    chords: [
      ['D3', 'A3', 'D4'],
      ['C3', 'G3', 'C4'],
      ['F3', 'C4', 'F4'],
      ['A2', 'E3', 'A3'],
    ],
    bass: ['D2', 'C2', 'F2', 'A1'],
    leadScale: ['D5', 'E5', 'F5', 'G5', 'A5', 'C6'],
    seed: 104,
    swing: 0.12,
    pad: 'choir',
    lead: 'panduri',
    groove: 'doli',
  },
  unlock: { bestDistance: 8000, coins: 60000, fishBones: 110 },
  map: {
    x: 0.66,
    y: 0.38,
    mood: 'Carved wooden balconies, sulfur bath domes, sunset',
    hazard: 'Marshrutkas, rolling wine barrels, churchkhela strings, bath steam',
    shortcut: 'Balcony hopping, bath domes, the cable car',
    musicName: 'Polyphonic choir, panduri and doli',
  },
  huntWords: ['KHINKALI', 'GAUMARJOS', 'SUPRA'],
  ambience: ['river', 'churchBells', 'horn', 'cableHum'],
  alley: { name: 'ITALIAN COURTYARD!', fog: 0xf6e2c4 },
  powerVariants: [
    { of: 'catnip', name: 'Supra Feast', sfx: 'toast' },
    { of: 'fishRocket', name: 'Cable Car' },
  ],
  streetPals: true,
  outfitSet: { name: 'Tbilisoba', pieces: ['svanHat', 'chokha', 'hornCharm'], bonus: 0.1 },
  card: CARD,
  postcard: {
    title: 'Ada in Tbilisi',
    caption: 'A supra for the judges. Ada raised a horn cup: gaumarjos! A Georgian Shepherd puppy slept on her feet.',
    svg: POSTCARD,
  },
};
