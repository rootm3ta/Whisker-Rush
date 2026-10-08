import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import type { GameEvents } from '../src/core/events';
import { Action } from '../src/core/Input';
import { ABILITY } from '../src/data/abilities';
import { BOSS } from '../src/data/boss';
import { POWERUP_FX, POWERUPS } from '../src/data/powerups';
import { BELLS, CAT_DOOR, DAILY_HUNT } from '../src/data/secrets';
import { BossPhase } from '../src/gameplay/Boss';
import { PickupKind } from '../src/gameplay/Field';
import { RunSession } from '../src/gameplay/RunSession';
import { huntWord } from '../src/gameplay/Secrets';
import { defaultProfile } from '../src/meta/Save';

const DT = 1 / 60;

function session() {
  const bus = new EventBus<GameEvents>();
  const run = new RunSession(bus);
  const profile = defaultProfile();
  run.reset(undefined, profile, 0);
  run.field.reset();
  (run.spawner as unknown as { update: () => void }).update = () => {};
  return { run, bus, profile };
}

function steps(run: RunSession, n: number): void {
  for (let i = 0; i < n && !run.crashed; i++) run.step(DT);
}

describe('power-ups', () => {
  it('Yarn Magnet pulls coins from other lanes', () => {
    const { run } = session();
    run.activatePowerUp('magnet');
    run.field.addCoin(3, 10, 0.6);
    run.field.addCoin(-3, 12, 0.6);
    steps(run, 90);
    expect(run.score.coins).toBe(2);
  });

  it('Catnip Frenzy smashes obstacles and speeds up', () => {
    const { run } = session();
    let smashed = 0;
    run.activatePowerUp('catnip');
    (run as unknown as { bus: EventBus<GameEvents> }).bus.on('smash', () => smashed++);
    run.field.addObstacle('trashCans', 0, 10, 1, 0);
    steps(run, 60);
    expect(run.crashed).toBe(false);
    expect(smashed).toBe(1);
    expect(run.runner.speed).toBeGreaterThan(17);
  });

  it('Milk Bubble absorbs one crash, then the next one counts', () => {
    const { run } = session();
    run.activatePowerUp('bubble');
    run.field.addObstacle('trashCans', 0, 10, 1, 0);
    steps(run, 60);
    expect(run.crashed).toBe(false);
    expect(run.powerUps.bubble).toBe(false);
    run.field.addObstacle('trashCans', 0, run.runner.distance + 30, 1, 0);
    steps(run, 200);
    expect(run.crashed).toBe(true);
  });

  it('Cardboard Box passes through low obstacles but not tall ones', () => {
    const { run } = session();
    run.activatePowerUp('box');
    run.field.addObstacle('hedge', 0, 10, 1.2, 0);
    run.field.addObstacle('trashCans', 0, 20, 1, 0);
    steps(run, 120);
    expect(run.crashed).toBe(false);
    run.field.addObstacle('car', 0, run.runner.distance + 4, 4.2, 0);
    steps(run, 60);
    expect(run.crashed).toBe(true);
  });

  it('Balloon Ride floats over everything and lands safely', () => {
    const { run } = session();
    run.activatePowerUp('balloon');
    run.field.addObstacle('mailTruck', 0, 30, 6.5, 0);
    steps(run, 60 * POWERUPS.balloon.duration);
    expect(run.crashed).toBe(false);
    expect(run.runner.y).toBeGreaterThan(POWERUP_FX.balloonHeight * 0.8);
    steps(run, 120);
    expect(run.runner.grounded).toBe(true);
  });

  it('Fish Rocket launches 1500 m ahead', () => {
    const { run } = session();
    run.activatePowerUp('fishRocket');
    let guard = 0;
    while (run.powerUps.isOn('fishRocket') && guard++ < 60 * 60) run.step(DT);
    expect(run.runner.distance).toBeGreaterThanOrEqual(POWERUPS.fishRocket.meters);
    expect(run.crashed).toBe(false);
  });

  it('x2 Treats doubles coins', () => {
    const { run } = session();
    run.activatePowerUp('treats');
    run.field.addCoin(0, 5, 0.6);
    steps(run, 40);
    expect(run.score.coins).toBe(2);
  });

  it('Roomba absorbs one crash', () => {
    const { run } = session();
    expect(run.startRoomba()).toBe(true);
    run.field.addObstacle('trashCans', 0, 10, 1, 0);
    steps(run, 60);
    expect(run.crashed).toBe(false);
    expect(run.powerUps.riding).toBe(false);
  });
});

