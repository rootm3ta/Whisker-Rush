/** Economy tables (GAME_DESIGN 6). All prices, ladders, odds and rewards live here. */
import type { PowerUpId } from './powerups';

export type UpgradeId =
  | 'satchel'
  | 'agility'
  | 'pounceSpring'
  | 'luckyWhiskers'
  | `power:${Exclude<PowerUpId, 'zoomies' | 'fishRocket' | 'bubble'>}`;

/** Shared cost ladder for 5-level upgrades. */
export const COST_LADDER = [500, 1500, 4000, 10000, 25000] as const;

export const SATCHEL_LEVELS = [12, 18, 24, 30, 36, 44, 52, 60] as const;
export const SATCHEL_COSTS = [400, 1000, 2500, 5000, 9000, 15000, 24000] as const;

export interface UpgradeDef {
  name: string;
  desc: string;
  /** Max level (level 1 = base, owned by everyone; each cost buys one level). */
  max: number;
  /** Cost to go from level n to n+1 is costs[n-1]. */
  costs: readonly number[];
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  satchel: { name: 'Satchel Size', desc: 'More loot slots per run', max: SATCHEL_LEVELS.length, costs: SATCHEL_COSTS },
  agility: { name: 'Agility', desc: 'Faster lane switch, longer ledge grace', max: 6, costs: COST_LADDER },
  pounceSpring: { name: 'Pounce Spring', desc: 'Higher jumps, +1 wall-kick at max', max: 6, costs: COST_LADDER },
  luckyWhiskers: { name: 'Lucky Whiskers', desc: 'Rare loot shows up more often', max: 6, costs: COST_LADDER },
  'power:magnet': { name: 'Yarn Magnet', desc: '+2 s per level', max: 6, costs: COST_LADDER },
  'power:catnip': { name: 'Catnip Frenzy', desc: '+2 s per level', max: 6, costs: COST_LADDER },
  'power:balloon': { name: 'Balloon Ride', desc: '+2 s per level', max: 6, costs: COST_LADDER },
  'power:box': { name: 'Cardboard Box', desc: '+2 s per level', max: 6, costs: COST_LADDER },
  'power:laser': { name: 'Laser Dot', desc: '+2 s per level', max: 6, costs: COST_LADDER },
  'power:treats': { name: 'x2 Treats', desc: '+2 s per level', max: 6, costs: COST_LADDER },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export const UPGRADE_FX = {
  powerSecPerLevel: 2,
  /** Lane switch time multiplier per agility level above 1. */
  agilityLaneMul: 0.93,
  coyoteBaseSec: 0.08,
  coyotePerLevel: 0.03,
  jumpPerLevel: 0.04,
  luckyPerLevel: 0.15,
} as const;

/** Consumables sold at the Scratching Post ("Head Start stock"). */
export const CONSUMABLES = {
  roomba: { name: 'Roomba', coins: 300 },
  zoomies: { name: 'Zoomies', coins: 750 },
  fishRocket: { name: 'Fish Rocket', coins: 2000 },
} as const;

export const STASH = {
  /** Items kept between runs; overflow auto-sells at base price. */
  capacity: 60,
} as const;

export const MARKET = {
  hotCount: 3,
  coldCount: 2,
  hotMul: [2, 3] as const,
  coldMul: 0.5,
  /** Haggle meter zones from the center (0) to the edge (1) and their bonus. */
  haggleZones: [
    { within: 0.1, bonus: 0.5 },
    { within: 0.25, bonus: 0.3 },
    { within: 0.5, bonus: 0.1 },
  ],
  haggleSwingHz: 0.9,
  secretStockHours: 8,
  secretStockCount: 3,
  /** Coins counted per tick in the Sell All waterfall. */
  waterfallSteps: 30,
} as const;

/** Tom's Secret Stock pool: accessories and consumables. */
export const SECRET_STOCK: readonly { kind: 'accessory' | 'consumable'; id: string; coins?: number; fishBones?: number }[] = [
  { kind: 'accessory', id: 'vikingHelmet', coins: 6000 },
  { kind: 'accessory', id: 'heartGlasses', coins: 3500 },
  { kind: 'accessory', id: 'goldChain', fishBones: 8 },
  { kind: 'accessory', id: 'angelWings', fishBones: 12 },
  { kind: 'accessory', id: 'rainbowTrail', fishBones: 10 },
  { kind: 'accessory', id: 'sombrero', coins: 4500 },
  { kind: 'consumable', id: 'fishRocket', coins: 1500 },
  { kind: 'consumable', id: 'zoomies', coins: 500 },
  { kind: 'consumable', id: 'roomba', coins: 200 },
];

/** Collection Sets: trade a full set to Old Tom for an exclusive reward and +2% coins forever. */
export const SETS = [
  { id: 'junkDrawer', name: 'Junk Drawer', items: ['bottleCap', 'rubberBand', 'lostButton', 'sock'], reward: { kind: 'accessory', id: 'tailRing' } },
  { id: 'toyBox', name: 'Toy Box', items: ['toyMouse', 'feather', 'goldenMouse'], reward: { kind: 'accessory', id: 'crown' } },
  { id: 'fancyThings', name: 'Fancy Things', items: ['shinySpoon', 'silverBell', 'lostEarring', 'grandmasBrooch'], reward: { kind: 'cat', id: 'mittens' } },
  { id: 'dukesStuff', name: "Duke's Stuff", items: ['dukesSunglasses', 'postcardFragment', 'vintageStamp'], reward: { kind: 'accessory', id: 'aviators' } },
  // City sets: their bonus applies only in that city.
  { id: 'shrineVisit', name: 'Shrine Visit', items: ['omamori', 'emaPlaque', 'templeBell', 'fortuneSlip'], reward: { kind: 'accessory', id: 'headphones' }, city: 'tokyo', cityBonus: 0.03 },
  { id: 'supraTable', name: 'Supra Table', items: ['khinkali', 'hornCup', 'tonisPuri', 'qvevriShard'], reward: { kind: 'accessory', id: 'hornCharm' }, city: 'tbilisi', cityBonus: 0.03 },
] as const;

export const SET_COIN_BONUS = 0.02;

/** Catnip Crate (mystery box). Odds are always shown to the player. */
export const CRATE = [
  { id: 'coins', label: '500 coins', weight: 40, coins: 500 },
  { id: 'fishBones', label: '3 Fish Bones', weight: 20, fishBones: 3 },
  { id: 'roomba', label: '2 Roombas', weight: 20, roomba: 2 },
  { id: 'zoomies', label: '1 Zoomies', weight: 10, zoomies: 1 },
  { id: 'accessory', label: 'Random accessory', weight: 10 },
] as const;

/** 7-day login calendar; day 7 is a Catnip Crate. */
export const LOGIN = [
  { coins: 100 },
  { coins: 200 },
  { roomba: 1 },
  { coins: 400 },
  { fishBones: 1 },
  { coins: 800, zoomies: 1 },
  { crate: 1 },
] as const;

export const STREAK = { days: 3, reward: { kind: 'accessory', id: 'sparkleTrail' } } as const;
export const COMEBACK = { awayDays: 3, coins: 300 } as const;

/** Paw Pass season 1: 30 tiers on the free track. */
export const PASS = {
  season: 'Maple Lane Rumble',
  tiers: 30,
  stampsPerTier: 10,
  stamps: { per250m: 1, mission: 5, missionSet: 10, challenge: 3, login: 2 },
} as const;

export type Reward = { coins?: number; fishBones?: number; roomba?: number; zoomies?: number; fishRocket?: number; accessory?: string; cat?: string; crate?: number };

export function passReward(tier: number): Reward {
  if (tier === 30) return { cat: 'pixel' };
  if (tier === 10) return { accessory: 'musicTrail' };
  if (tier === 20) return { accessory: 'jetpack' };
  if (tier === 25) return { crate: 1 };
  if (tier % 5 === 0) return { fishBones: 2 };
  if (tier % 3 === 0) return { roomba: 1 };
  return { coins: 100 + tier * 20 };
}

export type MissionStat =
  | 'distance'
  | 'coins'
  | 'wallKicks'
  | 'nearMisses'
  | 'grindMeters'
  | 'jumps'
  | 'slides'
  | 'powerUps'
  | 'lootItems'
  | 'socksSold'
  | 'itemsSold'
  | 'bossWins'
  | 'packEscapes'
  | 'runs';

export interface MissionDef {
  id: string;
  text: string;
  stat: MissionStat;
  target: number;
  /** 'run' = in a single run; 'total' = accumulated across runs. */
  scope: 'run' | 'total';
}

export const MISSIONS: readonly MissionDef[] = [
  { id: 'kick15', text: 'Wall-kick {n} times', stat: 'wallKicks', target: 15, scope: 'total' },
  { id: 'socks10', text: 'Sell {n} socks', stat: 'socksSold', target: 10, scope: 'total' },
  { id: 'grind200', text: 'Grind {n} m of clotheslines in one run', stat: 'grindMeters', target: 200, scope: 'run' },
  { id: 'run1500', text: 'Run {n} m in one run', stat: 'distance', target: 1500, scope: 'run' },
  { id: 'coins500', text: 'Collect {n} coins in one run', stat: 'coins', target: 500, scope: 'run' },
  { id: 'miss20', text: 'Get {n} near misses', stat: 'nearMisses', target: 20, scope: 'total' },
  { id: 'jump100', text: 'Jump {n} times', stat: 'jumps', target: 100, scope: 'total' },
  { id: 'slide60', text: 'Slide {n} times', stat: 'slides', target: 60, scope: 'total' },
  { id: 'power8', text: 'Grab {n} power-ups', stat: 'powerUps', target: 8, scope: 'total' },
  { id: 'loot25', text: 'Bag {n} loot items', stat: 'lootItems', target: 25, scope: 'total' },
  { id: 'sell30', text: 'Sell {n} items to Old Tom', stat: 'itemsSold', target: 30, scope: 'total' },
  { id: 'rush1', text: 'Escape a Pack Rush', stat: 'packEscapes', target: 1, scope: 'total' },
  { id: 'boss1', text: 'Beat Duke in a Boss Chase', stat: 'bossWins', target: 1, scope: 'total' },
  { id: 'runs10', text: 'Play {n} runs', stat: 'runs', target: 10, scope: 'total' },
];

export const MISSION_SET = {
  size: 3,
  /** Targets grow by this fraction per completed set. */
  growth: 0.25,
  maxMultiplier: 30,
  reward: { coins: 500, crate: 1 } as Reward,
} as const;

export const CHALLENGES: readonly MissionDef[] = [
  { id: 'd-run800', text: 'Run {n} m in one run', stat: 'distance', target: 800, scope: 'run' },
  { id: 'd-coins200', text: 'Collect {n} coins in one run', stat: 'coins', target: 200, scope: 'run' },
  { id: 'd-kick5', text: 'Wall-kick {n} times', stat: 'wallKicks', target: 5, scope: 'total' },
  { id: 'd-miss6', text: 'Get {n} near misses', stat: 'nearMisses', target: 6, scope: 'total' },
  { id: 'd-sell8', text: 'Sell {n} items', stat: 'itemsSold', target: 8, scope: 'total' },
  { id: 'd-jump30', text: 'Jump {n} times', stat: 'jumps', target: 30, scope: 'total' },
  { id: 'd-power3', text: 'Grab {n} power-ups', stat: 'powerUps', target: 3, scope: 'total' },
  { id: 'd-grind60', text: 'Grind {n} m in one run', stat: 'grindMeters', target: 60, scope: 'run' },
];

export const CHALLENGE = { perDay: 3, fishBones: 1 } as const;
