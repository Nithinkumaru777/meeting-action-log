# STEP 02 — Shared package (`@mal/shared`)

## Goal
Implement the complete `@mal/shared` workspace package (`constants.ts`, `dates.ts`, and all Zod schemas under `schemas/{common,member,meeting,decision,action,query}.ts`, re-exported from `src/index.ts`), plus exhaustive 100x property-based and edge-case unit tests with 100% line/branch/function/statement coverage.

## Read first
`CLAUDE.md` §5, §6, §7, §9; `docs/design-spec.md`; `docs/DESIGN.md` §9.

## Reference that shapes this screen
N/A (shared domain logic, date math, and validation schemas with human copy from `docs/DESIGN.md` §9).

## Files to create / change
- `shared/package.json` — Add `zod` dependency and ensure `test:coverage` script runs `vitest run --coverage --retry=0`.
- `shared/src/constants.ts` — Domain enums, constants, default timezone (`DEFAULT_TIMEZONE = 'Asia/Kolkata'`), priorities (`PRIORITIES = ['low', 'medium', 'high', 'critical'] as const`), action statuses (`ACTION_STATUSES = ['open', 'in-progress', 'blocked', 'done'] as const`), decision statuses (`DECISION_STATUSES = ['pending', 'converted', 'no-action'] as const`), error codes (`ERROR_CODES`).
- `shared/src/dates.ts` — Pure timezone-safe ISO date functions and derived action state helpers (`todayISO`, `isValidISODate`, `addDaysISO`, `diffDaysISO`, `isOverdue`, `daysOverdue`, `dueState`, `completionRate`, `isoWeekKey`, `enrichActionDerived`).
- `shared/src/schemas/common.ts` — `objectIdSchema` (`objectId`), `idParamSchema`, `isoDateSchema`, `time24Schema`.
- `shared/src/schemas/member.ts` — `memberCreateSchema` (`memberCreate`), `memberUpdateSchema` (`memberUpdate`), and inferred TypeScript types.
- `shared/src/schemas/meeting.ts` — `meetingCreateSchema` (`meetingCreate`), `meetingUpdateSchema` (`meetingUpdate`), and inferred TypeScript types.
- `shared/src/schemas/decision.ts` — `decisionCreateSchema` (`decisionCreate`), `decisionUpdateSchema` (`decisionUpdate`), `decisionConvertTaskItemSchema`, `decisionConvertSchema` (`decisionConvert`), `decisionDismissSchema` (`decisionDismiss`), and inferred types.
- `shared/src/schemas/action.ts` — `actionCreateSchema` (`actionCreate`), `actionUpdateSchema` (`actionUpdate`), `actionStatusSchema` (`actionStatus`), `actionExtendSchema` (`actionExtend`), `validateActionDueDate`, and inferred types.
- `shared/src/schemas/query.ts` — `paginationQuerySchema`, `listQueryMembersSchema` (`listQueryMembers`), `listQueryMeetingsSchema` (`listQueryMeetings`), `listQueryDecisionsSchema` (`listQueryDecisions`), `listQueryMeetingDecisionsSchema`, `listQueryMeetingActionsSchema`, `listQueryActionsSchema` (`listQueryActions`), `listQueryUnconvertedSchema`, `listQueryWeeklySchema`.
- `shared/src/index.ts` — Barrel re-exporting everything from `constants`, `dates`, and `schemas/*`.
- `shared/src/__tests__/dates.test.ts` — 100x valid + 100x invalid property tests and fixed edge-case tables for all date/metric functions.
- `shared/src/__tests__/schemas.test.ts` — 100x valid + 100x invalid property tests and fixed edge-case tables for every Zod schema.

## Functions / endpoints / components (one block each)

### `todayISO(tz?: string, now?: Date): string`
- Signature: `todayISO(tz = 'Asia/Kolkata', now = new Date()): string`
- Input rules: `tz` is a valid IANA time zone string (defaults to `'Asia/Kolkata'`); `now` is a `Date` instance (must be a valid Date, else throws `RangeError('Invalid Date')`).
- Behaviour:
  1. Verify `now instanceof Date && !Number.isNaN(now.getTime())`.
  2. Format `now` in `tz` using `Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)`.
  3. Extract `year`, `month`, `day` parts and return `${year}-${month}-${day}`.
