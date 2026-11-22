import { describe, it, expect } from 'vitest';
import { createLoop } from '../src/loop';

describe('fixed-step loop', () => {
  it('runs one step per fixed interval of scaled time', () => {
    let steps = 0;
    const loop = createLoop(() => steps++, { fixed: 1 / 30, maxSteps: 8 });
    loop.advance(0.1 + 1e-9, 1);
    expect(steps).toBe(3);
  });

  it('scales by game speed', () => {
    let steps = 0;
    const loop = createLoop(() => steps++, { fixed: 1 / 30, maxSteps: 100 });
    loop.advance(0.1 + 1e-9, 4);
    expect(steps).toBe(12);
  });

  it('clamps huge frame gaps to maxSteps and drops the backlog', () => {
    let steps = 0;
    const loop = createLoop(() => steps++, { fixed: 1 / 30, maxSteps: 8 });
    const alpha = loop.advance(10, 4);
    expect(steps).toBe(8);
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1);
    steps = 0;
    loop.advance(1 / 60, 1);
    expect(steps).toBeLessThanOrEqual(1);
  });

  it('does not step while paused', () => {
    let steps = 0;
    const loop = createLoop(() => steps++, { fixed: 1 / 30, maxSteps: 8 });
    loop.advance(1, 0);
    expect(steps).toBe(0);
  });
});
