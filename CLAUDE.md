# CLAUDE.md — MeetingActionLog (builder spec for Claude Code)

> Paste this whole file into Claude Code **and** save it at the project root as `CLAUDE.md`, so every Claude Code session loads it automatically.
> Antigravity is the lead architect on this project. It sends you one step at a time as `docs/steps/STEP-XX.md`. Build exactly what the step says, using this file as the source of truth for architecture, contracts and testing.
> **Before writing any UI code, read `docs/design-spec.md`** (palette, typography, the 3 reference sites, motion rules, sources), then `docs/DESIGN.md` (how to build it). The visual reference is `docs/prototype.html`. Do not default to generic AI-generated UI patterns (purple/blue gradients, Inter, generic rounded shadow cards, centered hero + 3-icon feature grid). Every layout and colour decision must trace back to the spec or the references, and before you report a UI step as done, state which reference(s) shaped the layout.

---

## 1. Project

| | |
|---|---|
| Student | **NITHIN KUMAR U** · USN **2102508611** |
| Title | **MeetingActionLog** |
| Theme | Meeting decisions and follow-up |
| Problem | Teams leave meetings with unclear owners and deadlines for action items. |
| Solution | A meeting log that records **decisions**, **assigned actions** (owner + due date + priority) and **completion status**. |
| Differentiating feature | 1) An **Overdue** view of open actions past their due date, grouped by owner. 2) A **Decision inbox** of decisions that have **not yet been converted into tasks**, with one-click "Convert to task". Both are also the first row of the dashboard. |
| Stack (MERN) | **React** UI · **Node.js + Express** REST API · **MongoDB** (Mongoose) · input validation (zod, shared by client and server) · central error handling · responsive design |

---

## 2. General requirements checklist (must all be true at the end)

1. MERN: React SPA, Express REST API, MongoDB persistence through Mongoose.
2. Full CRUD for Members, Meetings, Decisions, Actions.
3. Input validation on **both** client (react-hook-form + zod) and server (zod middleware). Same schemas from `shared/`.
4. Central error handling: one JSON error shape, correct HTTP status codes, no stack traces in production responses, React error boundary, API error states in the UI.
5. Responsive design from 360px to 1920px wide (layout rules in `docs/DESIGN.md` §9).
6. RESTful routes, plural nouns, query-string filtering, pagination, sorting.
7. Environment config through `.env` (with `.env.example` committed), nothing secret in git.
8. Seed script with realistic demo data, so the overdue view and the decision inbox are never empty on a fresh install.
9. `README.md` with: overview, features, screenshots, tech stack, folder structure, setup, env vars, scripts, API reference link, testing instructions, test results summary, student name and USN.
10. `docs/API.md` with every endpoint, request, response and error example.
11. Clean code: TypeScript strict, ESLint + Prettier passing, no `any` without a comment, no console errors in the browser.
12. Accessibility: keyboard reachable, visible focus, labels, Lighthouse Accessibility ≥ 95.
13. **No emojis** anywhere in the UI or seed data; animated icons only (`docs/DESIGN.md` §6).
14. Every function tested **100 times** per §9, all green, report in `docs/TEST_REPORT.md`.
15. One-command dev start (`npm run dev`) and production build (`npm run build && npm start`, Express also serves the built client).

> If the course hands out an extra "General Requirements" list, Antigravity will append it here as §2.1 and every item in it becomes part of the definition of done.

---

## 3. Repository layout (npm workspaces)

