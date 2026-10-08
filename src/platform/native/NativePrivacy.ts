import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import type { IPrivacy, TrackingStatus } from '../Privacy';

/** Google UMP consent (shown only where the law requires it) and Apple ATT. */
export class NativePrivacy implements IPrivacy {
  readonly isIOS = Capacitor.getPlatform() === 'ios';

  async gatherConsent(): Promise<boolean> {
    try {
      let info = await AdMob.requestConsentInfo();
      if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) info = await AdMob.showConsentForm();
      return info.status !== AdmobConsentStatus.REQUIRED;
    } catch {
      return true;
    }
  }

  async trackingStatus(): Promise<TrackingStatus> {
    if (!this.isIOS) return 'unavailable';
    try {
      return (await AdMob.trackingAuthorizationStatus()).status;
    } catch {
      return 'unavailable';
    }
  }

  async requestTracking(): Promise<TrackingStatus> {
    if (!this.isIOS) return 'unavailable';
    try {
      await AdMob.requestTrackingAuthorization();
    } catch {
      /* Older iOS: no ATT. */
    }
    return this.trackingStatus();
  }
}
