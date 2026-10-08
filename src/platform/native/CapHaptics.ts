import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { IHaptics } from '../Haptics';

/** Taptic Engine / Android vibrator via @capacitor/haptics. */
export class CapHaptics implements IHaptics {
  enabled = true;

  tick(): void {
    if (this.enabled) void Haptics.selectionChanged();
  }
  light(): void {
    if (this.enabled) void Haptics.impact({ style: ImpactStyle.Light });
  }
  medium(): void {
    if (this.enabled) void Haptics.impact({ style: ImpactStyle.Medium });
  }
  heavy(): void {
    if (this.enabled) void Haptics.notification({ type: NotificationType.Error });
  }
}
