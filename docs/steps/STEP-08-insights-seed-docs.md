# STEP 08 — Insights API, Seed script, and API documentation

## Goal
Implement the `/api/insights` endpoints (`summary`, `overdue`, `unconverted-decisions`, `weekly-completion`), the relative-date demo data seeder (`server/src/seed/seed.ts`), and comprehensive API documentation (`docs/API.md`), achieving ≥ 90% line and branch coverage across `@mal/server` with 100x tests passing.

## Read first
`CLAUDE.md` §2, §5, §6, §7, §9; `docs/DESIGN.md` §8, §9; `docs/prototype.html`.

## Reference that shapes this screen
N/A (backend step powering R2 Plausible figures strip, sparkline, and bar list on `/` and R1 Linear overdue grouping on `/overdue`).

## Files to create / change
- `server/src/services/insights.service.ts` — `getSummary`, `getOverdueByOwner`, `getUnconvertedDecisions`, `getWeeklyCompletion`.
- `server/src/controllers/insights.controller.ts` — Express 5 handlers for `/api/insights/*`.
- `server/src/routes/insights.routes.ts` — Router mounted at `/api/insights`.
- `server/src/routes/index.routes.ts` — Mount `/insights` router.
- `server/src/seed/seed.ts` — Exported `seedDatabase(now?)` function + CLI runner (`npm run seed`) seeding 5 members, 6 meetings (past + upcoming), decisions in all three states (`pending`, `converted`, `no-action`), and actions so there are always 4 overdue across 3 owners and 3 pending decisions using dates relative to `todayISO()`, with zero emojis.
- `docs/API.md` — Complete REST API documentation with every endpoint, request parameters/body, response example, and error example.
- `server/tests/integration/insights.service.test.ts` — 100x property tests for `insights.service` and `seedDatabase`.
- `server/tests/api/insights.api.test.ts` — 100x Supertest API tests for `/api/insights/*`.

## Functions / endpoints / components (one block each)

### `insightsService.getSummary(now?: Date)` (`GET /api/insights/summary`)
- Returns:
  `{ openActions, overdueActions, doneActions, totalActions, completionRate, pendingDecisions, upcomingMeetings, oldestOverdueDays, totalMeetings }`
  where:
  - `openActions = totalActions - doneActions`
  - `overdueActions` = count of actions where `status !== 'done' && dueDate < today`
  - `completionRate = completionRate(doneActions, totalActions)`
  - `pendingDecisions` = count of decisions with `status === 'pending'`
  - `upcomingMeetings` = count of meetings with `date >= today`
  - `oldestOverdueDays` = max `daysOverdue` among overdue actions (`0` when none)

### `insightsService.getOverdueByOwner(now?: Date)` (`GET /api/insights/overdue`)
- Behaviour:
  1. Find all actions where `status !== 'done' && dueDate < today`, sorted by `dueDate: 1, _id: 1` (oldest first).
  2. Enrich each action with `isOverdue`, `daysOverdue`, `dueState`, `owner`, `meetingTitle`, and `meeting`.
  3. Group by `ownerId`: `{ owner: AttendeeSummary, count: number, oldestDaysOverdue: number, actions: ActionDTO[] }`.
  4. Sort groups by `count` descending, then `oldestDaysOverdue` descending, then `owner.name` ascending.

### `insightsService.getUnconvertedDecisions(query: ListQueryUnconverted, now?: Date)` (`GET /api/insights/unconverted-decisions`)
- Behaviour:
  1. Find decisions with `status: 'pending'`, sorted by `decidedAt: 1, createdAt: 1, _id: 1` (oldest first), limited to `query.limit` (default 10).
  2. Populate `ageDays`, `decidedBy`, `meetingTitle`, and `meeting`.

### `insightsService.getWeeklyCompletion(query: ListQueryWeekly, now?: Date)` (`GET /api/insights/weekly-completion`)
- Behaviour:
  1. Compute the `weeks` (default 8, 1..52) consecutive ISO weeks ending at `isoWeekKey(today)`, oldest -> newest, zero-filled: `[{ week: 'YYYY-Www', completed: 0 }, ...]`.
  2. Query all actions with `status: 'done'` and non-null `completedAt`.
  3. For each completed action, compute `completedDate = todayISO(env.APP_TIMEZONE, action.completedAt)` and `wk = isoWeekKey(completedDate)`. Increment the bucket if `wk` is in the window.
  4. Return the ordered array `[{ week, completed }]`.

### `seedDatabase(now?: Date)` (`server/src/seed/seed.ts`)
- Behaviour:
  1. Clears `ActionModel`, `DecisionModel`, `MeetingModel`, `MemberModel`.
  2. Inserts 5 members (`Ananya Rao`, `Karthik Shetty`, `Meera Iyer`, `Rahul Nair`, `Priya Menon` with hues `176, 28, 320, 46, 250`).
  3. Inserts 6 meetings (4 past, 2 upcoming relative to `today`).
  4. Inserts 7 decisions across the meetings (`3 pending`, `3 converted`, `1 no-action`).
  5. Inserts 11 actions across the meetings (`4 overdue` across 3 owners: Karthik 2, Ananya 1, Rahul 1; `1 due today`; `2 due soon/later`; `4 done` spread across recent weeks so the weekly completion sparkline has rich data).
  6. Links converted decisions' `actionIds`. Zero emojis anywhere.

## Tests (100x protocol, CLAUDE.md §9)
- `server/tests/integration/insights.service.test.ts`: 100x property runs testing `getSummary`, `getOverdueByOwner` (grouping + sort order), `getUnconvertedDecisions` (oldest first + ageDays), `getWeeklyCompletion` (zero-filled ISO weeks), and `seedDatabase` invariants.
- `server/tests/api/insights.api.test.ts`: 100 valid + 100 invalid requests across `/api/insights/summary`, `/api/insights/overdue`, `/api/insights/unconverted-decisions`, `/api/insights/weekly-completion`.
- Command: `npm run lint && npm run typecheck && npm run test:100 && npx vitest run --workspace=@mal/server --coverage`

## Acceptance gate
- [ ] All 4 `/api/insights` endpoints implemented and mounted.
- [ ] `seed.ts` populates realistic demo data with 3–5 overdue actions across 3 owners and 3 pending decisions, zero emojis.
- [ ] `docs/API.md` documents every endpoint with request/response/error examples.
- [ ] Full server test suite passes 100x with coverage ≥ 90% lines and branches.
- [ ] `docs/steps/STEP-08.result.md` written and committed.

## Deliverable
Write `docs/steps/STEP-08.result.md` and commit `"step 08: insights api, seed and api docs"`.