```
meeting-action-log/
├─ package.json            # workspaces: shared, server, client; root scripts
├─ .env.example
├─ docker-compose.yml      # mongo:7 for local dev (optional)
├─ README.md
├─ CLAUDE.md
├─ docs/
│  ├─ design-spec.md
│  ├─ DESIGN.md
│  ├─ prototype.html
│  ├─ API.md
│  ├─ TEST_REPORT.md
│  └─ steps/STEP-XX.md, STEP-XX.result.md
├─ shared/                 # "@mal/shared" – TS source, consumed by server + client
│  └─ src/{index.ts, constants.ts, dates.ts, schemas/{member,meeting,decision,action,query,common}.ts}
├─ server/
│  ├─ src/{app.ts, server.ts}
│  ├─ src/config/env.ts
│  ├─ src/db/connect.ts
│  ├─ src/models/{Member,Meeting,Decision,Action}.ts
│  ├─ src/services/{members,meetings,decisions,actions,insights}.service.ts
│  ├─ src/controllers/*.controller.ts
│  ├─ src/routes/{index,members,meetings,decisions,actions,insights}.routes.ts
│  ├─ src/middleware/{validate,errorHandler,notFound,requestId,rateLimit}.ts
│  ├─ src/utils/{ApiError.ts, serialize.ts, pagination.ts}
│  ├─ src/seed/seed.ts
│  └─ tests/{unit,integration,api}/…
├─ client/
│  ├─ src/{main.tsx, App.tsx, router.tsx}
│  ├─ src/styles/{tokens.css, globals.css}
│  ├─ src/lib/{api.ts, motion.ts, cn.ts, queryClient.ts}
│  ├─ src/components/ui/…          # restyled shadcn + animated-icon.tsx
│  ├─ src/components/{layout,feedback,charts}/…
│  ├─ src/features/{dashboard,meetings,decisions,actions,overdue,members}/{api.ts,hooks.ts,components/,pages/}
│  └─ src/__tests__/…
└─ e2e/{playwright.config.ts, fixtures/, specs/*.spec.ts}
```

- `shared/package.json`: `"name": "@mal/shared"`, `"exports": { ".": "./src/index.ts" }`. Server runs with `tsx` in dev and bundles shared with `tsup` (`noExternal: ['@mal/shared']`). Vite consumes the TS source directly.
- Root scripts: `dev` (concurrently server + client), `build`, `start`, `seed`, `lint`, `typecheck`, `test` (all unit + integration + API + client), `test:100` (full 100x protocol), `test:e2e`, `test:e2e:100`, `test:report`.

---

## 4. Environment

