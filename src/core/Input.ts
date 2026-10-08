import { INPUT } from '../data/runner';
import { ActionBuffer } from './ActionBuffer';

export const Action = { Left: 0, Right: 1, Up: 2, Down: 3, Ability: 4, Pause: 5, Roomba: 6 } as const;
export type ActionId = (typeof Action)[keyof typeof Action];

const KEYS: Record<string, ActionId> = {
  ArrowLeft: Action.Left,
  KeyA: Action.Left,
  ArrowRight: Action.Right,
  KeyD: Action.Right,
  ArrowUp: Action.Up,
  KeyW: Action.Up,
  ArrowDown: Action.Down,
  KeyS: Action.Down,
  Space: Action.Ability,
  KeyE: Action.Roomba,
  KeyP: Action.Pause,
  Escape: Action.Pause,
};

/** Swipes, taps, double taps and keyboard, stamped with sim time into a 150 ms buffer. */
export class Input {
  readonly buffer = new ActionBuffer(INPUT.bufferCapacity, INPUT.bufferSec);
  /** Where the last action came from (Home only starts runs from the keyboard). */
  lastSource: 'key' | 'touch' = 'touch';
  /** Called on single taps (menus). */
  onTap: (() => void) | null = null;

  private pointerId = -1;
  private sx = 0;
  private sy = 0;
  private st = 0;
  private swiped = false;
  private lastTap = -Infinity;

  constructor(
    target: HTMLElement,
    private readonly clock: () => number,
  ) {
    target.addEventListener('pointerdown', this.down);
    target.addEventListener('pointermove', this.move);
    target.addEventListener('pointerup', this.up);
    target.addEventListener('pointercancel', this.cancel);
    target.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    window.addEventListener('keydown', this.key);
  }

  private push(a: ActionId): void {
    this.buffer.push(a, this.clock());
  }

  private readonly down = (e: PointerEvent): void => {
    if (this.pointerId !== -1) return;
    this.pointerId = e.pointerId;
    this.sx = e.clientX;
    this.sy = e.clientY;
    this.st = e.timeStamp;
    this.swiped = false;
  };

  private readonly move = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId || this.swiped) return;
    const dx = e.clientX - this.sx;
    const dy = e.clientY - this.sy;
    const min = Math.max(INPUT.swipeMinPx, Math.min(window.innerWidth, window.innerHeight) * INPUT.swipeFrac);
    if (Math.abs(dx) < min && Math.abs(dy) < min) return;
    this.swiped = true;
    this.lastSource = 'touch';
    if (Math.abs(dx) > Math.abs(dy)) this.push(dx < 0 ? Action.Left : Action.Right);
    else this.push(dy < 0 ? Action.Up : Action.Down);
  };

  private readonly up = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = -1;
    if (this.swiped || e.timeStamp - this.st > INPUT.tapMaxMs) return;
    if (e.timeStamp - this.lastTap <= INPUT.doubleTapMs) {
      this.lastTap = -Infinity;
      this.push(Action.Ability);
    } else {
      this.lastTap = e.timeStamp;
    }
    this.onTap?.();
  };

  private readonly cancel = (e: PointerEvent): void => {
    if (e.pointerId === this.pointerId) this.pointerId = -1;
  };

  private readonly key = (e: KeyboardEvent): void => {
    const a = KEYS[e.code];
    if (a === undefined) return;
    e.preventDefault();
    if (e.repeat) return;
    this.lastSource = 'key';
    this.push(a);
  };
}
