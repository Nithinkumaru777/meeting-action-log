# STEP 05 — Meetings API

## Goal
Implement the complete Meetings vertical slice (`meetings.service.ts`, `meetings.controller.ts`, `meetings.routes.ts`) mounted at `/api/meetings`, including attendee existence validation, `list` with `q/status/from/to/page/limit/sort` and per-meeting `stats { decisions, pendingDecisions, actions, doneActions, overdueActions }`, `getWithDetails` with populated `attendees`, `decisions`, `actions` (with derived fields), and `stats`, `update` with 409 check when removing an attendee who owns open actions in that meeting, and `remove` with cascade deletion of decisions and actions.

## Read first
`CLAUDE.md` §5, §6, §7, §9; `docs/DESIGN.md` §8, §9.

## Reference that shapes this screen
N/A (backend step supporting R1 Linear timetable rows on `/meetings` and R1 + R3 meeting detail view on `/meetings/:id`).

## Files to create / change
- `server/src/services/meetings.service.ts` — `create`, `list`, `getWithDetails`, `update`, `remove`.
- `server/src/controllers/meetings.controller.ts` — Express 5 handlers for `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.
- `server/src/routes/meetings.routes.ts` — Express router mounted at `/api/meetings`.
- `server/src/routes/index.routes.ts` — Mount `/meetings` router.
- `server/tests/integration/meetings.service.test.ts` — 100x property tests for `meetings.service`.
- `server/tests/api/meetings.api.test.ts` — 100x Supertest API tests for `/api/meetings`.

## Functions / endpoints / components (one block each)

### `meetingsService.create(input: MeetingCreate, now?: Date)`
- Input: `{ title, date, startTime, durationMin, attendeeIds, agenda?, notes?, tags? }`.
- Behaviour:
  1. Verify every ID in `input.attendeeIds` exists in `MemberModel`. If any ID is missing, throw `ApiError.validation('Check the highlighted fields.', [{ path: 'attendeeIds', message: 'One or more selected attendees do not exist.' }])`.
  2. Create meeting document.
  3. Return serialized meeting with `stats: { decisions: 0, pendingDecisions: 0, actions: 0, doneActions: 0, overdueActions: 0 }`.

### `meetingsService.list(query: ListQueryMeetings, now?: Date)`
- Input: `{ q?, status = 'all', from?, to?, page = 1, limit = 20, sort = '-date' }`.
- Behaviour:
  1. Compute `today = todayISO(env.APP_TIMEZONE, now)`.
  2. Build filter:
     - `status === 'upcoming'` -> `date >= today`
     - `status === 'past'` -> `date < today`
     - `from` / `to` -> narrow `date` range (`$gte` / `$lte`, intersecting with `status` filter)
     - `q` -> case-insensitive regex match on `title`, `agenda`, `notes`, or `tags`.
  3. Sort order:
     - `'-date'` -> `{ date: -1, startTime: -1, _id: -1 }`
     - `'date'` -> `{ date: 1, startTime: 1, _id: 1 }`
     - `'title'` -> `{ title: 1, _id: 1 }`
  4. Fetch paginated meetings and aggregate `Decision` and `Action` stats per meeting (`decisions`, `pendingDecisions`, `actions`, `doneActions`, `overdueActions`), plus populated `attendees` summary.
  5. Return `{ data, meta }`.

### `meetingsService.getWithDetails(id: string, now?: Date)`
- Behaviour:
  1. Load meeting by `id`; missing -> `NOT_FOUND` 404 `'Meeting not found.'`.
  2. Load `attendees` (preserving or sorting cleanly), `decisions` for `meetingId` (with `ageDays` and `decidedBy`), and `actions` for `meetingId` (enriched with `isOverdue`, `daysOverdue`, `dueState`, and `owner`).
  3. Compute `stats { decisions, pendingDecisions, actions, doneActions, overdueActions }`.
  4. Return `{ ...meeting, attendees, decisions, actions, stats }`.

### `meetingsService.update(id: string, patch: MeetingUpdate, now?: Date)`
- Behaviour:
  1. Load meeting by `id`; missing -> `NOT_FOUND` 404 `'Meeting not found.'`.
  2. If `patch.attendeeIds` is provided:
     - Verify all `patch.attendeeIds` exist in `MemberModel`, else throw `VALIDATION_ERROR` 400 with `details: [{ path: 'attendeeIds', message: 'One or more selected attendees do not exist.' }]`.
     - Identify removed attendee IDs (`oldAttendeeIds` not in `patch.attendeeIds`).
     - If any removed attendee owns an action in this meeting with `status !== 'done'`, throw `ApiError.conflict('Cannot remove an attendee who still owns open actions in this meeting.')`.
  3. Apply updates, save, and return updated meeting with `stats`.

### `meetingsService.remove(id: string)`
- Behaviour:
  1. Load meeting by `id`; missing -> `NOT_FOUND` 404 `'Meeting not found.'`.
  2. Delete all `ActionModel` and `DecisionModel` documents with `meetingId: doc._id`, then delete the meeting document.

## Tests (100x protocol, CLAUDE.md §9)
- `server/tests/integration/meetings.service.test.ts`: 100 valid runs + 100 invalid/conflict runs covering `create` (unknown attendee -> 400 `details[path=attendeeIds]`), `list` (`q`, `status=upcoming|past|all`, `from`, `to`, `sort`, accurate per-meeting `stats`), `getWithDetails`, `update` (409 when removing attendee with open action in meeting, 200 when action is `done`), `remove` (cascades decisions and actions).
- `server/tests/api/meetings.api.test.ts`: 100 valid + 100 fuzzed invalid HTTP requests across `GET /api/meetings`, `POST /api/meetings`, `GET /api/meetings/:id`, `PATCH /api/meetings/:id`, `DELETE /api/meetings/:id`.
- Command: `npm run lint && npm run typecheck && npm run test:100`

## Acceptance gate
- [ ] All `/api/meetings` endpoints implemented and mounted.
- [ ] 100x service and API tests pass 100/100 with `retries: 0`.
- [ ] `npm run lint` and `npm run typecheck` pass.
- [ ] `docs/steps/STEP-05.result.md` written and committed.

## Deliverable
Write `docs/steps/STEP-05.result.md` and commit `"step 05: meetings api"`.