`.env.example`
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/meeting_action_log
CLIENT_ORIGIN=http://localhost:5173
APP_TIMEZONE=Asia/Kolkata
RATE_LIMIT_PER_MIN=300
VITE_API_URL=http://localhost:5000/api
```
`server/src/config/env.ts` parses `process.env` with zod and exits with a readable message if anything is missing or wrong.

---

## 5. Data model (Mongoose, `timestamps: true`, `toJSON` → `id` string, no `_id`/`__v`)

Dates without time are stored as **`YYYY-MM-DD` strings** (`meeting.date`, `action.dueDate`). This makes overdue checks timezone-safe and lets Mongo compare them with `$lt`. "Today" is always computed in `APP_TIMEZONE` by `shared/dates.ts::todayISO()`.

### Member
| field | type | rules |
|---|---|---|
| name | string | required, trimmed, 2–60 chars |
| email | string | required, unique (case-insensitive, stored lower-case), valid email |
| role | string | optional, ≤ 40 |
| avatarHue | number | 0–359, default random |

### Meeting
| field | type | rules |
|---|---|---|
| title | string | required, 3–100 |
| date | `YYYY-MM-DD` | required, valid calendar date |
| startTime | `HH:mm` | required, 24h |
| durationMin | int | 5–480 |
| attendeeIds | ObjectId[] → Member | 1–50, unique, each must exist |
| agenda | string | ≤ 500 |
| notes | string | ≤ 5000 |
| tags | string[] | ≤ 10, each 1–24 |

Index: `{ date: -1 }`, text index on `title, agenda, notes`.

### Decision
| field | type | rules |
|---|---|---|
| meetingId | ObjectId → Meeting | required, must exist |
| text | string | required, 5–200 |
| rationale | string | ≤ 1000 |
| decidedById | ObjectId → Member | required, must exist |
| decidedAt | `YYYY-MM-DD` | default = meeting.date |
| status | `'pending' \| 'converted' \| 'no-action'` | default `pending` |
| noActionReason | string | ≤ 200, only when `no-action` |
| actionIds | ObjectId[] → Action | maintained by the convert service |

Indexes: `{ status: 1, decidedAt: 1 }`, `{ meetingId: 1 }`.

### Action
| field | type | rules |
|---|---|---|
| meetingId | ObjectId → Meeting | required, must exist |
| decisionId | ObjectId → Decision | optional; set when created by convert |
| title | string | required, 3–120 |
| description | string | ≤ 1000 |
| ownerId | ObjectId → Member | required, must exist |
| dueDate | `YYYY-MM-DD` | required; on create and on change must be ≥ today (APP_TIMEZONE) and ≥ meeting.date |
| priority | `'low' \| 'medium' \| 'high' \| 'critical'` | default `medium` |
| status | `'open' \| 'in-progress' \| 'blocked' \| 'done'` | default `open` |
| completedAt | Date \| null | set when status becomes `done`, cleared when it leaves `done` |

Indexes: `{ status: 1, dueDate: 1 }`, `{ ownerId: 1, status: 1 }`, `{ meetingId: 1 }`, `{ decisionId: 1 }`.

**Derived, never stored:** `isOverdue = status !== 'done' && dueDate < todayISO()`, `daysOverdue`, `dueState`. Computed by `shared/dates.ts` and added to every action in API responses.

---

## 6. Shared functions (`shared/src`) — exact behaviour

| Function | Signature | Behaviour |
|---|---|---|
| `todayISO` | `(tz = 'Asia/Kolkata', now = new Date()) => string` | `YYYY-MM-DD` of `now` in `tz` (use `Intl.DateTimeFormat`) |
| `isValidISODate` | `(s: string) => boolean` | strict `YYYY-MM-DD` and a real calendar date (rejects `2026-02-30`) |
| `addDaysISO` | `(iso, n) => string` | calendar add, handles month/year/leap boundaries |
| `diffDaysISO` | `(a, b) => number` | whole days `a − b` |
| `isOverdue` | `(a: {status, dueDate}, today) => boolean` | `status !== 'done' && dueDate < today` |
| `daysOverdue` | `(a, today) => number` | `0` if not overdue else `diffDaysISO(today, dueDate)` |
| `dueState` | `(a, today, soonDays = 3) => {kind, days}` | `done` · `overdue` (days late) · `today` · `soon` (1..soonDays) · `later` |
| `completionRate` | `(done, total) => number` | integer 0–100, `0` when total is 0 |
| `isoWeekKey` | `(iso) => string` | `YYYY-Www` |
| Zod schemas | `memberCreate/Update`, `meetingCreate/Update`, `decisionCreate/Update`, `decisionConvert`, `decisionDismiss`, `actionCreate/Update`, `actionStatus`, `actionExtend`, `listQuery*`, `objectId` | all `.strict()` (unknown keys → 400), strings trimmed, messages written for humans (copy in DESIGN.md §9) |

---

## 7. REST API (`/api`)

**Success:** `{ "data": …, "meta"?: { "page", "limit", "total", "pages" } }`
**Error:** `{ "error": { "code", "message", "details"?: [{ "path": "dueDate", "message": "The due date can't be in the past." }], "requestId" } }`
Codes → status: `VALIDATION_ERROR` 400 · `INVALID_ID` 400 · `NOT_FOUND` 404 · `CONFLICT` 409 · `RATE_LIMITED` 429 · `INTERNAL` 500. Malformed JSON → 400 `VALIDATION_ERROR`. Unknown route → 404 `NOT_FOUND`. Body > 100 kb → 413.

| Method | Path | Body / query | Result |
|---|---|---|---|
| GET | `/health` | | `{ data: { status: 'ok', db: 'up'\|'down', time } }` |
| GET | `/members` | `q, page, limit` | list + meta, each with `openActions`, `overdueActions` |
| POST | `/members` | memberCreate | 201; duplicate email → 409 |
| GET/PATCH/DELETE | `/members/:id` | memberUpdate | DELETE → 409 if the member owns non-done actions or is an attendee of an upcoming meeting; else 204 |
| GET | `/meetings` | `q, status=upcoming\|past\|all, from, to, page=1, limit=20 (max 100), sort=date\|-date\|title` | list with per-meeting `stats {decisions, pendingDecisions, actions, doneActions, overdueActions}` |
| POST | `/meetings` | meetingCreate | 201; unknown attendee → 400 with `details[path=attendeeIds]` |
| GET | `/meetings/:id` | | meeting + `attendees` populated + `decisions` + `actions` (with derived fields) + `stats` |
| PATCH | `/meetings/:id` | meetingUpdate | 200; removing an attendee who owns open actions in it → 409 |
| DELETE | `/meetings/:id` | | 204; deletes its decisions and actions |
| GET | `/meetings/:id/decisions` | `status` | list |
| POST | `/meetings/:id/decisions` | decisionCreate | 201, status `pending` |
| GET | `/decisions` | `status=pending\|converted\|no-action, meetingId, page, limit, sort=decidedAt\|-decidedAt` | list with `ageDays`, meeting title, decidedBy |
| PATCH | `/decisions/:id` | decisionUpdate (text, rationale, decidedById) | 200 |
| DELETE | `/decisions/:id` | | 204; linked actions keep existing, `decisionId` set to null |
| POST | `/decisions/:id/convert` | `{ actions: [actionCreate without meetingId] }` (1–10) | 201 `{ decision, actions }`; creates actions in the decision's meeting with `decisionId`, sets status `converted`, appends `actionIds`. Converting `no-action` → 409. Converting an already converted decision is allowed (adds more tasks) |
| POST | `/decisions/:id/dismiss` | `{ reason? }` | 200, status `no-action`; if `converted` → 409 |
| POST | `/decisions/:id/reopen` | | 200, status `pending`; only from `no-action`, or from `converted` when it has no remaining actions; else 409 |
| GET | `/meetings/:id/actions` | `status` | list |
| POST | `/meetings/:id/actions` | actionCreate | 201 |
| GET | `/actions` | `status (csv), ownerId, meetingId, decisionId, overdue=true\|false, dueFrom, dueTo, q, page, limit, sort=dueDate\|-dueDate\|priority\|-createdAt` | list with derived fields |
| GET/PATCH/DELETE | `/actions/:id` | actionUpdate | PATCH validates dueDate rules; DELETE 204 and removes it from its decision's `actionIds` (decision goes back to `pending` if that leaves it empty) |
| PATCH | `/actions/:id/status` | `{ status }` | sets/clears `completedAt` |
| POST | `/actions/:id/extend` | `{ days: 1..30 }` | `dueDate = addDaysISO(max(today, dueDate), days)`; done action → 409 |
| GET | `/insights/summary` | | `{ openActions, overdueActions, doneActions, totalActions, completionRate, pendingDecisions, upcomingMeetings, oldestOverdueDays }` |
| GET | `/insights/overdue` | | `[{ owner, count, oldestDaysOverdue, actions[] }]` sorted by count desc, then oldest desc; actions oldest first |
| GET | `/insights/unconverted-decisions` | `limit` | pending decisions, oldest first, with `ageDays` and meeting |
| GET | `/insights/weekly-completion` | `weeks=8 (1..52)` | `[{ week: 'YYYY-Www', completed }]`, zero-filled, oldest → newest |

Middleware order: `requestId` → `helmet` → `cors(CLIENT_ORIGIN)` → `express.json({limit:'100kb'})` → `pino-http` (silent in test) → `rateLimit` → routes → `notFound` → `errorHandler`.
`validate({ params, query, body })` parses with zod, puts results on `req.valid` (Express 5: never reassign `req.query`). All ObjectId params go through `objectId` schema → `INVALID_ID`. Mongoose `CastError` / duplicate key `11000` are mapped in `errorHandler`. Use **Express 5** (async errors propagate natively).

---

## 8. Frontend

Follow `docs/design-spec.md` and `docs/DESIGN.md` exactly (stack §2, tokens §3, layout §4, components §5, icons §6, motion §7, screens §8, copy §9, accessibility §10). Match `docs/prototype.html` for look and feel.

- `lib/api.ts`: typed `fetch` wrapper → throws `ApiError { status, code, message, details }`. `details` are mapped onto react-hook-form fields with `setError` so server validation errors show under the right input.
- React Query keys: `['meetings', filters]`, `['meeting', id]`, `['actions', filters]`, `['decisions', filters]`, `['insights', 'summary'|'overdue'|'unconverted'|'weekly']`, `['members']`. Mutations invalidate exactly the affected keys.
- Optimistic updates for: action status toggle, convert, dismiss, extend. Roll back on error + error toast.
- Every page has loading (skeleton), empty, error (Retry) states.
- Undo in toasts calls the inverse endpoint (status back, `reopen`, delete created actions, extend back by PATCH dueDate).

---

## 9. Testing protocol — "every function 100 times"

**Tools:** Vitest (+ `@vitest/coverage-v8`), **fast-check**, Supertest, **mongodb-memory-server**, React Testing Library + `@testing-library/user-event` + **MSW**, **Playwright** + `@axe-core/playwright`.

**Rule:** every exported function, service method, endpoint, hook and interactive component is exercised **at least 100 times** and must pass **100 / 100**. `retries: 0` everywhere. A single failure means: find the root cause, fix the code (never the assertion to make it pass), rerun the full 100.

| Layer | What | How the 100 runs happen |
|---|---|---|
| 1. Shared pure functions | every function in §6, every zod schema | `fc.assert(fc.property(...), { numRuns: 100 })` for valid inputs **and** a second property with 100 invalid inputs; plus fixed edge-case tables (leap years, month ends, `2026-02-30`, today/yesterday/tomorrow boundaries, empty strings, 1 char over max) |
| 2. Services | every method in `server/src/services` against mongodb-memory-server | fast-check arbitraries build 100 valid payloads → assert DB state + return value; 100 invalid payloads → assert the right `ApiError` code; DB cleared between runs |
| 3. API endpoints | every row of §7 with Supertest | per endpoint: 100 valid requests (random data) asserting status + body shape + DB effect; 100 fuzzed invalid requests (missing fields, wrong types, extra keys, `$gt` injection keys, huge strings, bad ObjectIds) asserting 400/404/409 and the error shape; plus not-found, conflict, malformed JSON, oversize body |
| 4. Business rules | overdue, convert, dismiss, reopen, extend, delete cascades, completedAt, completion rate | dedicated property tests, 100 runs each, with randomised "today" (inject `now`) |
| 5. Client units | every hook, util, form schema wiring, and interactive component (checkbox toggle, convert sheet, meeting form, segmented control, theme toggle, toasts with undo, command palette) | `test('…', { repeats: 100 }, async () => …)` with MSW handlers; random form inputs from fast-check where input is involved |
| 6. E2E | flows below on desktop Chromium (1366×768) and mobile (Pixel 7) | `npx playwright test --repeat-each=100 --retries=0 --workers=4` against a fresh seeded test DB per worker |
| 7. Guards | no-emoji scan, no console errors, axe a11y on every route, reduced-motion run of the E2E smoke flow | part of the suites above |

**E2E flows:** create meeting (with validation errors first) · add decision · convert decision to task (sheet, success, card leaves inbox, appears in actions) · dismiss decision + undo · add action · toggle done + undo · overdue page shows correct groups, extend +3 days removes the row · meetings search + filter · edit and delete meeting · members CRUD + delete blocked (409 toast) · guided demo tour runs start to finish, Back/End/Esc work · theme toggle persists after reload · mobile tab-bar navigation and bottom sheet · API down → error state → Retry works.

**Coverage gates:** shared 100% lines, server ≥ 90% lines/branches, client ≥ 80%.

**Report:** `npm run test:report` writes `docs/TEST_REPORT.md`: table of every function / endpoint / component / flow → runs executed → passed → failed (must be 0), coverage summary, date, total time.

---

## 10. Working rules for Claude Code

- Work only on the step Antigravity gave you. Read `docs/steps/STEP-XX.md` fully before touching code.
- After implementing: run `npm run lint`, `npm run typecheck`, and the step's tests in 100x mode. Fix until 100/100.
- Finish every step by writing `docs/steps/STEP-XX.result.md`: for UI steps, first a "References used" line per screen (R1 Linear / R2 Plausible / R3 Todoist + what was taken); then files changed, functions added (with signature), commands run, test counts (runs/passed/failed), coverage, anything Antigravity should check in the browser, open questions.
- Commit at the end of each step: `git add -A && git commit -m "step XX: <summary>"`.
- No emojis in code, UI strings, seed data, commit messages or docs you write.
- Do not change DESIGN.md tokens or the API contract on your own. If something in a step contradicts this file, follow this file and record it under "open questions" in the result file.
