import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  ACTION_STATUSES,
  DECISION_STATUSES,
  DUE_BEFORE_MEETING,
  DUE_PAST,
  ERROR_CODES,
  PRIORITIES,
  actionCreate,
  actionExtend,
  actionStatus,
  actionUpdate,
  addDaysISO,
  decisionConvert,
  decisionConvertTaskItemSchema,
  decisionCreate,
  decisionDismiss,
  decisionUpdate,
  idParamSchema,
  isoDateSchema,
  listQueryActions,
  listQueryDecisions,
  listQueryMeetingActionsSchema,
  listQueryMeetingDecisionsSchema,
  listQueryMeetings,
  listQueryMembers,
  listQueryUnconvertedSchema,
  listQueryWeeklySchema,
  meetingCreate,
  meetingUpdate,
  memberCreate,
  memberUpdate,
  objectId,
  paginationQuerySchema,
  time24Schema,
  validateActionDueDate,
} from '../index';

const RUNS = { numRuns: 100 };
type Obj = Record<string, unknown>;
type Bad = Record<string, fc.Arbitrary<unknown>>;

// ---------- generic 100x runners ----------
function assertValid(schema: z.ZodType, arb: fc.Arbitrary<unknown>) {
  fc.assert(
    fc.property(arb, (v) => {
      const r = schema.safeParse(v);
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    }),
    RUNS,
  );
}
function assertInvalid(schema: z.ZodType, arb: fc.Arbitrary<unknown>) {
  fc.assert(
    fc.property(arb, (v) => {
      expect(schema.safeParse(v).success).toBe(false);
    }),
    RUNS,
  );
}
/** Valid base object with exactly one fault: an unknown key (strict) or one bad field. */
function oneFault(base: fc.Arbitrary<Obj>, bad: Bad): fc.Arbitrary<Obj> {
  return fc.oneof(
    fc
      .tuple(base, fc.stringMatching(/^x[a-z]{1,8}$/), fc.jsonValue())
      .map(([v, k, x]) => ({ ...v, [k]: x })),
    ...Object.entries(bad).map(([k, arb]) =>
      fc.tuple(base, arb).map(([v, x]) => ({ ...v, [k]: x })),
    ),
  );
}
/** Partial of a full valid record with at least one key. */
const someOf = (full: fc.Arbitrary<Obj>) =>
  full.chain((o) =>
    fc
      .subarray(Object.keys(o), { minLength: 1 })
      .map((ks) => Object.fromEntries(ks.map((k) => [k, o[k]]))),
  );

// ---------- field arbitraries ----------
const hex24 = fc.stringMatching(/^[0-9a-fA-F]{24}$/);
const text = (min: number, max: number) =>
  fc.string({ minLength: min, maxLength: max }).filter((s) => s.trim().length >= min);
const optText = (max: number) => fc.string({ maxLength: max });
const isoDate = fc
  .date({
    min: new Date('1900-01-01T00:00:00Z'),
    max: new Date('2200-12-31T00:00:00Z'),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString().slice(0, 10));
const email = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9]{1,12}(\.[a-zA-Z0-9]{1,8})?$/),
    fc.stringMatching(/^[a-z0-9]{1,12}$/),
    fc.stringMatching(/^[a-z]{2,6}$/),
  )
  .map(([l, d, t]) => `${l}@${d}.${t}`);
const time = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
const priority = fc.constantFrom(...PRIORITIES);
const aStatus = fc.constantFrom(...ACTION_STATUSES);

// ---------- bad-value arbitraries ----------
const notString = fc.oneof(
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.array(fc.nat(), { maxLength: 2 }),
);
const badText = (min: number, max: number, required = true) =>
  fc.oneof(
    fc.string({ maxLength: Math.max(0, min - 1) }),
    fc.constant(' '.repeat(min + 2)),
    fc.string({ minLength: max + 1, maxLength: max + 40 }).filter((s) => s.trim().length > max),
    notString,
    ...(required ? [fc.constant(undefined)] : []),
  );
