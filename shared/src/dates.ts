import { DEFAULT_TIMEZONE } from './constants';

const DAY_MS = 86_400_000;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface DueTarget {
  status: string;
  dueDate: string;
}
export type DueKind = 'done' | 'overdue' | 'today' | 'soon' | 'later';
export interface DueState {
  kind: DueKind;
  days: number;
}

// setUTCFullYear instead of Date.UTC: Date.UTC maps years 0-99 to 1900-1999.
function utcMs(y: number, m: number, d: number): number {
  const dt = new Date(0);
  dt.setUTCFullYear(y, m - 1, d);
  return dt.getTime();
}

function toMs(iso: string): number {
  if (!isValidISODate(iso)) throw new RangeError(`Invalid ISO date: ${String(iso)}`);
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return utcMs(y, m, d);
}

function fromMs(ms: number): string {
  const dt = new Date(ms);
  const out = `${String(dt.getUTCFullYear()).padStart(4, '0')}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  if (!isValidISODate(out)) throw new RangeError('Date out of range');
  return out;
}

export function todayISO(tz: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new RangeError('Invalid Date');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function isValidISODate(s: string): boolean {
  if (typeof s !== 'string' || !ISO_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const dt = new Date(utcMs(y, m, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDaysISO(iso: string, n: number): string {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Invalid day count: ${String(n)}`);
  return fromMs(toMs(iso) + n * DAY_MS);
}

export function diffDaysISO(a: string, b: string): number {
  return Math.round((toMs(a) - toMs(b)) / DAY_MS);
}

export function isOverdue(a: DueTarget, today: string): boolean {
  toMs(a.dueDate);
  toMs(today);
  return a.status !== 'done' && a.dueDate < today;
}

export function daysOverdue(a: DueTarget, today: string): number {
  return isOverdue(a, today) ? diffDaysISO(today, a.dueDate) : 0;
}

export function dueState(a: DueTarget, today: string, soonDays = 3): DueState {
  if (!Number.isInteger(soonDays) || soonDays < 0) {
    throw new RangeError(`Invalid soonDays: ${String(soonDays)}`);
  }
  const delta = diffDaysISO(a.dueDate, today);
  if (a.status === 'done') return { kind: 'done', days: 0 };
  if (delta < 0) return { kind: 'overdue', days: -delta };
  if (delta === 0) return { kind: 'today', days: 0 };
  if (delta <= soonDays) return { kind: 'soon', days: delta };
  return { kind: 'later', days: delta };
}

export function completionRate(done: number, total: number): number {
  const ok =
    Number.isInteger(done) && Number.isInteger(total) && done >= 0 && total >= 0 && done <= total;
  if (!ok) throw new RangeError(`Invalid counts: ${String(done)}/${String(total)}`);
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function isoWeekKey(iso: string): string {
  const ms = toMs(iso);
  const dow = new Date(ms).getUTCDay() || 7;
  const thursday = new Date(ms + (4 - dow) * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const week = Math.ceil(((thursday.getTime() - utcMs(isoYear, 1, 1)) / DAY_MS + 1) / 7);
  return `${String(isoYear).padStart(4, '0')}-W${String(week).padStart(2, '0')}`;
}

export type WithDerived<T> = T & { isOverdue: boolean; daysOverdue: number; dueState: DueState };

/** Adds the never-stored derived fields (CLAUDE.md section 5) to an action. */
export function enrichActionDerived<T extends DueTarget>(a: T, today: string): WithDerived<T> {
  return {
    ...a,
    isOverdue: isOverdue(a, today),
    daysOverdue: daysOverdue(a, today),
    dueState: dueState(a, today),
  };
}
