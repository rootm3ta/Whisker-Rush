import { describe, expect, it } from 'vitest';
import { ActionBuffer } from '../src/core/ActionBuffer';
import { EventBus } from '../src/core/EventBus';
import { StateMachine } from '../src/core/StateMachine';
import type { GameEvents } from '../src/core/events';

describe('ActionBuffer', () => {
  it('keeps unconsumed actions until the window expires', () => {
    const b = new ActionBuffer(4, 0.15);
    b.push(2, 0);
    b.process(0.1, () => false);
    expect(b.size).toBe(1);
    b.process(0.2, () => false);
    expect(b.size).toBe(0);
  });
  it('preserves order and drops oldest on overflow', () => {
    const b = new ActionBuffer(2, 1);
    b.push(1, 0);
    b.push(2, 0);
    b.push(3, 0);
    const seen: number[] = [];
    b.process(0, (a) => (seen.push(a), true));
    expect(seen).toEqual([2, 3]);
  });
});

describe('EventBus', () => {
  it('emits to subscribers and unsubscribes', () => {
    const bus = new EventBus<GameEvents>();
    let got = 0;
    const off = bus.on('land', (v) => (got += v));
    bus.emit('land', 3);
    off();
    bus.emit('land', 3);
    expect(got).toBe(3);
  });
});

describe('StateMachine', () => {
  it('runs enter/exit hooks', () => {
    const log: string[] = [];
    const fsm = new StateMachine<'a' | 'b'>({
      a: { exit: () => log.push('exit a') },
      b: { enter: () => log.push('enter b') },
    });
    fsm.go('a');
    fsm.go('b');
    expect(log).toEqual(['exit a', 'enter b']);
    expect(fsm.is('b')).toBe(true);
  });
});