const badLong = (max: number) =>
  fc.oneof(
    fc.string({ minLength: max + 1, maxLength: max + 40 }).filter((s) => s.trim().length > max),
    notString,
  );
const badId = fc.oneof(
  fc.string().filter((s) => !/^[0-9a-fA-F]{24}$/.test(s)),
  fc.stringMatching(/^[0-9a-f]{23}$/),
  fc.stringMatching(/^[0-9a-f]{25}$/),
  fc.constant({ $gt: '' }),
  fc.integer(),
  fc.constant(undefined),
);
const badDate = fc.oneof(
  fc.string().filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
  fc.integer({ min: 1000, max: 9999 }).map((y) => `${y}-02-30`),
  fc.integer({ min: 1000, max: 9999 }).map((y) => `${y}-13-01`),
  fc.integer({ min: 1000, max: 9999 }).map((y) => `${y}-04-31`),
  fc.constant('2026-1-1'),
  fc.constant(undefined),
  fc.integer(),
);
const badTime = fc.oneof(
  fc.string().filter((s) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(s)),
  fc.integer({ min: 24, max: 99 }).map((h) => `${h}:00`),
  fc.integer({ min: 60, max: 99 }).map((m) => `12:${m}`),
  fc.constant('9:30'),
  fc.constant(undefined),
);
const badIntRange = (min: number, max: number) =>
  fc.oneof(
    fc.integer({ max: min - 1 }),
    fc.integer({ min: max + 1 }),
    fc.double({ noInteger: true, min, max }),
    fc.constant(Number.NaN),
    fc.integer({ min, max }).map(String),
    fc.constant(undefined),
  );
const badEnum = fc.oneof(
  fc
    .string()
    .filter(
      (s) =>
        !['low', 'medium', 'high', 'critical', 'open', 'in-progress', 'blocked', 'done'].includes(
          s,
        ),
    ),
  fc.integer(),
  fc.constant(null),
);

// ---------- object arbitraries ----------
const member = fc.record(
  { name: text(2, 60), email, role: optText(40), avatarHue: fc.integer({ min: 0, max: 359 }) },
  { requiredKeys: ['name', 'email'] },
);
const memberBad: Bad = {
  name: badText(2, 60),
  email: fc.oneof(
    fc.string().filter((s) => !s.includes('@')),
    fc.constant('a@b'),
    fc.constant('a..b@x.io'),
    notString,
    fc.constant(undefined),
  ),
  role: badLong(40),
  avatarHue: badIntRange(0, 359).filter((x) => x !== undefined),
};

const meeting = fc.record(
  {
    title: text(3, 100),
    date: isoDate,
    startTime: time,
    durationMin: fc.integer({ min: 5, max: 480 }),
    attendeeIds: fc.uniqueArray(hex24, {
      minLength: 1,
      maxLength: 50,
      comparator: (a, b) => a.toLowerCase() === b.toLowerCase(),
    }),
    agenda: optText(500),
    notes: optText(5000),
    tags: fc.array(text(1, 24), { maxLength: 10 }),
  },
  { requiredKeys: ['title', 'date', 'startTime', 'durationMin', 'attendeeIds'] },
);
const meetingBad: Bad = {
  title: badText(3, 100),
  date: badDate,
  startTime: badTime,
  durationMin: badIntRange(5, 480),
  attendeeIds: fc.oneof(
    fc.constant([]),
    fc.array(hex24, { minLength: 51, maxLength: 60 }),
    hex24.map((id) => [id, id]),
    fc.array(
      badId.filter((x) => x !== undefined),
      { minLength: 1, maxLength: 3 },
    ),
    hex24,
    fc.constant(undefined),
  ),
  agenda: badLong(500),
  notes: badLong(5000),
  tags: fc.oneof(
    fc.array(text(1, 24), { minLength: 11, maxLength: 15 }),
    fc.constant(['ok', '   ']),
    fc.constant(['x'.repeat(25)]),
    fc.string(),
  ),
};

