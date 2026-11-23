import { ROLES, type Role } from './catalog';
import type { WorldState } from './state';

export const DAY = 90;
export const MONTH_DAYS = 5;
export const MONTH = DAY * MONTH_DAYS;
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** t=0 is 8am */
const START_OFFSET = (8 / 24) * DAY;

export function calendar(t: number) {
  const monthIndex = Math.floor(t / MONTH);
  return {
    monthIndex,
    month: monthIndex % 12,
    year: Math.floor(monthIndex / 12) + 1,
    day: Math.floor((t % MONTH) / DAY) + 1,
  };
}

export function monthLabel(monthIndex: number) {
  return `${MONTH_NAMES[monthIndex % 12]} Y${Math.floor(monthIndex / 12) + 1}`;
}

/** 0..1 through the day; 0.5 is noon */
export function timeOfDay(t: number): number {
  return ((t + START_OFFSET) % DAY) / DAY;
}

export function isNight(t: number) {
  const tod = timeOfDay(t);
  return tod < 0.25 || tod > 0.85;
}

export function salaryFor(role: Role, skill: number) {
  return ROLES[role].baseSalary + ROLES[role].perSkill * skill;
}

export function adjustRep(s: WorldState, delta: number) {
  s.reputation = Math.max(0, Math.min(100, s.reputation + delta));
}

export function earn(s: WorldState, amount: number) {
  s.money += amount;
  s.stats.earned += amount;
  s.monthStats.earned += amount;
}
