import { NEWCOMER } from '../data/tutorial';
import type { Profile } from './Save';

export type OnboardingStep = 'comic' | 'tutorial' | 'firstRun' | 'home';

/** Where a launch should go: the first-session flow runs once, in order. */
export function nextOnboarding(p: Profile): OnboardingStep {
  if (!p.flags.introSeen) return 'comic';
  if (!p.flags.tutorialDone) return 'tutorial';
  if (!p.flags.firstRunDone) return 'firstRun';
  return 'home';
}

/** No interstitial ads in the first sessions. Ever. */
export function canShowInterstitial(p: Profile): boolean {
  return p.sessions > NEWCOMER.noInterstitialSessions;
}

/** The free hat waits in the Wardrobe until the player opens it after onboarding. */
export function freeHatPending(p: Profile): boolean {
  return p.flags.firstRunDone && !p.flags.freeHatClaimed;
}

export function claimFreeHat(p: Profile): boolean {
  if (!freeHatPending(p)) return false;
  p.flags.freeHatClaimed = true;
  if (!p.accessories.includes(NEWCOMER.freeHat)) p.accessories.push(NEWCOMER.freeHat);
  p.outfit.head = NEWCOMER.freeHat;
  return true;
}