const decision = fc.record(
  { text: text(5, 200), rationale: optText(1000), decidedById: hex24, decidedAt: isoDate },
  { requiredKeys: ['text', 'decidedById'] },
);
const decisionBad: Bad = {
  text: badText(5, 200),
  rationale: badLong(1000),
  decidedById: badId,
  decidedAt: badDate.filter((x) => x !== undefined),
};
const decisionUpd = someOf(
  fc.record({ text: text(5, 200), rationale: optText(1000), decidedById: hex24 }),
);

const taskItem = fc.record(
  { title: text(3, 120), description: optText(1000), ownerId: hex24, dueDate: isoDate, priority },
  { requiredKeys: ['title', 'ownerId', 'dueDate'] },
);
const taskBad: Bad = {
  title: badText(3, 120),
  description: badLong(1000),
  ownerId: badId,
  dueDate: badDate,
  priority: badEnum,
};

const action = fc.record(
  {
    title: text(3, 120),
    description: optText(1000),
    ownerId: hex24,
    dueDate: isoDate,
    priority,
    status: aStatus,
    decisionId: hex24,
  },
  { requiredKeys: ['title', 'ownerId', 'dueDate'] },
);
const actionBad: Bad = {
  ...taskBad,
  status: badEnum,
  decisionId: badId.filter((x) => x !== undefined),
};
const actionUpd = someOf(
  fc.record({
    title: text(3, 120),
    description: optText(1000),
    ownerId: hex24,
    dueDate: isoDate,
    priority,
    status: aStatus,
  }),
);
const updateBad = (base: fc.Arbitrary<Obj>, bad: Bad) =>
  fc.oneof(
    fc.constant({}),
    oneFault(
      base,
      Object.fromEntries(
        Object.entries(bad).map(([k, a]) => [k, a.filter((x) => x !== undefined)]),
      ),
    ),
  );

// ---------- tests ----------
describe('constants', () => {
  it('error codes map to HTTP statuses', () => {
    expect(ERROR_CODES).toEqual({
      VALIDATION_ERROR: 400,
      INVALID_ID: 400,
      NOT_FOUND: 404,
      CONFLICT: 409,
      RATE_LIMITED: 429,
      INTERNAL: 500,
    });
    expect(DECISION_STATUSES).toEqual(['pending', 'converted', 'no-action']);
  });
});

describe('common schemas', () => {
  it('objectId 100 valid (output lower-cased)', () => {
    assertValid(objectId, hex24);
    fc.assert(
      fc.property(hex24, (id) => {
        expect(objectId.parse(id)).toBe(id.toLowerCase());
      }),
      RUNS,
    );
  });
  it('objectId 100 invalid', () => assertInvalid(objectId, badId));
  it('objectId message', () => {
    expect(objectId.safeParse('nope').error?.issues[0]?.message).toBe('Invalid identifier.');
  });
  it('idParam 100 valid / 100 invalid', () => {
    assertValid(
      idParamSchema,
      hex24.map((id) => ({ id })),
    );
    assertInvalid(
      idParamSchema,
      oneFault(
        hex24.map((id) => ({ id })),
        { id: badId },
      ),
    );
  });
  it('isoDate 100 valid / 100 invalid', () => {
    assertValid(isoDateSchema, isoDate);
    assertInvalid(isoDateSchema, badDate);
  });
  it('time24 100 valid / 100 invalid', () => {
    assertValid(time24Schema, time);
    assertInvalid(time24Schema, badTime);
  });
});