describe('abilities', () => {
  it('charges from combo gains and Pounce dashes 30 m through obstacles', () => {
    const { run, bus } = session();
    bus.emit('comboGain', ABILITY.chargeNeeded);
    expect(run.abilities.charged).toBe(true);
    run.field.addObstacle('trashCans', 0, 15, 1, 0);
    const d0 = run.runner.distance;
    expect(run.activateAbility()).toBe(true);
    steps(run, 30);
    expect(run.runner.distance - d0).toBeGreaterThan(ABILITY.pounceMeters);
    expect(run.crashed).toBe(false);
    expect(run.abilities.charged).toBe(false);
  });

  it('Nap Time freezes the world, then dodges', () => {
    const { run, bus, profile } = session();
    profile.ability = 'nap';
    run.reset(undefined, profile, 0);
    run.field.reset();
    (run.spawner as unknown as { update: () => void }).update = () => {};
    bus.emit('comboGain', 5);
    run.field.addObstacle('trashCans', 0, 10, 1, 0);
    run.activateAbility();
    const d0 = run.runner.distance;
    steps(run, 60);
    expect(run.runner.distance).toBe(d0);
    steps(run, 120);
    expect(run.crashed).toBe(false);
    expect(run.runner.lane).not.toBe(0);
  });
});

describe('secrets', () => {
  it('cat door leads into a 10 s Secret Alley coin river', () => {
    const { run, bus } = session();
    let ended = 0;
    bus.on('alleyEnd', () => ended++);
    run.field.addObstacle('catDoorWall', -3, 0, 10, 0);
    steps(run, 15);
    run.handleAction(Action.Left);
    steps(run, 10);
    expect(run.secrets.inAlley).toBe(true);
    steps(run, 60 * CAT_DOOR.alleySec + 30);
    expect(ended).toBe(1);
    expect(run.score.coins).toBeGreaterThan(20);
    expect(run.crashed).toBe(false);
  });

  it('Lucky Bells persist; all nine grant the golden collar and coin bonus', () => {
    const { run, profile } = session();
    for (let id = 0; id < BELLS.perCity; id++) {
      run.field.addPickup(PickupKind.Bell, id, 0, run.runner.distance + 3, 0.7);
      steps(run, 20);
    }
    expect(profile.bells.length).toBe(BELLS.perCity);
    expect(profile.goldenCollar).toBe(true);
    expect(run.secrets.coinBonus).toBeCloseTo(1 + BELLS.coinBonus);
  });

  it('Daily Hunt letters complete the word and pay out', () => {
    const { run, profile } = session();
    const word = huntWord(0);
    const coins0 = profile.coins;
    for (let i = 0; i < word.length; i++) {
      run.field.addPickup(PickupKind.Letter, i, 0, run.runner.distance + 3, 0.7);
      steps(run, 20);
    }
    expect(profile.hunt.found.length).toBe(word.length);
    expect(profile.coins).toBe(coins0 + DAILY_HUNT.rewardCoins);
  });
});

describe('Boss Chase', () => {
  it('starts at 3000 m, needs 10 dodges, then drops a chest', () => {
    const { run, bus } = session();
    let started = 0;
    let chest = 0;
    bus.on('bossStart', () => started++);
    bus.on('chest', () => chest++);
    run.runner.distance = BOSS.every - 1;
    run.runner.prevDistance = run.runner.distance;
    run.collision.addGrace(1e9); // the test cat is invulnerable; we only count throws
    let guard = 0;
    while (run.boss.phase !== BossPhase.Swerve && guard++ < 60 * 60) {
      run.step(DT);
      // Stay out of the thrown parcel's lane: always pick the lane next to it.
      for (const o of run.field.obstacles) if (o.active && o.thrown && !o.counted) o.hit = false;
    }
    expect(started).toBe(1);
    expect(run.boss.dodges).toBe(BOSS.throwsToWin);
    steps(run, 60 * (BOSS.swerveSec + 3));
    expect(chest).toBe(1);
  });
});
