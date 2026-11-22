import { describe, it, expect } from 'vitest';
import { Grid, createLot } from '../src/sim/grid';
import { findPath } from '../src/sim/path';

const wallRow = (g: Grid, z: number, x0: number, x1: number, doorX?: number) => {
  for (let x = x0; x <= x1; x++) g.setWall(x, z, 'N', { kind: 'room', door: x === doorX, window: false });
};

describe('findPath', () => {
  it('returns a straight path in open space ending at the target tile centre', () => {
    const g = new Grid(10, 10);
    const p = findPath(g, { x: 1, z: 1 }, { x: 8, z: 1 })!;
    expect(p).not.toBeNull();
    expect(p[p.length - 1]).toEqual({ x: 8.5, z: 1.5 });
    expect(p.length).toBeLessThanOrEqual(2);
  });

  it('routes around a wall through its door', () => {
    const g = new Grid(10, 10);
    wallRow(g, 5, 0, 9, 7);
    const p = findPath(g, { x: 1, z: 8 }, { x: 1, z: 1 })!;
    expect(p).not.toBeNull();
    const crossings = p.slice(1).flatMap((b, i) => {
      const a = p[i];
      if ((a.z >= 5) === (b.z >= 5)) return [];
      return [a.x + (b.x - a.x) * ((a.z - 5) / (a.z - b.z))];
    });
    expect(crossings.length).toBe(1);
    expect(crossings[0]).toBeGreaterThan(7);
    expect(crossings[0]).toBeLessThan(8);
  });

  it('returns null for an enclosed target', () => {
    const g = new Grid(10, 10);
    for (const d of ['N', 'E', 'S', 'W'] as const) g.setWall(5, 5, d, { kind: 'room', door: false, window: false });
    expect(findPath(g, { x: 1, z: 1 }, { x: 5, z: 5 })).toBeNull();
  });

  it('enters the building through the entrance from the road', () => {
    const g = createLot();
    const p = findPath(g, { x: 24, z: 36 }, { x: 21, z: 16 })!;
    expect(p).not.toBeNull();
    let entered = false;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i];
      if (a.z >= 28 && b.z < 28) {
        const t = (a.z - 28) / (a.z - b.z);
        const xAt = a.x + (b.x - a.x) * t;
        entered = xAt > 21 && xAt < 23;
      }
    }
    expect(entered).toBe(true);
  });

  it('smoothed segments never cross a wall', () => {
    const g = new Grid(12, 12);
    wallRow(g, 6, 0, 11, 2);
    const p = findPath(g, { x: 10, z: 10 }, { x: 10, z: 1 })!;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i];
      if ((a.z >= 6) !== (b.z >= 6)) {
        const t = (a.z - 6) / (a.z - b.z);
        const xAt = a.x + (b.x - a.x) * t;
        expect(xAt).toBeGreaterThan(2);
        expect(xAt).toBeLessThan(3);
      }
    }
  });
});
