import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ACTION_STATUSES, DEFAULT_TIMEZONE } from '../constants';
import {
  addDaysISO,
  completionRate,
  daysOverdue,
  diffDaysISO,
  dueState,
  enrichActionDerived,
  isOverdue,
  isValidISODate,
  isoWeekKey,
  todayISO,
} from '../dates';

const RUNS = { numRuns: 100 };
const DAY = 86_400_000;
const IST_OFFSET = 5.5 * 3_600_000;

// Valid ISO dates between 1900 and 2200 (oracle: Date#toISOString).
const isoDate = fc
  .date({
    min: new Date('1900-01-01T00:00:00Z'),
    max: new Date('2200-12-31T00:00:00Z'),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString().slice(0, 10));
const instant = fc.date({
  min: new Date('1970-01-01T00:00:00Z'),
  max: new Date('2100-01-01T00:00:00Z'),
  noInvalidDate: true,
});
const status = fc.constantFrom(...ACTION_STATUSES);
const openStatus = fc.constantFrom('open', 'in-progress', 'blocked');
const pad = (n: number, w: number) => String(n).padStart(w, '0');
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Invalid ISO-ish strings: wrong shape, impossible month/day, Feb 29 in common years.
const invalidIso = fc.oneof(
  fc.string().filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
  fc
    .tuple(
      fc.integer({ min: 1000, max: 9999 }),
      fc.integer({ min: 13, max: 99 }),
      fc.integer({ min: 1, max: 28 }),
    )
    .map(([y, m, d]) => `${y}-${pad(m, 2)}-${pad(d, 2)}`),
  fc
    .tuple(
      fc.integer({ min: 1000, max: 9999 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 32, max: 99 }),
    )
    .map(([y, m, d]) => `${y}-${pad(m, 2)}-${pad(d, 2)}`),
  fc
    .tuple(fc.integer({ min: 1000, max: 9999 }), fc.integer({ min: 1, max: 12 }))
    .map(([y, m]) => `${y}-${pad(m, 2)}-00`),
  fc
    .tuple(fc.integer({ min: 1000, max: 9999 }), fc.constantFrom('04', '06', '09', '11'))
    .map(([y, m]) => `${y}-${m}-31`),
  fc
    .integer({ min: 1000, max: 9999 })
    .filter((y) => !isLeap(y))
    .map((y) => `${y}-02-29`),
);

describe('todayISO', () => {
  it('100 valid: matches fixed-offset oracle in UTC and Asia/Kolkata', () => {
    fc.assert(
      fc.property(instant, (now) => {
        expect(todayISO('UTC', now)).toBe(now.toISOString().slice(0, 10));
        expect(todayISO('Asia/Kolkata', now)).toBe(
          new Date(now.getTime() + IST_OFFSET).toISOString().slice(0, 10),
        );
        expect(isValidISODate(todayISO(DEFAULT_TIMEZONE, now))).toBe(true);
      }),
      RUNS,
    );
  });

  it('100 invalid: unknown timezones and invalid dates throw RangeError', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Z][a-z]{3,10}$/), instant, (name, now) => {
        expect(() => todayISO(`Nowhere/${name}`, now)).toThrow(RangeError);
        expect(() => todayISO('UTC', new Date(Number.NaN))).toThrow(RangeError);
      }),
      RUNS,
    );
  });

  it('edge cases: IST midnight boundary and defaults', () => {
    const t = new Date('2026-11-01T18:30:00.000Z');
    expect(todayISO('Asia/Kolkata', t)).toBe('2026-11-02');
    expect(todayISO('UTC', t)).toBe('2026-11-01');
    // 23:59 IST vs 00:00 IST
    expect(todayISO('Asia/Kolkata', new Date('2026-11-01T18:29:59.999Z'))).toBe('2026-11-01');
    expect(todayISO(undefined, t)).toBe('2026-11-02');
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(() => todayISO('UTC', 'x' as unknown as Date)).toThrow(RangeError);
  });
});

