# STEP 04 — Members API

## Goal
Implement the Mongoose domain models (`Member`, plus `Meeting`, `Decision`, `Action` schemas needed for cross-collection integrity checks and action counts) and the complete Members vertical slice (`members.service.ts`, `members.controller.ts`, `members.routes.ts`) mounted at `/api/members`, tested 100x at both service and HTTP layers.

## Read first
`CLAUDE.md` §5, §6, §7, §9; `docs/DESIGN.md` §8, §9.

## Reference that shapes this screen
N/A (backend step supporting the R1 Linear ledger rows on `/members`).

## Files to create / change
- `server/src/models/Member.ts` — Mongoose `Member` model (`name`, `email` unique lowercase, `role`, `avatarHue` default random `0..359`, `timestamps: true`, `applyToJsonTransform`).
- `server/src/models/Meeting.ts` — Mongoose `Meeting` model (`title`, `date`, `startTime`, `durationMin`, `attendeeIds`, `agenda`, `notes`, `tags`, indexes `{ date: -1 }` and text index on `title, agenda, notes`).
- `server/src/models/Decision.ts` — Mongoose `Decision` model (`meetingId`, `text`, `rationale`, `decidedById`, `decidedAt`, `status`, `noActionReason`, `actionIds`, indexes `{ status: 1, decidedAt: 1 }`, `{ meetingId: 1 }`).
- `server/src/models/Action.ts` — Mongoose `Action` model (`meetingId`, `decisionId`, `title`, `description`, `ownerId`, `dueDate`, `priority`, `status`, `completedAt`, indexes `{ status: 1, dueDate: 1 }`, `{ ownerId: 1, status: 1 }`, `{ meetingId: 1 }`, `{ decisionId: 1 }`).
- `server/src/services/members.service.ts` — `create`, `list`, `get`, `update`, `remove` with `openActions` and `overdueActions` counts and 409 deletion conflict guards.
- `server/src/controllers/members.controller.ts` — Express 5 request handlers for `/api/members`.
- `server/src/routes/members.routes.ts` — Express router with `validate` middleware for `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.
- `server/src/routes/index.routes.ts` — Mount `/members` router.
- `server/tests/integration/members.service.test.ts` — 100x service property tests against `mongodb-memory-server`.
- `server/tests/api/members.api.test.ts` — 100x Supertest API tests (valid, fuzzed invalid, 404, 409 duplicate email, 409 delete blocked by open actions or upcoming meeting).

## Functions / endpoints / components (one block each)

### `membersService.create(input: MemberCreate)`
- Input: `{ name, email, role?, avatarHue? }` validated by `memberCreateSchema`.
- Behaviour:
  1. Normalize `email = input.email.trim().toLowerCase()`.
  2. Check if a member with `email` exists -> if so, throw `ApiError.conflict('A member with this email already exists.')`.
  3. Default `avatarHue` to a deterministic/random integer `0..359` if omitted, `role` to `input.role ?? ''`.
  4. Create and return serialized member with `{ openActions: 0, overdueActions: 0 }`.
- Errors: `CONFLICT` 409 on duplicate email (case-insensitive).

### `membersService.list(query: ListQueryMembers, now?: Date)`
- Input: `{ q?, page = 1, limit = 20 }`.
- Behaviour:
  1. Filter by case-insensitive regex on `name`, `email`, or `role` when `q` is provided (escaping regex metacharacters).
  2. Count total matching members and fetch page sorted by `name: 1, _id: 1`.
  3. Aggregate `Action` counts for the returned member IDs:
     - `openActions`: count where `ownerId === member._id && status !== 'done'`
     - `overdueActions`: count where `ownerId === member._id && status !== 'done' && dueDate < todayISO(env.APP_TIMEZONE, now)`
  4. Return `{ data: membersWithCounts, meta: buildPaginationMeta({ page, limit, total }) }`.

### `membersService.get(id: string, now?: Date)`
- Behaviour: Find member by ID; if missing throw `ApiError.notFound('Member not found.')`. Attach `openActions` and `overdueActions` and return serialized object.

### `membersService.update(id: string, patch: MemberUpdate, now?: Date)`
- Behaviour:
  1. Load member by ID; missing -> `NOT_FOUND` 404 `'Member not found.'`.
  2. If `patch.email` is changing, check case-insensitive uniqueness -> `CONFLICT` 409 `'A member with this email already exists.'`.
  3. Apply fields, save, and return updated member with `openActions` and `overdueActions`.

### `membersService.remove(id: string, now?: Date)`
- Behaviour:
  1. Load member by ID; missing -> `NOT_FOUND` 404 `'Member not found.'`.
  2. Count actions with `ownerId: id, status: { $ne: 'done' }`. If `> 0`, throw `ApiError.conflict('Cannot remove a member who still owns open actions. Reassign or complete them first.')`.
  3. Count meetings with `attendeeIds: id, date: { $gte: todayISO(env.APP_TIMEZONE, now) }`. If `> 0`, throw `ApiError.conflict('Cannot remove a member who is an attendee of an upcoming meeting.')`.
  4. Delete member document.

## Tests (100x protocol, CLAUDE.md §9)
- `server/tests/integration/members.service.test.ts`: 100 valid create/list/get/update/remove runs + 100 invalid/conflict runs (duplicate email case-insensitive, delete blocked by open action, delete blocked by upcoming meeting, delete allowed when action is `done` or meeting is in the past).
- `server/tests/api/members.api.test.ts`: 100 valid requests + 100 fuzzed invalid requests per endpoint (`POST /api/members`, `GET /api/members`, `GET /api/members/:id`, `PATCH /api/members/:id`, `DELETE /api/members/:id`).
- Command: `npm run lint && npm run typecheck && npm run test:100`

## Acceptance gate
- [ ] All 4 Mongoose models created with indexes and `toJSON` transforms.
- [ ] `/api/members` CRUD endpoints pass 100x service and API tests with `retries: 0`.
- [ ] `npm run lint` and `npm run typecheck` pass.
- [ ] `docs/steps/STEP-04.result.md` written and committed.

## Deliverable
Write `docs/steps/STEP-04.result.md` and commit `"step 04: members api"`.
