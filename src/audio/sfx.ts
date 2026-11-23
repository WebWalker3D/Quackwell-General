import type { SimEvent } from '../sim/events';

/** Placeholder until Task 11 adds synthesized audio. */
export class Sfx {
  volume = 0.6;
  unlock() {}
  setVolume(v: number) { this.volume = v; }
  play(_name: string) {}
  handle(_events: SimEvent[]) {}
}
