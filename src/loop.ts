export interface LoopOptions {
  /** fixed simulation step in game seconds */
  fixed: number;
  /** most steps allowed per advance() call; backlog beyond is dropped */
  maxSteps: number;
}

export interface Loop {
  /** Advance by real seconds at a speed multiplier. Returns interpolation alpha in [0,1). */
  advance(realDt: number, speed: number): number;
}

export function createLoop(step: (dt: number) => void, opts: LoopOptions): Loop {
  let acc = 0;
  return {
    advance(realDt, speed) {
      if (speed <= 0) return Math.min(acc / opts.fixed, 0.999);
      acc += Math.max(0, realDt) * speed;
      let n = 0;
      while (acc >= opts.fixed && n < opts.maxSteps) {
        step(opts.fixed);
        acc -= opts.fixed;
        n++;
      }
      if (acc >= opts.fixed) acc = acc % opts.fixed;
      return Math.min(acc / opts.fixed, 0.999);
    },
  };
}