describe('isValidISODate', () => {
  it('100 valid: real calendar dates are accepted', () => {
    fc.assert(
      fc.property(isoDate, (d) => {
        expect(isValidISODate(d)).toBe(true);
      }),
      RUNS,
    );
  });

  it('100 invalid: malformed or impossible dates are rejected', () => {
    fc.assert(
      fc.property(invalidIso, (s) => {
        expect(isValidISODate(s)).toBe(false);
      }),
      RUNS,
    );
  });

  it.each([
    ['2024-02-29', true],
    ['2000-02-29', true],
    ['0050-01-01', true],
    ['1900-02-29', false],
    ['2026-02-29', false],
    ['2026-02-30', false],
    ['2026-00-10', false],
    ['2026-13-01', false],
    ['2026-04-31', false],
    ['2026-1-1', false],
    ['2026-01-01T00:00:00Z', false],
    ['', false],
    [' 2026-01-01', false],
  ])('edge %s -> %s', (s, ok) => {
    expect(isValidISODate(s)).toBe(ok);
  });

  it('rejects non-string input', () => {
    expect(isValidISODate(20260101 as unknown as string)).toBe(false);
  });
});

describe('addDaysISO', () => {
  it('100 valid: diffDaysISO(addDaysISO(d, n), d) === n and round-trips', () => {
    fc.assert(
      fc.property(isoDate, fc.integer({ min: -20000, max: 20000 }), (d, n) => {
        const out = addDaysISO(d, n);
        expect(isValidISODate(out)).toBe(true);
        expect(diffDaysISO(out, d)).toBe(n);
        expect(addDaysISO(out, -n)).toBe(d);
      }),
      RUNS,
    );
  });

  it('100 invalid: bad date or non-integer n throws RangeError', () => {
    fc.assert(
      fc.property(
        invalidIso,
        isoDate,
        fc.oneof(fc.double({ noInteger: true }), fc.constantFrom(Number.NaN, Infinity, 2 ** 53)),
        (bad, good, n) => {
          expect(() => addDaysISO(bad, 1)).toThrow(RangeError);
          expect(() => addDaysISO(good, n)).toThrow(RangeError);
        },
      ),
      RUNS,
    );
  });

  it.each([
    ['2026-01-31', 1, '2026-02-01'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2026-02-28', 1, '2026-03-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2024-03-01', -1, '2024-02-29'],
    ['2026-05-10', 0, '2026-05-10'],
    ['0050-01-01', 1, '0050-01-02'],
  ])('edge %s + %i = %s', (d, n, out) => {
    expect(addDaysISO(d, n)).toBe(out);
  });

  it('throws when the result leaves the 0000-9999 range', () => {
    expect(() => addDaysISO('9999-12-31', 1)).toThrow(RangeError);
    expect(() => addDaysISO('0000-01-01', -1)).toThrow(RangeError);
    expect(() => addDaysISO('2026-01-01', Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});

describe('diffDaysISO', () => {
  it('100 valid: antisymmetric and matches epoch-day oracle', () => {
    fc.assert(
      fc.property(isoDate, isoDate, (a, b) => {
        const expected = Math.round((Date.parse(a) - Date.parse(b)) / DAY);
        expect(diffDaysISO(a, b)).toBe(expected);
        expect(diffDaysISO(b, a)).toBe(-expected || 0);
        expect(diffDaysISO(a, a)).toBe(0);
      }),
      RUNS,
    );
  });

  it('100 invalid: any invalid side throws RangeError', () => {
    fc.assert(
      fc.property(invalidIso, isoDate, (bad, good) => {
        expect(() => diffDaysISO(bad, good)).toThrow(RangeError);
        expect(() => diffDaysISO(good, bad)).toThrow(RangeError);
      }),
      RUNS,
    );
  });

  it.each([
    ['2024-03-01', '2024-02-28', 2],
    ['2026-03-01', '2026-02-28', 1],
    ['2027-01-01', '2026-12-31', 1],
    ['2026-01-01', '2027-01-01', -365],
  ])('edge %s - %s = %i', (a, b, n) => {
    expect(diffDaysISO(a, b)).toBe(n);
  });
});

describe('isOverdue / daysOverdue', () => {
  it('100 valid: daysOverdue > 0 <=> isOverdue, matching status and date rule', () => {
    fc.assert(
      fc.property(status, isoDate, isoDate, (s, dueDate, today) => {
        const a = { status: s, dueDate };
        const expected = s !== 'done' && diffDaysISO(today, dueDate) > 0;
        expect(isOverdue(a, today)).toBe(expected);
        const days = daysOverdue(a, today);
        expect(days > 0).toBe(expected);
        expect(days).toBe(expected ? diffDaysISO(today, dueDate) : 0);
      }),
      RUNS,
    );
  });

  it('100 invalid: malformed dueDate or today throws RangeError', () => {
    fc.assert(
      fc.property(status, invalidIso, isoDate, (s, bad, good) => {
        expect(() => isOverdue({ status: s, dueDate: bad }, good)).toThrow(RangeError);
        expect(() => isOverdue({ status: s, dueDate: good }, bad)).toThrow(RangeError);
        expect(() => daysOverdue({ status: s, dueDate: bad }, good)).toThrow(RangeError);
      }),
      RUNS,
    );
  });

  it('edge cases: today, yesterday, tomorrow, done', () => {
    const today = '2026-11-02';
    expect(isOverdue({ status: 'open', dueDate: '2026-11-01' }, today)).toBe(true);
    expect(isOverdue({ status: 'open', dueDate: today }, today)).toBe(false);
    expect(isOverdue({ status: 'blocked', dueDate: '2026-11-03' }, today)).toBe(false);
    expect(isOverdue({ status: 'done', dueDate: '2020-01-01' }, today)).toBe(false);
    expect(daysOverdue({ status: 'in-progress', dueDate: '2026-10-24' }, today)).toBe(9);
    expect(daysOverdue({ status: 'done', dueDate: '2026-10-24' }, today)).toBe(0);
  });
});

describe('dueState', () => {
  it('100 valid: kind and days follow the offset from today', () => {
    fc.assert(
      fc.property(
        openStatus,
        isoDate,
        fc.integer({ min: -400, max: 400 }),
        fc.integer({ min: 0, max: 14 }),
        (s, today, k, soon) => {
          const r = dueState({ status: s, dueDate: addDaysISO(today, k) }, today, soon);
          if (k < 0) expect(r).toEqual({ kind: 'overdue', days: -k });
          else if (k === 0) expect(r).toEqual({ kind: 'today', days: 0 });
          else if (k <= soon) expect(r).toEqual({ kind: 'soon', days: k });
          else expect(r).toEqual({ kind: 'later', days: k });
          expect(dueState({ status: 'done', dueDate: addDaysISO(today, k) }, today, soon)).toEqual({
            kind: 'done',
            days: 0,
          });
        },
      ),
      RUNS,
    );
  });

  it('100 invalid: bad dates or soonDays throw RangeError', () => {
    fc.assert(
      fc.property(
        invalidIso,
        isoDate,
        fc.oneof(fc.integer({ max: -1 }), fc.double({ noInteger: true }), fc.constant(Number.NaN)),
        (bad, good, soon) => {
          expect(() => dueState({ status: 'open', dueDate: bad }, good)).toThrow(RangeError);
          expect(() => dueState({ status: 'done', dueDate: good }, bad)).toThrow(RangeError);
          expect(() => dueState({ status: 'open', dueDate: good }, good, soon)).toThrow(RangeError);
        },
      ),
      RUNS,
    );
  });

  it.each([
    ['2026-11-01', { kind: 'overdue', days: 1 }],
    ['2026-11-02', { kind: 'today', days: 0 }],
    ['2026-11-03', { kind: 'soon', days: 1 }],
    ['2026-11-05', { kind: 'soon', days: 3 }],
    ['2026-11-06', { kind: 'later', days: 4 }],
  ])('edge default soonDays=3: due %s', (dueDate, expected) => {
    expect(dueState({ status: 'open', dueDate }, '2026-11-02')).toEqual(expected);
  });
});

describe('completionRate', () => {
  const counts = fc
    .integer({ min: 0, max: 1_000_000 })
    .chain((total) => fc.tuple(fc.integer({ min: 0, max: total }), fc.constant(total)));

  it('100 valid: integer 0..100, exact rounding, monotonic in done', () => {
    fc.assert(
      fc.property(counts, ([done, total]) => {
        const r = completionRate(done, total);
        expect(Number.isInteger(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(100);
        expect(r).toBe(total === 0 ? 0 : Math.round((done / total) * 100));
        if (done < total) expect(completionRate(done + 1, total)).toBeGreaterThanOrEqual(r);
      }),
      RUNS,
    );
  });

  it('100 invalid: negatives, fractions, NaN, done > total throw RangeError', () => {
    const bad = fc.oneof(
      fc.tuple(fc.integer({ max: -1 }), fc.nat()),
      fc.tuple(fc.nat(), fc.integer({ max: -1 })),
      fc.tuple(fc.double({ noInteger: true }), fc.nat()),
      fc.tuple(fc.nat(), fc.constant(Number.NaN)),
      fc
        .nat({ max: 1000 })
        .chain((t) => fc.tuple(fc.integer({ min: t + 1, max: t + 1000 }), fc.constant(t))),
    );
    fc.assert(
      fc.property(bad, ([d, t]) => {
        expect(() => completionRate(d, t)).toThrow(RangeError);
      }),
      RUNS,
    );
  });

  it.each([
    [0, 0, 0],
    [0, 5, 0],
    [5, 5, 100],
    [1, 3, 33],
    [2, 3, 67],
    [1, 8, 13],
  ])('edge %i/%i = %i', (d, t, r) => {
    expect(completionRate(d, t)).toBe(r);
  });
});

describe('isoWeekKey', () => {
  const WEEK_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

  it('100 valid: format, Monday..Sunday share a key, next Monday differs', () => {
    fc.assert(
      fc.property(isoDate, (d) => {
        const key = isoWeekKey(d);
        expect(key).toMatch(WEEK_RE);
        const dow = new Date(`${d}T00:00:00Z`).getUTCDay() || 7;
        const monday = addDaysISO(d, 1 - dow);
        for (let i = 0; i < 7; i++) expect(isoWeekKey(addDaysISO(monday, i))).toBe(key);
        expect(isoWeekKey(addDaysISO(monday, 7))).not.toBe(key);
        // ISO year is the calendar year of that week's Thursday.
        expect(key.slice(0, 4)).toBe(addDaysISO(monday, 3).slice(0, 4));
      }),
      RUNS,
    );
  });

  it('100 invalid: malformed dates throw RangeError', () => {
    fc.assert(
      fc.property(invalidIso, (s) => {
        expect(() => isoWeekKey(s)).toThrow(RangeError);
      }),
      RUNS,
    );
  });

  it.each([
    ['2026-01-01', '2026-W01'],
    ['2027-01-01', '2026-W53'],
    ['2024-12-30', '2025-W01'],
    ['2021-01-03', '2020-W53'],
    ['2026-11-02', '2026-W45'],
    ['2026-12-31', '2026-W53'],
  ])('edge %s -> %s', (d, k) => {
    expect(isoWeekKey(d)).toBe(k);
  });
});

describe('enrichActionDerived', () => {
  it('100 valid: preserves fields and matches the individual helpers', () => {
    fc.assert(
      fc.property(status, isoDate, isoDate, fc.string(), (s, dueDate, today, title) => {
        const a = { status: s, dueDate, title };
        const r = enrichActionDerived(a, today);
        expect(r).toEqual({
          ...a,
          isOverdue: isOverdue(a, today),
          daysOverdue: daysOverdue(a, today),
          dueState: dueState(a, today),
        });
        expect(a).not.toHaveProperty('isOverdue');
      }),
      RUNS,
    );
  });

  it('100 invalid: malformed dates throw RangeError', () => {
    fc.assert(
      fc.property(status, invalidIso, isoDate, (s, bad, good) => {
        expect(() => enrichActionDerived({ status: s, dueDate: bad }, good)).toThrow(RangeError);
        expect(() => enrichActionDerived({ status: s, dueDate: good }, bad)).toThrow(RangeError);
      }),
      RUNS,
    );
  });

  it('edge: overdue open action', () => {
    expect(enrichActionDerived({ status: 'open', dueDate: '2026-10-30' }, '2026-11-02')).toEqual({
      status: 'open',
      dueDate: '2026-10-30',
      isOverdue: true,
      daysOverdue: 3,
      dueState: { kind: 'overdue', days: 3 },
    });
  });
});
