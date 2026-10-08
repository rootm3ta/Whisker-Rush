import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import { ActionBuffer } from '../src/core/ActionBuffer';
import { Action } from '../src/core/Input';
import type { GameEvents } from '../src/core/events';
import { LANES, RUNNER, SPEED } from '../src/data/runner';
import { Runner } from '../src/gameplay/Runner';
import { speedAt } from '../src/gameplay/SpeedCurve';

const DT = 1 / 60;

function sim(r: Runner, sec: number, buf?: ActionBuffer, t0 = 0): void {
  const steps = Math.round(sec / DT);
  for (let i = 0; i < steps; i++) {
    buf?.process(t0 + i * DT, r.tryAction);
    r.step(DT);
  }
}

describe('speedAt', () => {
  it('starts at start speed and respects caps', () => {
    expect(speedAt(0)).toBe(SPEED.start);
    expect(speedAt(60)).toBeGreaterThan(SPEED.start);
    expect(speedAt(1e6)).toBe(SPEED.hardCap);
    for (let t = 0; t < 3000; t += 7) expect(speedAt(t + 7)).toBeGreaterThanOrEqual(speedAt(t));
  });
});

describe('Runner', () => {
  it('switches lanes within the switch time and clamps at edges', () => {
    const r = new Runner(new EventBus<GameEvents>());
    r.tryAction(Action.Right);
    sim(r, RUNNER.laneSwitchSec + DT);
    expect(r.x).toBeCloseTo(LANES.width);
    let blocked = 0;
    const bus = new EventBus<GameEvents>();
    bus.on('laneBlocked', () => blocked++);
    const r2 = new Runner(bus);
    r2.tryAction(Action.Left);
    r2.tryAction(Action.Left);
    expect(r2.lane).toBe(-1);
    expect(blocked).toBe(1);
  });

  it('jumps to roughly the configured height and lands', () => {
    const r = new Runner(new EventBus<GameEvents>());
    r.tryAction(Action.Up);
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      r.step(DT);
      peak = Math.max(peak, r.y);
    }
    expect(peak).toBeGreaterThan(RUNNER.jumpHeight * 0.95);
    expect(peak).toBeLessThan(RUNNER.jumpHeight * 1.05);
    expect(r.grounded).toBe(true);
  });

  it('buffers an early jump and fires it on landing', () => {
    const r = new Runner(new EventBus<GameEvents>());
    const buf = new ActionBuffer(8, 0.15);
    r.tryAction(Action.Up);
    const landAt = RUNNER.jumpSec;
    sim(r, landAt - 0.1);
    buf.push(Action.Up, landAt - 0.1);
    sim(r, 0.2, buf, landAt - 0.1);
    expect(r.grounded).toBe(false);
  });

  it('fast-drops in air and slides on landing', () => {
    const r = new Runner(new EventBus<GameEvents>());
    r.tryAction(Action.Up);
    sim(r, 0.2);
    r.tryAction(Action.Down);
    sim(r, 0.15);
    expect(r.grounded).toBe(true);
    expect(r.sliding).toBe(true);
  });
});
