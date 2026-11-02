# STEP 07 — Actions API

## Goal
Implement the complete Actions vertical slice (`actions.service.ts`, `actions.controller.ts`, `actions.routes.ts`) mounted at `/api/actions` and `/api/meetings/:id/actions`, including `create`, `list` (with all filters including `overdue=true|false`, `status` CSV, `ownerId`, `meetingId`, `decisionId`, `dueFrom`, `dueTo`, `q`, `sort`), `get`, `update` (with `dueDate` validation and `completedAt` rules), `setStatus` (`completedAt` set/cleared), `extend` (`addDaysISO(max(today, dueDate), days)`, 409 on `done`), and `remove` (removes from `decision.actionIds` and returns decision to `pending` when empty), with derived fields (`isOverdue`, `daysOverdue`, `dueState`) on every response.

## Read first
`CLAUDE.md` §5, §6, §7, §9; `docs/DESIGN.md` §7.4, §8, §9.

## Reference that shapes this screen
N/A (backend step supporting R1 Linear ledger rows across Today, Meeting detail, and Overdue screens).

## Files to create / change
- `server/src/services/actions.service.ts` — `create`, `listByMeeting`, `list`, `get`, `update`, `setStatus`, `extend`, `remove`.
- `server/src/controllers/actions.controller.ts` — Express 5 handlers for all action endpoints.
- `server/src/routes/actions.routes.ts` — Router for `/api/actions`.
- `server/src/routes/meetings.routes.ts` — Add `GET /:id/actions` and `POST /:id/actions`.
- `server/src/routes/index.routes.ts` — Mount `/actions` router.
- `server/tests/integration/actions.service.test.ts` — 100x property tests with randomised `today` (`now`).
- `server/tests/api/actions.api.test.ts` — 100x Supertest API tests across all action endpoints.

## Functions / endpoints / components (one block each)

### `actionsService.create(meetingId, input, now?)`
- Behaviour:
  1. Load meeting (`meetingId`); missing -> `NOT_FOUND` 404 `"Meeting not found."`
  2. Validate `ownerId` exists in `MemberModel` -> else `VALIDATION_ERROR` 400 `details[{ path: 'ownerId', message: 'Pick who owns this task.' }]`.
  3. Validate `dueDate` via `validateActionDueDate(input.dueDate, today, meeting.date)` -> else `VALIDATION_ERROR` 400 `details[{ path: 'dueDate', message }]`.
  4. If `input.decisionId` is provided, verify decision exists in the same meeting and is not `'no-action'`.
  5. Create action with `completedAt = input.status === 'done' ? now : null`.
  6. If `input.decisionId` was provided, append action `_id` to `decision.actionIds` and set `decision.status = 'converted'`.
  7. Return enriched `ActionDTO` with `isOverdue`, `daysOverdue`, `dueState`, `owner`, and `meeting`.

### `actionsService.setStatus(id, { status }, now?)`
- Behaviour:
  1. Load action; missing -> `NOT_FOUND` 404 `"Action not found."`
  2. If `status === 'done'` and `doc.status !== 'done'`, set `doc.completedAt = now`.
  3. If `status !== 'done'`, set `doc.completedAt = null`.
  4. Set `doc.status = status`, save, and return enriched `ActionDTO`.

### `actionsService.extend(id, { days }, now?)`
- Behaviour:
  1. Load action; missing -> `NOT_FOUND` 404 `"Action not found."`
  2. If `doc.status === 'done'`, throw `ApiError.conflict('Completed actions cannot be extended.')`.
  3. Compute `today = todayISO(env.APP_TIMEZONE, now)` and `base = doc.dueDate > today ? doc.dueDate : today`.
  4. Set `doc.dueDate = addDaysISO(base, days)`, save, and return enriched `ActionDTO`.

### `actionsService.remove(id, now?)`
- Behaviour:
  1. Load action; missing -> `NOT_FOUND` 404 `"Action not found."`
  2. Delete action document.
  3. If `doc.decisionId` was set, pull `doc._id` from `decision.actionIds`; if no actions remain for that decision and `decision.status === 'converted'`, set `decision.status = 'pending'`.

## Tests (100x protocol, CLAUDE.md §9)
- `server/tests/integration/actions.service.test.ts`: 100x property tests with randomised `today` testing `create`, `list` (including `overdue=true|false`), `update`, `setStatus` (`completedAt` set/cleared), `extend` (`max(today, dueDate) + days`, 409 on `done`), and `remove` (decision reverts to `pending` when last linked action is deleted).
- `server/tests/api/actions.api.test.ts`: 100 valid + 100 fuzzed invalid requests across `/api/meetings/:id/actions`, `/api/actions`, `/api/actions/:id`, `/api/actions/:id/status`, `/api/actions/:id/extend`.
- Command: `npm run lint && npm run typecheck && npm run test:100`

## Acceptance gate
- [ ] All action endpoints and business rules implemented.
- [ ] 100x service and API tests pass 100/100 with `retries: 0`.
- [ ] `npm run lint` and `npm run typecheck` pass.
- [ ] `docs/steps/STEP-07.result.md` written and committed.

## Deliverable
Write `docs/steps/STEP-07.result.md` and commit `"step 07: actions api"`.
