export type TrackingStatus = 'authorized' | 'denied' | 'notDetermined' | 'restricted' | 'unavailable';

/** Consent (UMP for the EU) and App Tracking Transparency (iOS). */
export interface IPrivacy {
  readonly isIOS: boolean;
  /** Gathers UMP consent if required; resolves whether ads may be requested. */
  gatherConsent(): Promise<boolean>;
  trackingStatus(): Promise<TrackingStatus>;
  requestTracking(): Promise<TrackingStatus>;
}

export class WebPrivacy implements IPrivacy {
  readonly isIOS = false;
  async gatherConsent(): Promise<boolean> {
    return true;
  }
  async trackingStatus(): Promise<TrackingStatus> {
    return 'unavailable';
  }
  async requestTracking(): Promise<TrackingStatus> {
    return 'unavailable';
  }
}