describe('member schemas', () => {
  it('memberCreate 100 valid', () => assertValid(memberCreate, member));
  it('memberCreate 100 invalid', () => assertInvalid(memberCreate, oneFault(member, memberBad)));
  it('memberUpdate 100 valid', () => assertValid(memberUpdate, someOf(member)));
  it('memberUpdate 100 invalid', () => assertInvalid(memberUpdate, updateBad(member, memberBad)));
  it('edge: trims, lower-cases email, human messages', () => {
    expect(memberCreate.parse({ name: '  Asha  ', email: ' Asha@Example.COM ' })).toEqual({
      name: 'Asha',
      email: 'asha@example.com',
    });
    const r = memberCreate.safeParse({ name: 'A', email: 'bad' });
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      'Enter a name between 2 and 60 characters.',
      'Enter a valid email address.',
    ]);
    expect(memberCreate.safeParse({ name: 'x'.repeat(61), email: 'a@b.io' }).success).toBe(false);
    expect(memberCreate.safeParse({ name: 'x'.repeat(60), email: 'a@b.io' }).success).toBe(true);
    expect(memberUpdate.safeParse({}).error?.issues[0]?.message).toBe(
      'Provide at least one field to update.',
    );
    expect(memberUpdate.safeParse({ name: undefined }).success).toBe(false);
  });
});

describe('meeting schemas', () => {
  it('meetingCreate 100 valid', () => assertValid(meetingCreate, meeting));
  it('meetingCreate 100 invalid', () =>
    assertInvalid(meetingCreate, oneFault(meeting, meetingBad)));
  it('meetingUpdate 100 valid', () => assertValid(meetingUpdate, someOf(meeting)));
  it('meetingUpdate 100 invalid', () =>
    assertInvalid(meetingUpdate, updateBad(meeting, meetingBad)));
  it('edge: human messages and duplicate ids differing only in case', () => {
    const id = 'a'.repeat(24);
    const base = { title: 'Weekly sync', date: '2026-11-02', startTime: '09:30', durationMin: 30 };
    const msg = (v: unknown) => meetingCreate.safeParse(v).error?.issues[0]?.message;
    expect(msg({ ...base, attendeeIds: [] })).toBe('Add at least one attendee.');
    expect(msg({ ...base, attendeeIds: [id, id.toUpperCase()] })).toBe('Attendees must be unique.');
    expect(msg({ ...base, attendeeIds: [id], date: '2026-02-30' })).toBe('Pick a date.');
    expect(msg({ ...base, attendeeIds: [id], startTime: '24:00' })).toBe('Pick a start time.');
    expect(msg({ ...base, attendeeIds: [id], durationMin: 481 })).toBe(
      'Use a duration between 5 and 480 minutes.',
    );
    expect(msg({ ...base, attendeeIds: [id], title: 'ab' })).toBe(
      'Give the meeting a title of 3 to 100 characters.',
    );
  });
});

describe('decision schemas', () => {
  it('decisionCreate 100 valid', () => assertValid(decisionCreate, decision));
  it('decisionCreate 100 invalid', () =>
    assertInvalid(decisionCreate, oneFault(decision, decisionBad)));
  it('decisionUpdate 100 valid', () => assertValid(decisionUpdate, decisionUpd));
  it('decisionUpdate 100 invalid', () =>
    assertInvalid(
      decisionUpdate,
      fc.oneof(
        updateBad(decisionUpd, {
          text: decisionBad.text!,
          rationale: decisionBad.rationale!,
          decidedById: decisionBad.decidedById!,
        }),
        // decidedAt and status are not editable through PATCH
        decisionUpd.map((v) => ({ ...v, decidedAt: '2026-01-01' })),
        decisionUpd.map((v) => ({ ...v, status: 'converted' })),
      ),
    ));
  it('decisionConvert 100 valid (priority defaults to medium)', () => {
    const arb = fc.array(taskItem, { minLength: 1, maxLength: 10 }).map((actions) => ({ actions }));
    assertValid(decisionConvert, arb);
    fc.assert(
      fc.property(arb, (v) => {
        const out = decisionConvert.parse(v);
        out.actions.forEach((a, i) => expect(a.priority).toBe(v.actions[i]?.priority ?? 'medium'));
      }),
      RUNS,
    );
  });
  it('decisionConvert 100 invalid', () =>
    assertInvalid(
      decisionConvert,
      fc.oneof(
        fc.constant({ actions: [] }),
        fc.constant({}),
        fc.array(taskItem, { minLength: 11, maxLength: 13 }).map((actions) => ({ actions })),
        oneFault(taskItem, taskBad).map((bad) => ({ actions: [bad] })),
        fc.tuple(taskItem, fc.jsonValue()).map(([a, x]) => ({ actions: [a], extra: x })),
        fc.tuple(taskItem, hex24).map(([a, m]) => ({ actions: [{ ...a, meetingId: m }] })),
      ),
    ));
  it('decisionConvertTaskItem 100 valid / 100 invalid', () => {
    assertValid(decisionConvertTaskItemSchema, taskItem);
    assertInvalid(decisionConvertTaskItemSchema, oneFault(taskItem, taskBad));
  });
  it('decisionDismiss 100 valid / 100 invalid', () => {
    assertValid(decisionDismiss, fc.record({ reason: optText(200) }, { requiredKeys: [] }));
    assertInvalid(
      decisionDismiss,
      oneFault(fc.record({ reason: optText(200) }, { requiredKeys: [] }), { reason: badLong(200) }),
    );
  });
  it('edge: messages', () => {
    expect(
      decisionCreate
        .safeParse({ text: 'abcd', decidedById: 'x' })
        .error?.issues.map((i) => i.message),
    ).toEqual(['Write the decision in at least 5 characters.', 'Pick who made this decision.']);
    expect(decisionConvert.safeParse({ actions: [] }).error?.issues[0]?.message).toBe(
      'Add at least one task.',
    );
  });
});