- Returns: `YYYY-MM-DD` string in `tz`.
- Errors: Throws `RangeError` if `now` is invalid or `tz` is an unknown IANA timezone.
- Edge cases: `23:59` UTC vs `00:00`+ next day in `Asia/Kolkata` (`+05:30`), e.g. `2026-11-01T18:30:00.000Z` is `2026-11-02` in `Asia/Kolkata` and `2026-11-01` in `UTC`.

### `isValidISODate(s: string): boolean`
- Signature: `isValidISODate(s: string): boolean`
- Input rules: Any string `s`.
- Behaviour:
  1. Check `/^\d{4}-\d{2}-\d{2}$/.test(s)`. If false, return `false`.
  2. Parse year, month (`1..12`), day (`1..31`).
  3. Construct `const d = new Date(Date.UTC(year, month - 1, day))`.
  4. Verify `d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day`.
- Returns: `boolean`.
- Edge cases: Rejects `'2026-02-30'`, `'2026-02-29'` (non-leap year), `'2026-00-10'`, `'2026-13-01'`, `'2026-04-31'`, `'2026-1-1'`, `'2026-01-01T00:00:00Z'`; accepts `'2024-02-29'` and `'2000-02-29'`, rejects `'1900-02-29'`.

### `addDaysISO(iso: string, n: number): string`
- Signature: `addDaysISO(iso: string, n: number): string`
- Input rules: `iso` must satisfy `isValidISODate(iso)`; `n` must be a finite integer (`Number.isSafeInteger(n)`).
- Behaviour:
  1. Validate `isValidISODate(iso)` and `Number.isSafeInteger(n)`; otherwise throw `RangeError`.
  2. Parse `year, month, day` from `iso`.
  3. Create `new Date(Date.UTC(year, month - 1, day + n))`.
  4. Format UTC year (4-digit padded), UTC month + 1 (2-digit), UTC date (2-digit) as `YYYY-MM-DD`.
- Returns: `YYYY-MM-DD` string.
- Errors: Throws `RangeError` on invalid `iso` or non-integer `n`.
- Edge cases: Adding across month ends (`2026-01-31` + 1 = `2026-02-01`), leap day (`2024-02-28` + 1 = `2024-02-29`, `2026-02-28` + 1 = `2026-03-01`), year boundary (`2026-12-31` + 1 = `2027-01-01`), negative `n` (`2026-03-01` - 1 = `2026-02-28`).

### `diffDaysISO(a: string, b: string): number`
- Signature: `diffDaysISO(a: string, b: string): number`
- Input rules: Both `a` and `b` must satisfy `isValidISODate`.
- Behaviour:
  1. Validate `isValidISODate(a)` and `isValidISODate(b)`, else throw `RangeError`.
  2. Convert both to UTC midnight epoch ms and return `Math.round((utcA - utcB) / 86_400_000)`.
- Returns: Whole integer days `a - b` (positive when `a > b`, negative when `a < b`, `0` when equal).
- Errors: Throws `RangeError` if `a` or `b` is invalid.

### `isOverdue(a: { status: string; dueDate: string }, today: string): boolean`
- Signature: `isOverdue(a: { status: string; dueDate: string }, today: string): boolean`
- Input rules: `a.dueDate` and `today` must be valid ISO dates (`isValidISODate`).
- Behaviour:
  1. Validate `isValidISODate(a.dueDate)` and `isValidISODate(today)`, else throw `RangeError`.
  2. Return `a.status !== 'done' && a.dueDate < today`.
- Returns: `boolean`.
- Edge cases: `status === 'done'` with past `dueDate` returns `false`; `dueDate === today` returns `false`; `dueDate < today` with `'open' | 'in-progress' | 'blocked'` returns `true`.

### `daysOverdue(a: { status: string; dueDate: string }, today: string): number`
- Signature: `daysOverdue(a: { status: string; dueDate: string }, today: string): number`
- Input rules: `a.dueDate` and `today` must be valid ISO dates.
- Behaviour:
  1. If `!isOverdue(a, today)` return `0`.
  2. Return `diffDaysISO(today, a.dueDate)`.
- Returns: Non-negative integer (`0` when not overdue, `>= 1` when overdue).

