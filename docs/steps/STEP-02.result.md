# STEP 02 result: shared package (`@mal/shared`)

References used: N/A (no UI in this step). Error copy follows `docs/DESIGN.md` section 9.

## Files changed
| File | What |
|---|---|
| `shared/package.json` | `zod ^4.6.7` dependency (MIT), `test:coverage` script = `vitest run --coverage --retry=0` |
| `shared/src/constants.ts` | `APP_NAME`, `DEFAULT_TIMEZONE`, `PRIORITIES`, `ACTION_STATUSES`, `DECISION_STATUSES`, `ERROR_CODES` (code -> HTTP status) + types |
| `shared/src/dates.ts` | Date and derived-state helpers (below) |
| `shared/src/schemas/common.ts` | `objectIdSchema`/`objectId`, `idParamSchema`, `isoDateSchema`, `time24Schema`, field builders |
| `shared/src/schemas/member.ts` | `memberCreate(Schema)`, `memberUpdate(Schema)` + types |
| `shared/src/schemas/meeting.ts` | `meetingCreate(Schema)`, `meetingUpdate(Schema)` + types |
| `shared/src/schemas/decision.ts` | `decisionCreate/Update/Convert/Dismiss(Schema)`, `decisionConvertTaskItemSchema` + types |
| `shared/src/schemas/action.ts` | `actionCreate/Update/Status/Extend(Schema)`, `validateActionDueDate`, `DUE_PAST`, `DUE_BEFORE_MEETING` + types |
| `shared/src/schemas/query.ts` | `paginationQuerySchema`, `listQueryMembers/Meetings/Decisions/Actions(Schema)`, `listQueryMeetingDecisionsSchema`, `listQueryMeetingActionsSchema`, `listQueryUnconvertedSchema`, `listQueryWeeklySchema` + types |
| `shared/src/index.ts` | Barrel |
| `shared/src/__tests__/dates.test.ts`, `schemas.test.ts` | Property and edge-case tests |

## Functions added
- `todayISO(tz = 'Asia/Kolkata', now = new Date()): string`
- `isValidISODate(s: string): boolean`
- `addDaysISO(iso: string, n: number): string`
- `diffDaysISO(a: string, b: string): number`
- `isOverdue(a: DueTarget, today: string): boolean`
- `daysOverdue(a: DueTarget, today: string): number`
- `dueState(a: DueTarget, today: string, soonDays = 3): { kind: 'done'|'overdue'|'today'|'soon'|'later'; days: number }`
- `completionRate(done: number, total: number): number`
- `isoWeekKey(iso: string): string`
- `enrichActionDerived<T extends DueTarget>(a: T, today: string): T & { isOverdue; daysOverdue; dueState }`
- `validateActionDueDate(dueDate: string, today: string, meetingDate?: string): string | null` (returns the human message or `null`)
- Builders: `objectIdField(message?)`, `isoDateField(message?)`, `optionalText(max, message)`, `hasAnyField(o)`

## Implementation notes (deviations from the literal step text, behaviour-preserving)
1. Uses `setUTCFullYear` instead of `Date.UTC`, because `Date.UTC` maps years 0-99 to 1900-1999 and would reject `0050-01-01`. Behaviour is identical for all spec cases.
2. `addDaysISO` throws `RangeError` when the result falls outside `0000-9999`, e.g. `9999-12-31 + 1` or `n = MAX_SAFE_INTEGER`. Without this it would return an invalid string.
3. Update schemas are built from base field sets **without defaults**. Zod 4 applies `.default()` even inside `.partial()`, so `actionCreate.partial()` would have turned `PATCH {}` into `{ priority: 'medium', status: 'open' }`. A test asserts that `actionUpdate` output keys equal the input keys.
4. ObjectIds are lower-cased on output. Attendee uniqueness is therefore case-insensitive.
5. Query integers accept only digit strings (`/^\d{1,6}$/`) and are then range-checked. `''`, `'1e2'`, `'0x10'`, `' 1'`, repeated keys (arrays) and raw numbers are rejected. `z.coerce.number()` was not used because it accepts `''` and arrays.
6. Query extras: `status` on action lists is CSV (`open,done`, deduped). `overdue` becomes a boolean. An empty `q` becomes `undefined`. `from > to` and `dueFrom > dueTo` fail on the `to`/`dueTo` path.

## Commands run
| Command | Result |
|---|---|
| `npm run lint` | exit 0 (eslint + prettier clean) |
| `npm run typecheck` | exit 0 (all 3 workspaces) |
| `npm run test:100` | 3 files, 124/124 passed, retries 0; repeated 4 more times with new fast-check seeds, 124/124 each time |
| `npm run test:coverage -w @mal/shared` | 100% statements (159/159), branches (62/62), functions (29/29), lines (142/142) |
| `npx license-checker-rseidelsohn --summary --onlyAllow <allowlist>` | exit 0 |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Mutation check (planted bugs: `<` -> `<=` in `isOverdue`, attendee-uniqueness removed, query int regex loosened, `.loose()` on `actionUpdate`) | Each mutation was caught by 1-7 failing tests, then reverted |

## Test counts
| Suite | Tests | Property runs | Passed | Failed |
|---|---|---|---|---|
| `dates.test.ts` (10 functions, valid + invalid + edge tables) | 65 | 18 properties x 100 = 1,800 | 65 | 0 |
| `schemas.test.ts` (every schema, valid + invalid + messages/transforms) | 55 | 58 properties x 100 = 5,800 | 55 | 0 |
| client no-emoji guard (from step 01) | 4 | | 4 | 0 |

## Check in the browser
Nothing: no UI in this step.

## Open questions
1. `validateActionDueDate` returns `string | null`, because the step gave no return type. The server step can map a non-null result to `details: [{ path: 'dueDate', message }]`.
2. Choices the spec left open: `listQueryMeetings` sort defaults to `-date`, decisions to `-decidedAt`, actions to `dueDate`. `listQueryUnconverted` limit defaults to 10.
3. `gitleaks` is still blocked by the local shell allowlist (same as step 01). A regex secret scan of `shared/src` found nothing.
