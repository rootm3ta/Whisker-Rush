import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import type { CityId } from '../data/cities';
import { LOOT_ITEMS } from '../data/pickups';
import { POWERUP_IDS } from '../data/powerups';
import type { BotSkillId } from '../data/autoplay';
import { computeRunConfig } from '../meta/Loadout';
import { defaultProfile, type Profile } from '../meta/Save';
import { Autopilot } from './Autopilot';
import { RunSession } from './RunSession';

export interface SimRun {
  city: CityId;
  skill: BotSkillId;
  seconds: number;
  distance: number;
  coins: number;
  fishBones: number;
  loot: number;
  lootValue: number;
  /** Obstacle id that ended the run ("timeout" if it survived the cap). */
  cause: string;
  /** Pattern that obstacle came from. */
  pattern: string;
  caught: boolean;
  powerUpSec: number;
  patterns: number;
  /** Placements that repeat a pattern seen in the previous two minutes. */
  repeats: number;
  /** Placements that repeat one of the previous 8 patterns. */
  nearRepeats: number;
}

/** A veteran profile running in a city (all onboarding done), optionally with upgrades. */
export function simProfile(city: CityId): Profile {
  const p = defaultProfile();
  p.flags = { introSeen: true, tutorialDone: true, firstRunDone: true, tomIntroDone: true, freeHatClaimed: true, homeTourDone: true };
  p.city = city;
  return p;
}

/**
 * Runs one game headlessly with the autoplay bot at a fixed 60 Hz step (no revives) and reports
 * how it went. Deterministic for a given seed.
 */
export function simulateRun(city: CityId, skill: BotSkillId, seed: number, maxSec = 600, profile = simProfile(city)): SimRun {
  const bus = new EventBus<GameEvents>();
  const run = new RunSession(bus);
  const bot = new Autopilot(skill, seed * 31 + 7);
  let caught = false;
  bus.on('crash', (c) => (caught = c === 1));
  const placed: { name: string; t: number }[] = [];
  let repeats = 0;
  let nearRepeats = 0;
  let t = 0;
  run.spawner.onPlace = (name) => {
    for (let i = Math.max(0, placed.length - 8); i < placed.length; i++)
      if (placed[i].name === name) {
        nearRepeats++;
        break;
      }
    for (let i = placed.length - 1; i >= 0 && t - placed[i].t <= 120; i--) {
      if (placed[i].name === name) {
        repeats++;
        break;
      }
    }
    placed.push({ name, t });
  };
  const config = computeRunConfig(profile);
  run.reset(seed, profile, 1_800_000_000_000 + seed * 86_400_000, config);
  bot.reset();
  const dt = 1 / 60;
  let power = 0;
  const steps = Math.floor(maxSec / dt);
  for (let i = 0; i < steps; i++) {
    const a = bot.decide(run, dt);
    if (a >= 0) run.handleAction(a);
    run.step(dt);
    t += dt;
    for (const id of POWERUP_IDS)
      if (run.powerUps.isOn(id)) {
        power += dt;
        break;
      }
    if (run.crashed) break;
  }
  let lootValue = 0;
  for (let i = 0; i < run.satchel.count; i++) lootValue += LOOT_ITEMS[run.satchel.at(i)].value;
  const bank = run.takeUnbanked();
  return {
    city,
    skill,
    seconds: t,
    distance: run.runner.distance,
    coins: run.score.coins,
    fishBones: bank.fishBones,
    loot: run.satchel.count,
    lootValue,
    cause: run.crashed ? run.collision.lastHit || (caught ? 'pack' : 'unknown') : 'timeout',
    pattern: run.crashed ? run.collision.lastHitPattern : '',
    caught,
    powerUpSec: power,
    patterns: placed.length,
    repeats,
    nearRepeats,
  };
}
