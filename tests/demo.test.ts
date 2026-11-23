import { describe, it, expect } from 'vitest';
import { createDemoWorld } from '../src/sim/demo';
import { ROOMS, type RoomType } from '../src/sim/catalog';

describe('demo world', () => {
  it('has every room type, staffed, and a crowd of patients after warm-up', () => {
    const w = createDemoWorld();
    const types = new Set(w.state.rooms.map((r) => r.type));
    for (const t of Object.keys(ROOMS) as RoomType[]) expect(types.has(t)).toBe(true);
    expect(w.state.rooms.every((r) => r.staffId !== -1)).toBe(true);
    expect(w.state.staff.filter((s) => s.state === 'atPost').length).toBeGreaterThanOrEqual(w.state.rooms.length);
    expect(w.state.patients.length).toBeGreaterThanOrEqual(10);
  });
});
