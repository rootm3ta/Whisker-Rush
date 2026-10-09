/** Autoplay bot skill levels (S7 playtests and `?autoplay=1`). */
export interface BotSkill {
  name: string;
  /** Seconds between noticing a threat and acting on it. */
  reactionSec: number;
  /** How far ahead the bot looks, in seconds of travel at the current speed. */
  lookSec: number;
  /** Chance to fumble a decision (do nothing). */
  mistake: number;
  /** Uses walkable tops (jumping onto things) instead of only dodging. */
  climbs: boolean;
}

export const BOT_SKILLS: Record<'newPlayer' | 'casual' | 'expert', BotSkill> = {
  newPlayer: { name: 'new player', reactionSec: 0.34, lookSec: 0.95, mistake: 0.1, climbs: false },
  casual: { name: 'casual', reactionSec: 0.22, lookSec: 1.25, mistake: 0.04, climbs: true },
  expert: { name: 'expert', reactionSec: 0.12, lookSec: 1.7, mistake: 0.008, climbs: true },
};

export type BotSkillId = keyof typeof BOT_SKILLS;
