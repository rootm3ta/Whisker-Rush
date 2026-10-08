import { SATCHEL } from '../data/pickups';

/** Run loot bag with limited slots. Stores loot item indices. */
export class Satchel {
  private readonly items = new Int16Array(SATCHEL.maxCapacity);
  count = 0;

  constructor(public capacity: number = SATCHEL.startCapacity) {}

  get full(): boolean {
    return this.count >= this.capacity;
  }

  add(item: number): boolean {
    if (this.full) return false;
    this.items[this.count++] = item;
    return true;
  }

  at(i: number): number {
    return this.items[i];
  }

  clear(): void {
    this.count = 0;
  }
}
