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
}
