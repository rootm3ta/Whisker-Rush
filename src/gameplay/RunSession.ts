import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Action } from '../core/Input';
import { ABILITY } from '../data/abilities';
import { BOSS } from '../data/boss';
import { REVIVE } from '../data/chase';
import { POWERUP_IDS, type PowerUpId } from '../data/powerups';
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
  /** True when the last crash was a catch (second stumble), false for a head-on crash. */
  caught = false;
  readonly stats: RunStatsCollector;
  config: RunConfig = defaultRunConfig();
  private bankedCoins = 0;
  private bankedBones = 0;
  private wasBoss = false;
  private readonly rng = new Rng(555);

  constructor(private readonly bus: EventBus<GameEvents>) {
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
    this.spawner.luck = config.luck;
    this.spawner.catDoorMul = config.catDoorMul;
    this.stats.reset();
    this.secrets.reset(profile, now);
    this.boss.reset();
    this.mods.clear();
    this.caught = false;
    this.bankedCoins = 0;
    this.bankedBones = 0;
    this.wasBoss = false;
    this.spawner.update(0, this.runner.speed);
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
        const loot = rollLootAtLeast(this.rng, this.runner.distance, BOSS.chestMinRarity as Rarity);
        if (this.satchel.add(loot)) this.bus.emit('loot', loot);
        this.bus.emit('chest', 0);
        break;
      }
    }
  };

  step(dt: number): void {
    if (this.collision.crashed) return;
    const r = this.runner;
    if (this.abilities.stepNap(dt, r, this.field, this.collision) || this.napping) return;

    this.mods.clear();
    this.powerUps.step(dt, r, this.field, this.chase, this.collision);
    this.abilities.step(dt, r, this.mods);
    r.speedMul = this.mods.speedMul;
    this.score.tempMul = this.mods.scoreMul;
    this.keeper.coinMul = this.mods.coinMul * this.secrets.coinBonus * this.config.coinMul;

    const alleyEnded = this.secrets.stepAlley(dt, r, this.field);
    this.boss.step(dt, r, this.field, this.secrets.inAlley || r.flying);
    const bossNow = this.boss.active && this.boss.phase !== BossPhase.Swerve;
    if (bossNow) this.spawner.paused = true;
    if ((this.wasBoss && !bossNow) || alleyEnded) this.spawner.resumeAt(r.distance + SPAWNER.minGapM * 3);
    this.wasBoss = bossNow;

    this.spawner.update(r.distance, r.speed);
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
