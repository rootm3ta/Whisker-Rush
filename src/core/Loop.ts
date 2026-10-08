/** Fixed-step simulation with interpolated rendering. */
export class FixedLoop {
  private acc = 0;
  private last = 0;
  private running = false;
  private readonly stepSec: number;

  constructor(
    hz: number,
    private readonly maxFrameSec: number,
    private readonly step: (dt: number) => void,
    private readonly render: (alpha: number, frameDt: number) => void,
  ) {
    this.stepSec = 1 / hz;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    const frameDt = Math.min((now - this.last) / 1000, this.maxFrameSec);
    this.last = now;
    this.acc += frameDt;
    while (this.acc >= this.stepSec) {
      this.step(this.stepSec);
      this.acc -= this.stepSec;
    }
    this.render(this.acc / this.stepSec, frameDt);
    if (this.running) requestAnimationFrame(this.frame);
  };
}
