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
}
