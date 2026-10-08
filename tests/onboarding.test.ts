import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import type { GameEvents } from '../src/core/events';
import { Action } from '../src/core/Input';
import { TUTORIAL, FIRST_RUN, NEWCOMER } from '../src/data/tutorial';
import { POWERUP_IDS } from '../src/data/powerups';
import { PickupKind } from '../src/gameplay/Field';
import { RunSession } from '../src/gameplay/RunSession';
import { Tutorial } from '../src/gameplay/Tutorial';
import { computeRunConfig } from '../src/meta/Loadout';
import { canShowInterstitial, claimFreeHat, freeHatPending, nextOnboarding } from '../src/meta/Onboarding';
import { defaultProfile, migrate } from '../src/meta/Save';
import { dailyBoard } from '../src/meta/Economy';
import { addToStash, itemIndex, sellAll } from '../src/meta/Market';

const DT = 1 / 60;

describe('first-session flow', () => {
  it('runs comic -> tutorial -> first run -> home, once', () => {
    const p = defaultProfile();
    expect(nextOnboarding(p)).toBe('comic');
    p.flags.introSeen = true;
    expect(nextOnboarding(p)).toBe('tutorial');
    p.flags.tutorialDone = true;
    expect(nextOnboarding(p)).toBe('firstRun');
    expect(computeRunConfig(p).firstRun).toBe(true);
    p.flags.firstRunDone = true;
    expect(nextOnboarding(p)).toBe('home');
    expect(computeRunConfig(p).firstRun).toBe(false);
  });

  it('veteran saves from before onboarding skip it', () => {
    const p = migrate({ version: 1, runs: 12, bestScore: 900 });
    expect(nextOnboarding(p)).toBe('home');
    expect(nextOnboarding(migrate({ version: 1 }))).toBe('comic');
  });

  it('free hat is claimed once and equipped', () => {
    const p = defaultProfile();
    expect(freeHatPending(p)).toBe(false);
    p.flags.firstRunDone = true;
    expect(claimFreeHat(p)).toBe(true);
    expect(p.outfit.head).toBe(NEWCOMER.freeHat);
    expect(claimFreeHat(p)).toBe(false);
  });

  it('no interstitials in the first 3 sessions', () => {
    const p = defaultProfile();
    for (p.sessions = 1; p.sessions <= 3; p.sessions++) expect(canShowInterstitial(p)).toBe(false);
    expect(canShowInterstitial(p)).toBe(true);
  });

  it('newcomer bonus doubles what Tom pays', () => {
    const a = defaultProfile();
    const b = defaultProfile();
    const loot = [itemIndex('sock'), itemIndex('toyMouse')];
    addToStash(a, loot);
    addToStash(b, loot);
    const board = dailyBoard(42);
    expect(sellAll(b, board, NEWCOMER.sellMul).coins).toBeGreaterThanOrEqual(sellAll(a, board).coins * 2 - 2);
  });

  it('first run places a Magnet and Catnip early', () => {
    const p = defaultProfile();
    p.flags.introSeen = p.flags.tutorialDone = true;
    const run = new RunSession(new EventBus<GameEvents>());
    run.reset(undefined, p, 0, computeRunConfig(p));
    const ups = run.field.pickups.filter((x) => x.active && x.kind === PickupKind.PowerUp);
    expect(ups.some((x) => x.item === POWERUP_IDS.indexOf('magnet') && x.s === FIRST_RUN.magnetAt)).toBe(true);
    expect(ups.some((x) => x.item === POWERUP_IDS.indexOf('catnip') && x.s === FIRST_RUN.catnipAt)).toBe(true);
  });
});

describe('tutorial run', () => {
  it('a player who only reacts when the world freezes finishes every step without crashing', () => {
    const bus = new EventBus<GameEvents>();
    const run = new RunSession(bus);
    const tut = new Tutorial(bus, run);
    run.reset(undefined, defaultProfile(), 0);
    run.field.reset();
    run.slowMul = TUTORIAL.speedMul;
    tut.start();
    const seen = new Set<string>();
    let lastHint = '';
    let cooldown = 0;
    for (let i = 0; i < 60 * 240 && !tut.finished; i++) {
      const dt = tut.frozen ? DT * TUTORIAL.freezeScale : DT;
      if (tut.stepId) seen.add(tut.stepId);
      if (tut.frozen && cooldown <= 0) {
        const r = run.runner;
        const h = tut.hint;
        if (h === 'up' || h === 'up-up') run.handleAction(Action.Up);
        else if (h === 'down') run.handleAction(Action.Down);
        else if (h === 'left') run.handleAction(Action.Left);
        else if (h === 'right') run.handleAction(Action.Right);
        else if (h === 'left-right') run.handleAction(r.lane < 1 ? Action.Right : Action.Left);
        lastHint = h;
        cooldown = 0.05;
      }
      cooldown -= dt;
      run.step(dt);
      tut.update(dt);
      expect(run.crashed).toBe(false);
    }
    expect(lastHint).not.toBe('');
    expect(tut.finished).toBe(true);
    expect([...seen]).toEqual(TUTORIAL.steps.map((s) => s.id));
  });
});
