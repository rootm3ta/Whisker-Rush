import { Rng } from '../core/Rng';
import { COMEBACK, LOGIN, PASS, STREAK } from '../data/economy';
import { loginReward } from './Economy';
import { grant } from './Rewards';
import type { Profile } from './Save';

export interface LoginState {
  canClaim: boolean;
  /** 0..6 index of the reward that would be claimed today. */
  index: number;
  /** Streak continues if the last claim was yesterday. */
  streak: number;
  comeback: boolean;
}

export function loginState(p: Profile, day: number): LoginState {
  const l = p.login;
  const canClaim = l.lastDay !== day;
  const consecutive = l.lastDay === day - 1;
  const index = canClaim ? (consecutive ? l.next % LOGIN.length : 0) : (l.next + LOGIN.length - 1) % LOGIN.length;
  const streak = canClaim ? (consecutive ? l.streak + 1 : 1) : l.streak;
  const comeback = canClaim && l.lastDay >= 0 && day - l.lastDay >= COMEBACK.awayDays;
  return { canClaim, index, streak, comeback };
}

/** Claims today's login reward. Missing a day restarts the 7-day calendar. */
export function claimLogin(p: Profile, day: number, rng: Rng): string[] | null {
  const s = loginState(p, day);
  if (!s.canClaim) return null;
  const out = grant(p, { ...loginReward(s.index) }, rng);
  if (s.comeback) out.push(...grant(p, { coins: COMEBACK.coins }, rng));
  p.login = { ...p.login, lastDay: day, streak: s.streak, next: s.index + 1 };
  p.pass.stamps += PASS.stamps.login;
  if (s.streak >= STREAK.days && !p.login.streakRewarded) {
    p.login.streakRewarded = true;
    out.push(...grant(p, { accessory: STREAK.reward.id }, rng));
  }
  return out;
}
