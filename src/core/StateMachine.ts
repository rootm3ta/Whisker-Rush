export interface State {
  enter?(): void;
  exit?(): void;
  update?(dt: number): void;
}

/** Minimal finite state machine for app flow. */
export class StateMachine<K extends string> {
  current: K | null = null;

  constructor(
    private readonly states: Record<K, State>,
    private readonly onChange?: (next: K, prev: K | null) => void,
  ) {}

  go(next: K): void {
    if (next === this.current) return;
    const prev = this.current;
    if (prev) this.states[prev].exit?.();
    this.current = next;
    this.states[next].enter?.();
    this.onChange?.(next, prev);
  }

  is(k: K): boolean {
    return this.current === k;
  }

  update(dt: number): void {
    if (this.current) this.states[this.current].update?.(dt);
  }
}
