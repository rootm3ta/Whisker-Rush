/** Interactive tutorial run (GAME_DESIGN 8.2). Distances in metres. */
export type TutorialStepId = 'lane' | 'jump' | 'slide' | 'wallKick' | 'magnet' | 'loot' | 'rush';

export type Hint = 'left-right' | 'up' | 'down' | 'up-up' | 'toward' | 'none';

export const TUTORIAL = {
  speedMul: 0.65,
  /** Next step's setup is placed this far ahead. */
  spawnAhead: 32,
  /** Gap after finishing a step before the next one starts. */
  breatherM: 12,
  /** Time scale while waiting for the right input. */
  freezeScale: 0.04,
  /** Distance from the obstacle front where the world pauses for each move. */
  freezeAt: { lane: 5, jump: 2.0, slide: 1.6, toward: 6, rush: 2.5 },
  magnetShowSec: 2.5,
  rushSec: 3.2,
  doneStampSec: 2.2,
  steps: [
    { id: 'lane', text: 'Swipe left or right to dodge!', hint: 'left-right' },
    { id: 'jump', text: 'Swipe up to jump the hedge!', hint: 'up' },
    { id: 'slide', text: 'Swipe down to slide under!', hint: 'down' },
    { id: 'wallKick', text: 'Jump, then swipe up again by the wall to wall-kick!', hint: 'up-up' },
    { id: 'magnet', text: 'Grab the Yarn Magnet!', hint: 'toward' },
    { id: 'loot', text: 'Grab that! Old Tom will want this.', hint: 'toward' },
    { id: 'rush', text: 'Duke is closing in! Dodge Bolt!', hint: 'left-right' },
  ] as { id: TutorialStepId; text: string; hint: Hint }[],
  done: "YOU'RE A NATURAL",
  nowForReal: 'Now for real!',
} as const;

/** First real run is guaranteed fun (GAME_DESIGN 8.1). */
export const FIRST_RUN = {
  magnetAt: 75,
  catnipAt: 260,
  luck: 3,
  /** Every pattern gap without a power-up gets a loot item. */
  gapLoot: true,
} as const;

export const NEWCOMER = {
  /** Old Tom pays this multiplier on the first visit. */
  sellMul: 2,
  freeHat: 'bucketHat',
  /** No interstitial ads during the first sessions. Ever. */
  noInterstitialSessions: 3,
  tomIntro: [
    "Name's Tom. Old Tom. The one eye is for business, the other one's for spotting newcomers.",
    "First time? I'll pay double today. Don't get used to it.",
  ],
} as const;