describe('action schemas', () => {
  it('actionCreate 100 valid (defaults applied)', () => {
    assertValid(actionCreate, action);
    fc.assert(
      fc.property(action, (v) => {
        const out = actionCreate.parse(v);
        expect(out.priority).toBe(v.priority ?? 'medium');
        expect(out.status).toBe(v.status ?? 'open');
      }),
      RUNS,
    );
  });
  it('actionCreate 100 invalid', () => assertInvalid(actionCreate, oneFault(action, actionBad)));
  it('actionUpdate 100 valid and never injects defaults', () => {
    assertValid(actionUpdate, actionUpd);
    fc.assert(
      fc.property(actionUpd, (v) => {
        expect(Object.keys(actionUpdate.parse(v)).sort()).toEqual(Object.keys(v).sort());
      }),
      RUNS,
    );
  });
  it('actionUpdate 100 invalid', () => {
    const { decisionId: _ignored, ...updBad } = actionBad;
    void _ignored;
    assertInvalid(
      actionUpdate,
      fc.oneof(
        updateBad(actionUpd, updBad),
        actionUpd.map((v) => ({ ...v, meetingId: 'a'.repeat(24) })),
      ),
    );
  });
  it('actionStatus 100 valid / 100 invalid', () => {
    assertValid(
      actionStatus,
      aStatus.map((status) => ({ status })),
    );
    assertInvalid(
      actionStatus,
      oneFault(
        aStatus.map((status) => ({ status })),
        { status: badEnum },
      ),
    );
  });
  it('actionExtend 100 valid / 100 invalid', () => {
    const ok = fc.integer({ min: 1, max: 30 }).map((days) => ({ days }));
    assertValid(actionExtend, ok);
    assertInvalid(actionExtend, oneFault(ok, { days: badIntRange(1, 30) }));
    expect(actionExtend.safeParse({ days: 31 }).error?.issues[0]?.message).toBe(
      'Extend by 1 to 30 days.',
    );
  });
  it('edge: messages', () => {
    const msgs = actionCreate
      .safeParse({ title: 'ab', ownerId: '', dueDate: '2026-02-30' })
      .error?.issues.map((i) => i.message);
    expect(msgs).toEqual([
      'Add a title of at least 3 characters.',
      'Pick who owns this task.',
      'Pick a due date.',
    ]);
  });
});