### `dueState(a: { status: string; dueDate: string }, today: string, soonDays?: number): DueState`
- Signature: `dueState(a: { status: string; dueDate: string }, today: string, soonDays = 3): { kind: 'done' | 'overdue' | 'today' | 'soon' | 'later'; days: number }`
- Input rules: `a.dueDate` and `today` must be valid ISO dates; `soonDays` must be a non-negative integer (`>= 0`).
- Behaviour:
  1. Validate `isValidISODate(a.dueDate)`, `isValidISODate(today)`, and `Number.isInteger(soonDays) && soonDays >= 0`.
  2. If `a.status === 'done'`, return `{ kind: 'done', days: 0 }`.
  3. Let `delta = diffDaysISO(a.dueDate, today)`.
  4. If `delta < 0`, return `{ kind: 'overdue', days: -delta }`.
  5. If `delta === 0`, return `{ kind: 'today', days: 0 }`.
  6. If `delta <= soonDays`, return `{ kind: 'soon', days: delta }`.
  7. Return `{ kind: 'later', days: delta }`.
- Returns: `{ kind, days }`.

### `completionRate(done: number, total: number): number`
- Signature: `completionRate(done: number, total: number): number`
- Input rules: `done` and `total` must be finite integers with `done >= 0`, `total >= 0`, and `done <= total` (when `total > 0`).
- Behaviour:
  1. Validate `Number.isInteger(done) && Number.isInteger(total) && done >= 0 && total >= 0 && (total === 0 ? done === 0 : done <= total)`, else throw `RangeError`.
  2. If `total === 0`, return `0`.
  3. Return `Math.round((done / total) * 100)`.
- Returns: Integer `0..100`.

### `isoWeekKey(iso: string): string`
- Signature: `isoWeekKey(iso: string): string`
- Input rules: `iso` must satisfy `isValidISODate(iso)`.
- Behaviour:
  1. Validate `isValidISODate(iso)`, else throw `RangeError`.
  2. Compute ISO-8601 week-numbering year and week number (`01`..`53`) in UTC:
     - Convert date to UTC, shift to nearest Thursday (`date + 4 - (dayOfWeek || 7)`).
     - `isoYear = thursday.getUTCFullYear()`.
     - `weekNo = Math.ceil((((thursday - Date.UTC(isoYear, 0, 1)) / 86_400_000) + 1) / 7)`.
  3. Return `${isoYear}-W${String(weekNo).padStart(2, '0')}`.
- Returns: `'YYYY-Www'`.
- Edge cases: `2026-01-01` (Thursday → `2026-W01`), `2027-01-01` (Friday → `2026-W53`), `2024-12-30` (Monday → `2025-W01`).

### Zod schemas (`shared/src/schemas/*`)
- All object schemas MUST call `.strict()` so unknown keys fail with `VALIDATION_ERROR`.
- Strings are `.trim()`med before length checks.
- Human error messages (matching `DESIGN.md` §9):
  - `objectIdSchema`: 24 hex chars, `"Invalid identifier."`
  - `memberCreateSchema`: `name` (2–60, `"Enter a name between 2 and 60 characters."`), `email` (lowercased, valid email, `"Enter a valid email address."`), `role` (optional, `<= 40`, `"Keep the role under 40 characters."`), `avatarHue` (optional int `0..359`, `"Avatar hue must be between 0 and 359."`).
  - `memberUpdateSchema`: partial of `memberCreateSchema`, `.strict()`, refined to require at least 1 key (`"Provide at least one field to update."`).
  - `meetingCreateSchema`: `title` (3–100, `"Give the meeting a title of 3 to 100 characters."`), `date` (`isoDateSchema`, `"Pick a date."`), `startTime` (`HH:mm` 24h, `"Pick a start time."`), `durationMin` (int 5–480, `"Use a duration between 5 and 480 minutes."`), `attendeeIds` (array of 1–50 unique `objectIdSchema`, `"Add at least one attendee."` / `"Attendees must be unique."`), `agenda` (optional `<= 500`), `notes` (optional `<= 5000`), `tags` (optional array `<= 10` of 1–24 char strings).
  - `meetingUpdateSchema`: partial of `meetingCreateSchema`, `.strict()`, at least 1 key.
  - `decisionCreateSchema`: `text` (5–200, `"Write the decision in at least 5 characters."`), `rationale` (optional `<= 1000`), `decidedById` (`objectIdSchema`, `"Pick who made this decision."`), `decidedAt` (optional `isoDateSchema`).
  - `decisionUpdateSchema`: partial of `{ text, rationale, decidedById }`, `.strict()`, at least 1 key.
  - `decisionConvertSchema`: `{ actions: array(1..10) of { title (3..120), description (optional <= 1000), ownerId (objectId), dueDate (isoDate), priority (enum default 'medium') }.strict() }.strict()`.
  - `decisionDismissSchema`: `{ reason: optional string trimmed <= 200 }.strict()`.
  - `actionCreateSchema`: `{ title (3..120, "Add a title of at least 3 characters."), description (optional <= 1000), ownerId (objectId, "Pick who owns this task."), dueDate (isoDate, "Pick a due date."), priority (enum low|medium|high|critical default 'medium'), status (enum open|in-progress|blocked|done default 'open'), decisionId (optional objectId) }.strict()`.
  - `actionUpdateSchema`: partial of `{ title, description, ownerId, dueDate, priority, status }`, `.strict()`, at least 1 key.
  - `actionStatusSchema`: `{ status: enum('open','in-progress','blocked','done') }.strict()`.
  - `actionExtendSchema`: `{ days: int 1..30 ("Extend by 1 to 30 days.") }.strict()`.
  - `validateActionDueDate(dueDate: string, today: string, meetingDate?: string)`: checks `dueDate >= today` (`"The due date can't be in the past."`) and if `meetingDate` is passed, `dueDate >= meetingDate` (`"The due date can't be before the meeting date."`).
  - Query schemas (`listQueryMembers`, `listQueryMeetings`, `listQueryDecisions`, `listQueryMeetingDecisions`, `listQueryMeetingActions`, `listQueryActions`, `listQueryUnconverted`, `listQueryWeekly`): all `.strict()`, coercing numeric `page`/`limit`/`weeks` cleanly while rejecting invalid numbers, non-ISO dates, or unknown query keys.

