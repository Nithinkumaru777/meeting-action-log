# STEP 07 result: Actions API

References used: N/A (backend step supporting R1 Linear ledger rows across Today, Meeting detail, and Overdue screens).

## Files changed
| File | Purpose |
|---|---|
| `server/src/services/actions.service.ts` | `create`, `listByMeeting`, `list`, `get`, `update`, `setStatus`, `extend`, `remove` with derived fields (`isOverdue`, `daysOverdue`, `dueState`) and decision status sync |
| `server/src/controllers/actions.controller.ts` | Express 5 handlers (`listMeetingActions`, `createMeetingAction`, `listActions`, `getAction`, `updateAction`, `deleteAction`, `setActionStatus`, `extendAction`) |
| `server/src/routes/actions.routes.ts` | Router mounted at `/api/actions` |
| `server/src/routes/meetings.routes.ts` | Added `GET /:id/actions` and `POST /:id/actions` |
| `server/src/routes/index.routes.ts` | Mounts `/actions` |
| `server/tests/integration/actions.service.test.ts` | 100x property tests with randomised `today` |
| `server/tests/api/actions.api.test.ts` | 100x Supertest API tests for all action endpoints |

## Functions added
- `actionsService.create(meetingId: string, input: ActionCreate, now?: Date): Promise<ActionDTO>`
- `actionsService.listByMeeting(meetingId: string, query?: ListQueryMeetingActions, now?: Date): Promise<ActionDTO[]>`
- `actionsService.list(query: ListQueryActions, now?: Date): Promise<{ data: ActionDTO[]; meta: PaginationMeta }>`
- `actionsService.get(id: string, now?: Date): Promise<ActionDTO>`
- `actionsService.update(id: string, patch: ActionUpdate, now?: Date): Promise<ActionDTO>`
- `actionsService.setStatus(id: string, body: ActionStatusBody, now?: Date): Promise<ActionDTO>`
- `actionsService.extend(id: string, body: ActionExtend, now?: Date): Promise<ActionDTO>`
- `actionsService.remove(id: string): Promise<void>`

## Commands run
| Command | Result |
|---|---|
| `npx vitest run server/tests/integration/actions.service.test.ts server/tests/api/actions.api.test.ts --retry=0` | 5/5 passed (500 property runs, 0 failed) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |

## Test counts (retries 0)
| Suite | Tests | Property runs | Passed | Failed |
|---|---|---|---|---|
| `actions.service.test.ts` | 3 | 300 | 3 | 0 |
| `actions.api.test.ts` | 2 | 200 | 2 | 0 |
