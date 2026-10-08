/** UI copy. */
export const UI_TEXT = {
  title: 'Whisker Rush',
  homeHint: 'Swipe or tap to run',
  pausedTitle: 'Paused',
  pausedHint: 'Tap to keep running',
  keysHint: 'Arrows / WASD to move, P to pause',
  crashTitle: 'Bonk!',
  caughtTitle: 'Caught!',
  crashHint: 'Tap to run again',
  nearMiss: 'NEAR MISS',
  stumble: 'OOF!',
  satchelFull: 'SATCHEL FULL',
  fishBone: 'FISH BONE!',
  packRush: 'PACK RUSH!',
  pop: 'POP!',
  roombaOff: 'ROOMBA DOWN!',
  bell: 'LUCKY BELL {n}/9',
  allBells: 'GOLDEN COLLAR!',
  huntDone: 'DAILY HUNT DONE!',
  mystery: 'MYSTERY FISH!',
  gags: ['ACHOO!', 'LOAF MODE'],
  catDoor: 'SECRET ALLEY!',
  alleyBanner: 'Secret Alley {s}',
  bossStart: 'BOSS CHASE!',
  bossBanner: 'Dodge Duke {n}/{t}',
  bossDown: 'DUKE WIPED OUT!',
  chest: 'REWARD CHEST!',
  smash: 'SMASH!',
  abilityReady: 'READY!',
  revived: 'BACK IN IT!',
  gameOver: {
    crash: 'Bonk!',
    caught: 'Caught!',
    score: 'Score',
    distance: 'Distance',
    best: 'Best',
    newBest: 'NEW BEST',
    coins: 'Coins',
    loot: 'Loot',
    noLoot: 'Empty paws this time.',
    revives: 'Revives',
    reviveAd: 'Revive (watch ad)',
    reviveBones: 'Revive',
    share: 'Share',
    continue: 'Continue',
    shareText: 'I just ran {m} m from Duke and his gang in Whisker Rush!',
    shareCopied: 'Copied to clipboard',
    shareSoon: 'Sharing comes soon',
  },
} as const;

/** Duke's taunts while the pack is close. */
export const DUKE_TAUNTS = [
  'That sausage was MINE, furball!',
  'Run all you want, Miso!',
  'Heh. Getting tired yet?',
  'Nice tail. Shame if someone chewed it.',
  'Boys, we got her now!',
] as const;

/** HUD stamp colors (ink on paper). */
export const STAMP_COLORS = {
  nearMiss: '#d9562e',
  stunt: '#3f6f8a',
  warn: '#8a4b3a',
  loot: '#5b4a5e',
} as const;

export const HUD = {
  stampMs: 900,
  tauntMs: 1600,
} as const;
