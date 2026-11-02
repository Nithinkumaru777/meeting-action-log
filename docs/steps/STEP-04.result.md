# STEP 04 result: Members API

References used: N/A (backend step supporting the R1 Linear ledger rows on `/members`).

## Files changed
| File | Purpose |
|---|---|
| `server/src/models/Member.ts` | Mongoose `Member` schema (`name`, `email` lowercase unique, `role`, `avatarHue`, `timestamps: true`, `applyToJsonTransform`) |
| `server/src/models/Meeting.ts` | Mongoose `Meeting` schema (`title`, `date`, `startTime`, `durationMin`, `attendeeIds`, `agenda`, `notes`, `tags`, `{ date: -1 }` and text indexes) |
| `server/src/models/Decision.ts` | Mongoose `Decision` schema (`meetingId`, `text`, `rationale`, `decidedById`, `decidedAt`, `status`, `noActionReason`, `actionIds`) |
| `server/src/models/Action.ts` | Mongoose `Action` schema (`meetingId`, `decisionId`, `title`, `description`, `ownerId`, `dueDate`, `priority`, `status`, `completedAt`) |
| `server/src/services/members.service.ts` | `create`, `list`, `get`, `update`, `remove` with `openActions` and `overdueActions` aggregation and 409 deletion guards |
| `server/src/controllers/members.controller.ts` | Express 5 handlers (`listMembers`, `createMember`, `getMember`, `updateMember`, `deleteMember`) |
| `server/src/routes/members.routes.ts` | Router mounted at `/api/members` with Zod `validate` middleware |
| `server/src/routes/index.routes.ts` | Mounts `/members` |
| `server/tests/integration/members.service.test.ts` | 100x property tests for `members.service` |
| `server/tests/api/members.api.test.ts` | 100x Supertest API tests for `/api/members` |

## Functions added
- `membersService.create(input: MemberCreate): Promise<MemberDTO>`
- `membersService.list(query: ListQueryMembers, now?: Date): Promise<{ data: MemberDTO[]; meta: PaginationMeta }>`
- `membersService.get(id: string, now?: Date): Promise<MemberDTO>`
- `membersService.update(id: string, patch: MemberUpdate, now?: Date): Promise<MemberDTO>`
- `membersService.remove(id: string, now?: Date): Promise<void>`

## Commands run
| Command | Result |
|---|---|
| `npx vitest run server/tests/integration/members.service.test.ts server/tests/api/members.api.test.ts --retry=0` | 8/8 passed (800 property runs, 0 failed) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |

## Test counts (retries 0)
| Suite | Tests | Property runs | Passed | Failed |
|---|---|---|---|---|
| `members.service.test.ts` | 5 | 500 | 5 | 0 |
| `members.api.test.ts` | 3 | 300 | 3 | 0 |