## Tests (100x protocol, CLAUDE.md §9)
- In `shared/src/__tests__/dates.test.ts`:
  - Every function in `dates.ts` (`todayISO`, `isValidISODate`, `addDaysISO`, `diffDaysISO`, `isOverdue`, `daysOverdue`, `dueState`, `completionRate`, `isoWeekKey`, `enrichActionDerived`) has:
    - 100 valid runs (`fc.assert(fc.property(...), { numRuns: 100 })`) checking invariants (e.g. `diffDaysISO(addDaysISO(d, n), d) === n`, `daysOverdue > 0 <=> isOverdue === true`, `completionRate` bounds and monotonicity, `isoWeekKey` format `/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/`).
    - 100 invalid runs (`fc.assert(fc.property(...), { numRuns: 100 })`) checking rejection/RangeError on malformed dates, out-of-range numbers, invalid timezones.
    - Fixed edge-case tables: leap years (`2024-02-29`, `2000-02-29`, `1900-02-29`, `2026-02-29`, `2026-02-30`), month/year ends (`2026-12-31` -> `2027-01-01`), IST boundary (`23:59` IST vs `00:00` IST).
- In `shared/src/__tests__/schemas.test.ts`:
  - Every schema (`objectId`, `memberCreate`, `memberUpdate`, `meetingCreate`, `meetingUpdate`, `decisionCreate`, `decisionUpdate`, `decisionConvert`, `decisionDismiss`, `actionCreate`, `actionUpdate`, `actionStatus`, `actionExtend`, and all `listQuery*` schemas) has:
    - 100 valid runs with `fast-check` arbitraries asserting `.safeParse(valid).success === true`.
    - 100 invalid runs (too short, too long, bad email/date/time/ObjectId, extra unknown keys for `.strict()`, empty update object) asserting `.safeParse(invalid).success === false`.
- Command: `npm run lint && npm run typecheck && npm run test:100 && npm run test --workspace=@mal/shared -- --coverage`

## Acceptance gate
- [ ] All functions in `CLAUDE.md` §6 and all schemas exported from `@mal/shared`.
- [ ] `npm run lint` and `npm run typecheck` exit 0.
- [ ] `npm run test:100` passes 100/100 on every test with `retries: 0`.
- [ ] Coverage on `@mal/shared` is 100% lines, 100% statements, 100% functions, 100% branches.
- [ ] `docs/steps/STEP-02.result.md` written and committed.

## Deliverable
Write `docs/steps/STEP-02.result.md` and commit `"step 02: shared dates and zod schemas"`.
