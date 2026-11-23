import { describe, it, expect } from 'vitest';
import { calendar, timeOfDay, DAY, MONTH, salaryFor } from '../src/sim/economy';

describe('calendar', () => {
  it('starts on day 1 of month 0, year 1, at 8am', () => {
    expect(calendar(0)).toMatchObject({ day: 1, month: 0, year: 1, monthIndex: 0 });
    expect(timeOfDay(0)).toBeCloseTo(8 / 24, 5);
  });
  it('rolls days, months and years', () => {
    expect(DAY).toBe(90);
    expect(MONTH).toBe(450);
    expect(calendar(DAY)).toMatchObject({ day: 2, month: 0 });
    expect(calendar(MONTH)).toMatchObject({ day: 1, month: 1, monthIndex: 1 });
    expect(calendar(MONTH * 12)).toMatchObject({ month: 0, year: 2, monthIndex: 12 });
  });
  it('pays base salary plus a per-star raise', () => {
    expect(salaryFor('doctor', 3)).toBe(3000);
    expect(salaryFor('nurse', 1)).toBe(1700);
    expect(salaryFor('assistant', 2)).toBe(1400);
  });
});
