import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Action } from '../core/Input';
import { ABILITY } from '../data/abilities';
import { BOSS } from '../data/boss';
import { REVIVE } from '../data/chase';
import { POWERUP_IDS, POWERUP_SPAWN, type PowerUpId } from '../data/powerups';
import { FIRST_RUN } from '../data/tutorial';
import { SPAWNER } from '../data/spawner';
import type { Profile } from '../meta/Save';
import { Satchel } from '../meta/Satchel';
import { Abilities } from './Abilities';
import { Boss, BossPhase } from './Boss';
import { Chase } from './Chase';
import { Collision } from './Collision';
import { Field, PickupKind } from './Field';
import { Modifiers } from './Modifiers';
import { PowerUps } from './PowerUps';
import { ReviveTracker, type ReviveOption } from './Revive';
import { Runner } from './Runner';
import { Score } from './Score';
import { ScoreKeeper } from './ScoreKeeper';
import { rollLootAtLeast, Secrets } from './Secrets';
import { Spawner } from './Spawner';
import { Hazards } from './Hazards';
import { rollLootItem } from './Spawner';
import { LANES } from '../data/runner';
import { LOOT, LOOT_ITEMS } from '../data/pickups';
import { OBSTACLES } from '../data/obstacles';
import { CITIES } from '../data/cities';
import type { Rarity } from '../data/pickups';
import { Rng } from '../core/Rng';
import { defaultRunConfig, type RunConfig } from '../meta/Loadout';
import { RunStatsCollector } from './RunStats';

/** One run's simulation: runner, field, collisions, chase, power-ups, abilities, secrets, boss. No rendering. */
export class RunSession {
  readonly field = new Field();
  readonly mods = new Modifiers();
  readonly runner: Runner;
  readonly spawner = new Spawner(this.field);
  readonly satchel = new Satchel();
  readonly score = new Score();
  readonly collision: Collision;
  readonly keeper: ScoreKeeper;
  readonly chase: Chase;
  readonly revives = new ReviveTracker();
  readonly powerUps: PowerUps;
  readonly abilities: Abilities;
  readonly secrets: Secrets;
  readonly boss: Boss;
  readonly hazards = new Hazards();
  /** True when the last crash was a catch (second stumble), false for a head-on crash. */
  caught = false;
  readonly stats: RunStatsCollector;
  config: RunConfig = defaultRunConfig();
  /** Extra speed multiplier (the tutorial runs slow). */
  slowMul = 1;
  private bankedCoins = 0;
  private bankedBones = 0;
  private wasBoss = false;
  private readonly rng = new Rng(555);

  constructor(private readonly bus: EventBus<GameEvents>) {
    this.hazards.bus = bus;
    this.runner = new Runner(bus, this.field);
    this.collision = new Collision(bus, this.field, this.satchel, this.mods);
    this.keeper = new ScoreKeeper(bus, this.score);
    this.chase = new Chase(bus, () => this.collision.externalStumble(this.runner));
    this.powerUps = new PowerUps(bus, this.mods);
    this.abilities = new Abilities(bus);
    this.secrets = new Secrets(bus);
    this.boss = new Boss(bus);
    this.stats = new RunStatsCollector(bus);
    this.spawner.hooks = this.secrets;
    this.collision.onSpecialPickup = this.onSpecialPickup;
    bus.on('nearMiss', () => this.keeper.nearMiss());
    bus.on('crash', (c) => (this.caught = c === 1));
    bus.on('catDoor', () => {
      this.secrets.enterAlley(this.runner, this.field);
      this.spawner.paused = true;
    });
  }

  get crashed(): boolean {
    return this.collision.crashed;
  }

  get napping(): boolean {
    return this.abilities.napping;
  }

