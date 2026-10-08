import { CAT_PASSIVES } from '../data/cats';
import { UPGRADES, UPGRADE_FX, type UpgradeId } from '../data/economy';
import type { PowerUpId } from '../data/powerups';
import { RUNNER } from '../data/runner';
import { WALL_KICK } from '../data/spawner';
import { satchelCapacity, upgradeLevel } from './Economy';
import { setCoinBonus } from './Market';
import type { Profile } from './Save';

/** Everything upgrades, sets and the chosen cat change about a run. */
export interface RunConfig {
  satchelCapacity: number;
  powerLevel: (id: PowerUpId) => number;
  laneSwitchSec: number;
  coyoteSec: number;
  jumpHeight: number;
  maxKicks: number;
  luck: number;
  coinMul: number;
  catDoorMul: number;
  napBonusSec: number;
  startBubble: boolean;
  multiplier: number;
  /** First real run after the tutorial: guaranteed fun (GAME_DESIGN 8.1). */
  firstRun: boolean;
}

export function defaultRunConfig(): RunConfig {
  return {
    satchelCapacity: satchelCapacity(1),
    powerLevel: () => 1,
    laneSwitchSec: RUNNER.laneSwitchSec,
    coyoteSec: UPGRADE_FX.coyoteBaseSec,
    jumpHeight: RUNNER.jumpHeight,
    maxKicks: WALL_KICK.maxChain,
    luck: 1,
    coinMul: 1,
    catDoorMul: 1,
    napBonusSec: 0,
    startBubble: false,
    multiplier: 1,
    firstRun: false,
  };
}

export function computeRunConfig(p: Profile): RunConfig {
  const lvl = (id: UpgradeId) => upgradeLevel(p, id);
  const agility = lvl('agility');
  const spring = lvl('pounceSpring');
  return {
    satchelCapacity: satchelCapacity(lvl('satchel')),
    powerLevel: (id) => (p.upgrades[`power:${id}` as UpgradeId] ?? 1),
    laneSwitchSec: RUNNER.laneSwitchSec * Math.pow(UPGRADE_FX.agilityLaneMul, agility - 1),
    coyoteSec: UPGRADE_FX.coyoteBaseSec + UPGRADE_FX.coyotePerLevel * (agility - 1),
    jumpHeight: RUNNER.jumpHeight * (1 + UPGRADE_FX.jumpPerLevel * (spring - 1)),
    maxKicks: WALL_KICK.maxChain + (spring >= UPGRADES.pounceSpring.max ? 1 : 0),
    luck: 1 + UPGRADE_FX.luckyPerLevel * (lvl('luckyWhiskers') - 1),
    coinMul: setCoinBonus(p) * (p.cat === 'biscuit' ? CAT_PASSIVES.biscuitCoinMul : 1),
    catDoorMul: p.cat === 'noir' ? CAT_PASSIVES.noirCatDoorMul : 1,
    napBonusSec: p.cat === 'sushi' ? CAT_PASSIVES.sushiNapBonusSec : 0,
    startBubble: p.cat === 'pixel',
    multiplier: p.missions.multiplier,
    firstRun: p.flags.tutorialDone && !p.flags.firstRunDone,
  };
}
