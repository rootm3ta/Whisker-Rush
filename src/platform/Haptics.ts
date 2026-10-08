/** Haptics. Web uses navigator.vibrate where supported (Android); iOS Safari ignores it. Capacitor in M9. */
export interface IHaptics {
  tick(): void;
  light(): void;
  medium(): void;
  heavy(): void;
}

export class WebHaptics implements IHaptics {
  enabled = true;

  private buzz(ms: number | number[]): void {
    if (!this.enabled) return;
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    nav.vibrate?.(ms);
  }

  tick(): void {
    this.buzz(6);
  }
  light(): void {
    this.buzz(12);
  }
  medium(): void {
    this.buzz(22);
  }
  heavy(): void {
    this.buzz([40, 30, 40]);
  }
}