  reset(seed?: number, profile: Profile | null = null, now = Date.now(), config: RunConfig = defaultRunConfig()): void {
    this.config = config;
    this.spawner.setCity(config.city);
    this.boss.throwIds = CITIES[config.city].boss.throwIds;
    this.runner.reset();
    this.runner.configure(config.laneSwitchSec, config.jumpHeight, config.coyoteSec, config.maxKicks);
    this.field.reset();
    this.spawner.reset(seed);
    this.satchel.clear();
    this.satchel.capacity = config.satchelCapacity;
    this.score.reset(config.multiplier);
    this.collision.reset();
    this.keeper.reset();
    this.chase.reset();
    this.revives.reset();
    this.powerUps.reset();
    this.powerUps.levelOf = config.powerLevel;
    if (config.startBubble) this.powerUps.bubble = true;
    this.abilities.reset(profile?.ability ?? ABILITY.default);
    this.abilities.napBonusSec = config.napBonusSec;
    this.spawner.luck = config.luck * (config.firstRun ? FIRST_RUN.luck : 1);
    this.spawner.gapLoot = config.firstRun && FIRST_RUN.gapLoot;
    this.slowMul = 1;
    this.spawner.catDoorMul = config.catDoorMul;
    this.stats.reset();
    this.secrets.reset(profile, now, config.city);
    this.boss.reset();
    this.mods.clear();
    this.caught = false;
    this.bankedCoins = 0;
    this.bankedBones = 0;
    this.wasBoss = false;
    this.spawner.update(0, this.runner.speed);
    if (config.firstRun) {
      // Guaranteed fun: a Yarn Magnet early, then Catnip Frenzy.
      this.field.addPickup(PickupKind.PowerUp, POWERUP_IDS.indexOf('magnet'), 0, FIRST_RUN.magnetAt, POWERUP_SPAWN.y);
      this.field.addPickup(PickupKind.PowerUp, POWERUP_IDS.indexOf('catnip'), 0, FIRST_RUN.catnipAt, POWERUP_SPAWN.y);
    }
  }

  /** Currency earned since the last bank call (so revives can spend Fish Bones found this run). */
  takeUnbanked(): { coins: number; fishBones: number } {
    const coins = this.score.coins - this.bankedCoins;
    const fishBones = this.score.fishBones - this.bankedBones;
    this.bankedCoins = this.score.coins;
    this.bankedBones = this.score.fishBones;
    return { coins, fishBones };
  }

  nextRevive(): ReviveOption {
    return this.revives.next();
  }

  /** Clears the way, grants invulnerability and sends the pack back. */
  revive(kind: ReviveOption['kind']): void {
    this.revives.use(kind);
    const r = this.runner;
    r.revive();
    this.field.clearObstacles(r.distance - 2, r.distance + REVIVE.clearAheadM);
    this.collision.revive(REVIVE.invulnSec);
    this.chase.backOff(r.time);
    this.caught = false;
    this.bus.emit('revive', this.revives.total);
  }

  /** Start boosts (Zoomies, Fish Rocket) and power-ups from debug or Mystery Fish. */
  activatePowerUp(id: PowerUpId): void {
    this.powerUps.activate(id);
  }

  startRoomba(): boolean {
    return this.powerUps.startRoomba();
  }

  activateAbility(): boolean {
    return this.abilities.activate(this.runner, this.chase, this.collision, this.boss.active);
  }

  /** Buffer handler for movement actions during a run. */
  readonly handleAction = (a: number): boolean => {
    const moving = a === Action.Left || a === Action.Right || a === Action.Up || a === Action.Down;
    if (!moving || this.napping) return true;
    // Threat is measured at the pre-swipe pose; it arms only if the swipe applied.
    const threat = this.collision.findThreat(this.runner);
    const consumed = this.runner.tryAction(a);
    if (consumed && threat) threat.armed = true;
    return consumed;
  };

