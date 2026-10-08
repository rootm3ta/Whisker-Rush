/**
 * Fixed-capacity queue of input actions with timestamps. Actions that cannot be
 * applied yet (e.g. jump while airborne) stay queued until they expire.
 */
export class ActionBuffer {
  private readonly acts: Int8Array;
  private readonly times: Float64Array;
  private n = 0;

  constructor(
    private readonly capacity: number,
    private readonly windowSec: number,
  ) {
    this.acts = new Int8Array(capacity);
    this.times = new Float64Array(capacity);
  }

  get size(): number {
    return this.n;
  }

  push(action: number, t: number): void {
    if (this.n === this.capacity) {
      this.acts.copyWithin(0, 1);
      this.times.copyWithin(0, 1);
      this.n--;
    }
    this.acts[this.n] = action;
    this.times[this.n] = t;
    this.n++;
  }

  /** Calls handler for each live action in order; handler returns true when consumed. */
  process(now: number, handler: (action: number) => boolean): void {
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      const a = this.acts[i];
      const t = this.times[i];
      if (now - t > this.windowSec) continue;
      if (handler(a)) continue;
      this.acts[w] = a;
      this.times[w] = t;
      w++;
    }
    this.n = w;
  }

  clear(): void {
    this.n = 0;
  }
}
