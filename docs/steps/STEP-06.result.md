# STEP 06 result: Decisions API

References used: N/A (backend step supporting R3 Todoist decision rows on `/decisions` and `/meetings/:id`, and the Decision -> task conversion signature workflow).

## Files changed
| File | Purpose |
|---|---|
| `server/src/services/decisions.service.ts` | `create`, `listByMeeting`, `list`, `get`, `update`, `remove`, `convert`, `dismiss`, `reopen` with state machine transition enforcement and atomic rollback on convert failure |
| `server/src/controllers/decisions.controller.ts` | Express 5 handlers (`listMeetingDecisions`, `createMeetingDecision`, `listDecisions`, `getDecision`, `updateDecision`, `deleteDecision`, `convertDecision`, `dismissDecision`, `reopenDecision`) |
| `server/src/routes/decisions.routes.ts` | Router mounted at `/api/decisions` |
| `server/src/routes/meetings.routes.ts` | Added `GET /:id/decisions` and `POST /:id/decisions` |
| `server/src/routes/index.routes.ts` | Mounts `/decisions` |
| `server/tests/integration/decisions.service.test.ts` | 100x property and random state-machine transition tests |
| `server/tests/api/decisions.api.test.ts` | 100x Supertest API tests for all decision endpoints |

## Functions added
- `decisionsService.create(meetingId: string, input: DecisionCreate, now?: Date): Promise<DecisionDTO>`
- `decisionsService.listByMeeting(meetingId: string, query?: ListQueryMeetingDecisions, now?: Date): Promise<DecisionDTO[]>`
- `decisionsService.list(query: ListQueryDecisions, now?: Date): Promise<{ data: DecisionDTO[]; meta: PaginationMeta }>`
- `decisionsService.get(id: string, now?: Date): Promise<DecisionDTO>`
- `decisionsService.update(id: string, patch: DecisionUpdate, now?: Date): Promise<DecisionDTO>`
- `decisionsService.remove(id: string): Promise<void>`
- `decisionsService.convert(decisionId: string, input: DecisionConvert, now?: Date): Promise<{ decision: DecisionDTO; actions: ConvertedActionDTO[] }>`
- `decisionsService.dismiss(decisionId: string, input?: DecisionDismiss, now?: Date): Promise<DecisionDTO>`
- `decisionsService.reopen(decisionId: string, now?: Date): Promise<DecisionDTO>`

## Commands run
| Command | Result |
|---|---|
| `npx vitest run server/tests/integration/decisions.service.test.ts server/tests/api/decisions.api.test.ts --retry=0` | 6/6 passed (600 property runs, 0 failed) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |

## Test counts (retries 0)
| Suite | Tests | Property runs | Passed | Failed |
|---|---|---|---|---|
| `decisions.service.test.ts` | 3 | 300 | 3 | 0 |
| `decisions.api.test.ts` | 3 | 300 | 3 | 0 |