  private readonly onSpecialPickup = (kind: number, item: number): void => {
    const s = this.secrets;
    switch (kind) {
      case PickupKind.PowerUp:
        this.powerUps.activate(POWERUP_IDS[item]);
        break;
      case PickupKind.Mystery:
        s.mysteryFish(this.powerUps, this.runner, this.score);
        break;
      case PickupKind.Bell:
        s.collectBell(item);
        break;
      case PickupKind.Letter:
        s.collectLetter(item);
        break;
      case PickupKind.Chest: {
        this.score.coins += BOSS.chestCoins;
        this.score.fishBones += BOSS.chestFishBones;
        const loot = rollLootAtLeast(this.rng, this.runner.distance, BOSS.chestMinRarity as Rarity, this.config.city);
        if (this.satchel.add(loot)) this.bus.emit('loot', loot);
        this.bus.emit('chest', 0);
        break;
      }
    }
  };

  /** City power-up variants (Bento Box): drop loot items into the lanes ahead. */
  dropLootAhead(n: number): void {
    const r = this.runner;
    for (let k = 0; k < n; k++) {
      const item = rollLootItem(this.rng, r.distance, this.config.luck, this.config.city);
      this.field.addPickup(PickupKind.Loot, item, ((k % 3) - 1) * LANES.width, r.distance + 18 + k * 7, LOOT.y);
    }
  }

  // ---- Debug forcing (debug menu only) ----------------------------------------------------

  /** Puts an obstacle `ahead` metres in front of the cat in a lane (-1..1, or a side track). */
  debugObstacle(id: string, lane = 0, ahead = 45): void {
    const def = OBSTACLES[id];
    if (!def) return;
    const tints = def.tints;
    this.field.addObstacle(id, lane * LANES.width, this.runner.distance + ahead, def.length, tints ? tints[0] : 0xffffff);
  }

  debugLoot(item: string): void {
    const i = LOOT_ITEMS.findIndex((l) => l.id === item);
    if (i >= 0) this.field.addPickup(PickupKind.Loot, i, 0, this.runner.distance + 25, LOOT.y);
  }

  debugBell(): void {
    const id = this.secrets.nextBell();
    if (id >= 0) {
      this.secrets.markBellSpawned(id);
      this.field.addPickup(PickupKind.Bell, id, 0, this.runner.distance + 25, 1.2);
    }
  }

  debugBoss(): void {
    this.boss.forceSoon(this.runner.distance);
  }

  debugRush(): void {
    this.chase.startRush(6, this.runner.lane);
  }

  debugAlley(): void {
    this.bus.emit('catDoor', 0);
    this.secrets.enterAlley(this.runner, this.field);
  }

  step(dt: number): void {
    if (this.collision.crashed) return;
    const r = this.runner;
    if (this.abilities.stepNap(dt, r, this.field, this.collision) || this.napping) return;

    this.mods.clear();
    this.powerUps.step(dt, r, this.field, this.chase, this.collision);
    this.abilities.step(dt, r, this.mods);
    r.speedMul = this.mods.speedMul * this.slowMul;
    this.score.tempMul = this.mods.scoreMul;
    this.keeper.coinMul = this.mods.coinMul * this.secrets.coinBonus * this.config.coinMul;

    const alleyEnded = this.secrets.stepAlley(dt, r, this.field);
    this.boss.step(dt, r, this.field, this.secrets.inAlley || r.flying);
    const bossNow = this.boss.active && this.boss.phase !== BossPhase.Swerve;
    if (bossNow) this.spawner.paused = true;
    if ((this.wasBoss && !bossNow) || alleyEnded) this.spawner.resumeAt(r.distance + SPAWNER.minGapM * 3);
    this.wasBoss = bossNow;

    this.spawner.update(r.distance, r.speed);
    this.hazards.step(dt, r, this.field);
    r.step(dt);
    this.collision.step(r, dt);
    if (r.grinding) this.stats.grindMeters += r.distance - r.prevDistance;
    if (!this.collision.crashed) this.chase.step(dt, r);
    this.keeper.update(dt, r.distance - r.prevDistance);
    const loaf = this.secrets.stepLoaf(dt);
    if (loaf > 0) this.score.award(loaf);
    this.field.despawn(r.distance, SPAWNER.behindM);
  }
}
