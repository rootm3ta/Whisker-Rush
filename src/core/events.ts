/** Game event payloads. Primitives only, so emitting never allocates. */
export interface GameEvents {
  stateChange: string;
  jump: number;
  /** Payload: downward impact speed (m/s). */
  land: number;
  /** Payload: direction (-1 left, 1 right). */
  laneChange: number;
  /** Payload: direction of a blocked lane change at the edge. */
  laneBlocked: number;
  slide: number;
  fastDrop: number;
  /** Payload: new zone index. */
  zoneChange: number;
  /** Payload: index into WARN_SOUNDS (a hazard ahead announced itself). */
  hazardWarn: number;
  /** Street Pals arrived (Tbilisi). */
  streetPal: number;
  /** Payload: chain index (1..3). */
  wallKick: number;
  grindStart: number;
  /** Payload: grind duration (s). */
  grindEnd: number;
  coin: number;
  /** Payload: loot item index. */
  loot: number;
  fishBone: number;
  satchelFull: number;
  /** Payload: near misses in the current chain window. */
  nearMiss: number;
  stumble: number;
  /** Payload: 1 when caught after a second stumble, 0 for a head-on crash. */
  crash: number;
  /** Payload: index into STUNTS. */
  stunt: number;
  dukeTaunt: number;
  packRushWarn: number;
  packRushStart: number;
  /** Payload: 1 survived, 0 Bolt got you. */
  packRushEnd: number;
  /** Payload: total revives this run. */
  revive: number;
  gameOver: number;
  /** Payload: obstacle smashed by an invincible cat. */
  smash: number;
  /** Payload: power-up index (POWERUP_IDS) started. */
  powerStart: number;
  /** Payload: power-up index ended. */
  powerEnd: number;
  /** Payload: hits absorbed by a shield (0 bubble, 1 roomba). */
  shieldPop: number;
  roombaStart: number;
  /** Payload: combo gained (charges abilities). */
  comboGain: number;
  /** Payload: ability index activated. */
  ability: number;
  abilityReady: number;
  /** Payload: Lucky Bell id. */
  bell: number;
  allBells: number;
  mysteryFish: number;
  /** Payload: gag index (0 sneeze, 1 loaf). */
  gag: number;
  /** Payload: letter index in today's word. */
  letter: number;
  huntComplete: number;
  catDoor: number;
  alleyEnd: number;
  bossStart: number;
  /** Payload: dodges so far. */
  bossDodge: number;
  bossDefeated: number;
  chest: number;
}