describe('validateActionDueDate', () => {
  const offset = fc.integer({ min: 0, max: 400 });
  it('100 valid: due >= today and >= meeting date returns null', () => {
    fc.assert(
      fc.property(isoDate, offset, offset, fc.boolean(), (today, a, b, withMeeting) => {
        const meetingDate = addDaysISO(today, a - 200);
        const due = addDaysISO(today, Math.max(a - 200, 0) + b);
        expect(validateActionDueDate(due, today, withMeeting ? meetingDate : undefined)).toBeNull();
      }),
      RUNS,
    );
  });
  it('100 invalid: past, before meeting, or malformed', () => {
    fc.assert(
      fc.property(isoDate, fc.integer({ min: 1, max: 400 }), badDate, (today, k, bad) => {
        expect(validateActionDueDate(addDaysISO(today, -k), today)).toBe(DUE_PAST);
        expect(validateActionDueDate(today, today, addDaysISO(today, k))).toBe(DUE_BEFORE_MEETING);
        expect(validateActionDueDate(bad as string, today)).toBe('Pick a due date.');
      }),
      RUNS,
    );
  });
  it('edge: boundaries', () => {
    expect(validateActionDueDate('2026-11-02', '2026-11-02', '2026-11-02')).toBeNull();
    expect(validateActionDueDate('2026-11-01', '2026-11-02')).toBe(
      "The due date can't be in the past.",
    );
    expect(validateActionDueDate('2026-11-03', '2026-11-02', '2026-11-04')).toBe(
      "The due date can't be before the meeting date.",
    );
  });
});

// ---------- query schemas ----------
const numStr = (min: number, max: number) => fc.integer({ min, max }).map(String);
const badNumStr = (min: number, max: number) =>
  fc.oneof(
    fc.integer({ max: min - 1 }).map(String),
    fc.integer({ min: max + 1, max: 999_999 }).map(String),
    fc.constantFrom('', 'abc', '1.5', '1e2', ' 1', '0x10', '1234567'),
    numStr(min, max).map((s) => [s, s]),
    fc.integer({ min, max }),
  );
const pageArbs = { page: numStr(1, 1000), limit: numStr(1, 100) };
const pageBad: Bad = { page: badNumStr(1, 100_000), limit: badNumStr(1, 100) };
const qArb = fc.string({ maxLength: 100 });
const qBad = fc.oneof(
  fc.string({ minLength: 101, maxLength: 140 }).filter((s) => s.trim().length > 100),
  fc.array(fc.string(), { minLength: 1, maxLength: 2 }),
);
const statusCsv = fc.subarray([...ACTION_STATUSES], { minLength: 1 }).map((xs) => xs.join(','));
const dateRange = (fromKey: string, toKey: string) =>
  fc
    .tuple(isoDate, fc.integer({ min: 0, max: 400 }))
    .map(([from, n]) => ({ [fromKey]: from, [toKey]: addDaysISO(from, n) }));
const opt = <T>(rec: Record<string, fc.Arbitrary<T>>) => fc.record(rec, { requiredKeys: [] });

