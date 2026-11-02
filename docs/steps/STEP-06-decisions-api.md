# STEP 06 — Decisions API

## Goal
Implement the complete Decisions vertical slice (`decisions.service.ts`, `decisions.controller.ts`, `decisions.routes.ts`) mounted at `/api/decisions` and `/api/meetings/:id/decisions`, enforcing the state transition table (`pending -> converted | no-action`, `no-action -> pending`, `converted -> pending` only when no linked actions remain, `converted -> converted` adds more tasks) and testing 100x random state transition sequences plus 100x API fuzzing.

## Read first
`CLAUDE.md` §5, §6, §7, §9; `docs/DESIGN.md` §7.5, §8, §9.

## Reference that shapes this screen
N/A (backend step supporting R3 Todoist decision rows on `/decisions` and `/meetings/:id`, and the Decision -> task conversion signature workflow).

## Files to create / change
- `server/src/services/decisions.service.ts` — `create`, `listByMeeting`, `list`, `get`, `update`, `remove`, `convert`, `dismiss`, `reopen`.
- `server/src/controllers/decisions.controller.ts` — Express 5 handlers for all decision endpoints.
- `server/src/routes/decisions.routes.ts` — Router for `/api/decisions`.
- `server/src/routes/meetings.routes.ts` — Add `GET /:id/decisions` and `POST /:id/decisions`.
- `server/src/routes/index.routes.ts` — Mount `/decisions` router.
- `server/tests/integration/decisions.service.test.ts` — 100x property tests including 100 random state-machine transition sequences.
- `server/tests/api/decisions.api.test.ts` — 100x Supertest API tests across all decision endpoints.

## Functions / endpoints / components (one block each)

### State transition table
| Current state | Operation | Next state | Rule / Error |
|---|---|---|---|
| `pending` | `convert(actions)` | `converted` | Creates 1–10 linked actions, appends `actionIds` |
| `pending` | `dismiss(reason?)` | `no-action` | Sets `noActionReason` |
| `pending` | `reopen()` | — | `CONFLICT` 409 `"Decision is already open in the inbox."` |
| `no-action` | `reopen()` | `pending` | Clears `noActionReason` |
| `no-action` | `convert(actions)` | — | `CONFLICT` 409 `"This decision was marked as no action needed. Reopen it first."` |
| `no-action` | `dismiss(reason?)` | `no-action` | Updates `noActionReason` |
| `converted` | `convert(actions)` | `converted` | Creates additional linked actions and appends `actionIds` |
| `converted` | `dismiss()` | — | `CONFLICT` 409 `"This decision already has tasks and cannot be marked as no action."` |
| `converted` | `reopen()` | `pending` (if 0 actions left) | If linked actions still exist -> `CONFLICT` 409 `"Delete all linked tasks before reopening this decision."` |

### `decisionsService.convert(decisionId, { actions }, now?)`
- Input: `decisionId` (ObjectId), `actions` (1–10 items `{ title, description?, ownerId, dueDate, priority }`).
- Behaviour, in order:
  1. Load decision; missing -> `NOT_FOUND` 404 `"Decision not found."`
  2. If `decision.status === 'no-action'` -> `CONFLICT` 409 `"This decision was marked as no action needed. Reopen it first."`
  3. Load its meeting (`decision.meetingId`); missing -> `NOT_FOUND` 404 `"Meeting not found."`
  4. Validate every `ownerId` exists in `MemberModel` and every `dueDate` satisfies `validateActionDueDate(dueDate, today, meeting.date)`. Collect any errors into `details[{ path: 'actions.<i>.ownerId' | 'actions.<i>.dueDate', message }]` and throw `VALIDATION_ERROR` 400.
  5. Create all actions with `meetingId = decision.meetingId`, `decisionId = decision._id`, `status = 'open'`. If creation fails partway, delete any actions created in this call before rethrowing.
  6. Append new action `_id`s to `decision.actionIds`, set `decision.status = 'converted'`, save decision.
  7. Return `{ decision: DecisionDTO, actions: ActionDTO[] }`.

## Tests (100x protocol, CLAUDE.md §9)
- `server/tests/integration/decisions.service.test.ts`:
  - 100 valid `create`, `list`, `update`, `remove` runs (verifying `DELETE` keeps linked actions and sets `decisionId = null`).
  - 100 `convert` runs verifying `decision.status === 'converted'` and every returned action has `decisionId === decision.id` and appears in `decision.actionIds`.
  - 100 random transition sequences (`convert`, `dismiss`, `reopen`, `deleteAction`) asserting the state machine never enters an invalid state.
- `server/tests/api/decisions.api.test.ts`:
  - 100 valid + 100 fuzzed invalid requests across `/api/meetings/:id/decisions`, `/api/decisions`, `/api/decisions/:id`, `/api/decisions/:id/convert`, `/api/decisions/:id/dismiss`, `/api/decisions/:id/reopen`.
- Command: `npm run lint && npm run typecheck && npm run test:100`

## Acceptance gate
- [ ] All decision endpoints and state transition rules implemented.
- [ ] 100x service and API tests pass 100/100 with `retries: 0`.
- [ ] `npm run lint` and `npm run typecheck` pass.
- [ ] `docs/steps/STEP-06.result.md` written and committed.

## Deliverable
Write `docs/steps/STEP-06.result.md` and commit `"step 06: decisions api"`.