const queries: Array<[string, z.ZodType, fc.Arbitrary<Obj>, Bad, fc.Arbitrary<Obj>?]> = [
  ['pagination', paginationQuerySchema, opt(pageArbs), pageBad],
  ['listQueryMembers', listQueryMembers, opt({ ...pageArbs, q: qArb }), { ...pageBad, q: qBad }],
  [
    'listQueryMeetings',
    listQueryMeetings,
    fc
      .tuple(
        opt({
          ...pageArbs,
          q: qArb,
          status: fc.constantFrom('upcoming', 'past', 'all'),
          sort: fc.constantFrom('date', '-date', 'title'),
        }),
        fc.oneof(dateRange('from', 'to'), opt({ from: isoDate }), opt({ to: isoDate })),
      )
      .map(([a, b]) => ({ ...a, ...b })),
    {
      ...pageBad,
      q: qBad,
      status: fc.constantFrom('open', 'ALL', ''),
      sort: fc.constantFrom('-title', 'date,title'),
      from: badDate.filter((x) => x !== undefined),
      to: badDate.filter((x) => x !== undefined),
    },
    dateRange('to', 'from').filter((o) => o.from !== o.to),
  ],
  [
    'listQueryDecisions',
    listQueryDecisions,
    opt({
      ...pageArbs,
      status: fc.constantFrom(...DECISION_STATUSES),
      meetingId: hex24,
      sort: fc.constantFrom('decidedAt', '-decidedAt'),
    }),
    {
      ...pageBad,
      status: fc.constantFrom('open', 'done', ''),
      meetingId: badId.filter((x) => x !== undefined),
      sort: fc.constantFrom('date', ''),
    },
  ],
  [
    'listQueryMeetingDecisions',
    listQueryMeetingDecisionsSchema,
    opt({ status: fc.constantFrom(...DECISION_STATUSES) }),
    { status: fc.constantFrom('open', 'pending,converted', '') },
  ],
  [
    'listQueryMeetingActions',
    listQueryMeetingActionsSchema,
    opt({ status: statusCsv }),
    { status: fc.constantFrom('', 'pending', 'open,closed', 'open,,done') },
  ],
  [
    'listQueryActions',
    listQueryActions,
    fc
      .tuple(
        opt({
          ...pageArbs,
          q: qArb,
          status: statusCsv,
          ownerId: hex24,
          meetingId: hex24,
          decisionId: hex24,
          overdue: fc.constantFrom('true', 'false'),
          sort: fc.constantFrom('dueDate', '-dueDate', 'priority', '-createdAt'),
        }),
        fc.oneof(dateRange('dueFrom', 'dueTo'), opt({ dueFrom: isoDate })),
      )
      .map(([a, b]) => ({ ...a, ...b })),
    {
      ...pageBad,
      q: qBad,
      status: fc.constantFrom('', 'pending', 'open,closed'),
      ownerId: badId.filter((x) => x !== undefined),
      meetingId: badId.filter((x) => x !== undefined),
      decisionId: badId.filter((x) => x !== undefined),
      overdue: fc.constantFrom('yes', '1', 'TRUE', ''),
      dueFrom: badDate.filter((x) => x !== undefined),
      dueTo: badDate.filter((x) => x !== undefined),
      sort: fc.constantFrom('priority,dueDate', 'createdAt'),
    },
    dateRange('dueTo', 'dueFrom').filter((o) => o.dueFrom !== o.dueTo),
  ],
  [
    'listQueryUnconverted',
    listQueryUnconvertedSchema,
    opt({ limit: numStr(1, 100) }),
    { limit: badNumStr(1, 100) },
  ],
  [
    'listQueryWeekly',
    listQueryWeeklySchema,
    opt({ weeks: numStr(1, 52) }),
    { weeks: badNumStr(1, 52) },
  ],
];

describe.each(queries)('%s', (_name, schema, valid, bad, inverted) => {
  it('100 valid', () => assertValid(schema, valid));
  it('100 invalid', () =>
    assertInvalid(
      schema,
      inverted ? fc.oneof(oneFault(valid, bad), inverted) : oneFault(valid, bad),
    ));
});

describe('query transforms', () => {
  it('defaults and coercion', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(listQueryMeetings.parse({ page: '3', q: '   ' })).toEqual({
      page: 3,
      limit: 20,
      status: 'all',
      sort: '-date',
      q: undefined,
    });
    expect(
      listQueryActions.parse({ status: 'open, done,open', overdue: 'false', q: ' x ' }),
    ).toEqual({
      status: ['open', 'done'],
      overdue: false,
      q: 'x',
      page: 1,
      limit: 20,
      sort: 'dueDate',
    });
    expect(listQueryActions.parse({ overdue: 'true' }).overdue).toBe(true);
    expect(listQueryDecisions.parse({}).sort).toBe('-decidedAt');
    expect(listQueryUnconvertedSchema.parse({})).toEqual({ limit: 10 });
    expect(listQueryWeeklySchema.parse({})).toEqual({ weeks: 8 });
    expect(listQueryWeeklySchema.safeParse({ weeks: '53' }).success).toBe(false);
    expect(
      listQueryMeetings.safeParse({ from: '2026-11-03', to: '2026-11-02' }).error?.issues[0]?.path,
    ).toEqual(['to']);
  });
});
