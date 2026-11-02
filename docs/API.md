# MeetingActionLog REST API Reference (`/api`)

Student: **NITHIN KUMAR U** · USN **2102508611**

Base URL: `http://localhost:5000/api`

---

## Response Envelopes

### Success Envelope
```json
{
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```
(`meta` is included on paginated list endpoints.)

### Error Envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "details": [
      {
        "path": "dueDate",
        "message": "The due date can't be in the past."
      }
    ],
    "requestId": "c2f8c7a8-0d7b-4f88-90b5-8e9d719c2f10"
  }
}
```

### Error Codes & HTTP Status Mapping
| Code | HTTP Status | When it happens |
|---|---|---|
| `VALIDATION_ERROR` | `400` / `413` | Invalid body/query/params, malformed JSON (`400`), or payload > 100kb (`413`) |
| `INVALID_ID` | `400` | Route parameter or reference is not a valid 24-hex MongoDB ObjectId |
| `NOT_FOUND` | `404` | Resource or unknown route not found |
| `CONFLICT` | `409` | Duplicate member email, blocked deletion, or invalid decision/action state transition |
| `RATE_LIMITED` | `429` | More than `RATE_LIMIT_PER_MIN` requests per minute |
| `INTERNAL` | `500` | Unexpected server error (never leaks stack traces) |

---

## 1. Health

### `GET /api/health`
Returns service and MongoDB connectivity status.

**Response `200 OK`:**
```json
{
  "data": {
    "status": "ok",
    "db": "up",
    "time": "2026-11-02T10:00:00.000Z"
  }
}
```

---

## 2. Members (`/api/members`)

### `GET /api/members`
Query parameters: `q` (optional search string), `page` (default `1`), `limit` (default `20`, max `100`).

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "672600000000000000000001",
      "name": "Ananya Rao",
      "email": "ananya.rao@meetingactionlog.dev",
      "role": "Product lead",
      "avatarHue": 176,
      "openActions": 1,
      "overdueActions": 1
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "pages": 1 }
}
```

### `POST /api/members`
**Request body:**
```json
{
  "name": "Ananya Rao",
  "email": "ananya.rao@meetingactionlog.dev",
  "role": "Product lead",
  "avatarHue": 176
}
```
**Responses:** `201 Created` · `400 VALIDATION_ERROR` · `409 CONFLICT` (duplicate email).

### `GET /api/members/:id`
**Responses:** `200 OK` · `400 INVALID_ID` · `404 NOT_FOUND`.

### `PATCH /api/members/:id`
**Request body:** Partial of `{ name, email, role, avatarHue }` (at least 1 field).
**Responses:** `200 OK` · `400 VALIDATION_ERROR` · `404 NOT_FOUND` · `409 CONFLICT`.

### `DELETE /api/members/:id`
**Responses:** `204 No Content` · `404 NOT_FOUND` · `409 CONFLICT` (if the member owns non-done actions or is an attendee of an upcoming meeting).

---

## 3. Meetings (`/api/meetings`)

### `GET /api/meetings`
Query parameters:
- `q` — search in `title`, `agenda`, `notes`, `tags`
- `status` — `'all' | 'upcoming' | 'past'` (default `'all'`)
- `from`, `to` — `YYYY-MM-DD` date range
- `page` (default `1`), `limit` (default `20`, max `100`)
- `sort` — `'date' | '-date' | 'title'` (default `'-date'`)

**Response `200 OK`:**
Each meeting includes `stats: { decisions, pendingDecisions, actions, doneActions, overdueActions }` and `attendees`.

### `POST /api/meetings`
**Request body:**
```json
{
  "title": "Sprint 14 planning",
  "date": "2026-10-24",
  "startTime": "10:00",
  "durationMin": 45,
  "attendeeIds": ["672600000000000000000001"],
  "agenda": "Scope for sprint 14 and carry-over items.",
  "notes": "",
  "tags": ["sprint"]
}
```
**Responses:** `201 Created` · `400 VALIDATION_ERROR` (including unknown `attendeeIds`).

### `GET /api/meetings/:id`
Returns the meeting with populated `attendees`, `decisions` (with `ageDays` and `decidedBy`), `actions` (with derived `isOverdue`, `daysOverdue`, `dueState`, and `owner`), and `stats`.

### `PATCH /api/meetings/:id`
**Responses:** `200 OK` · `400 VALIDATION_ERROR` · `404 NOT_FOUND` · `409 CONFLICT` (when removing an attendee who owns open actions in the meeting).

### `DELETE /api/meetings/:id`
Cascades deletion to all decisions and actions in the meeting.
**Responses:** `204 No Content` · `404 NOT_FOUND`.

---

## 4. Decisions (`/api/decisions` & `/api/meetings/:id/decisions`)

### `GET /api/meetings/:id/decisions`
Query parameters: `status` (`'pending' | 'converted' | 'no-action'`).

### `POST /api/meetings/:id/decisions`
**Request body:**
```json
{
  "text": "Every repository gets a pull-request template",
  "rationale": "Standardizes test plan and rollback notes.",
  "decidedById": "672600000000000000000002"
}
```
**Responses:** `201 Created` (initial `status: 'pending'`).

### `GET /api/decisions`
Query parameters: `status`, `meetingId`, `page`, `limit`, `sort` (`'decidedAt' | '-decidedAt'`).

### `PATCH /api/decisions/:id`
**Request body:** Partial of `{ text, rationale, decidedById }`.

### `DELETE /api/decisions/:id`
Deletes the decision and sets `decisionId = null` on any linked actions (`204 No Content`).

### `POST /api/decisions/:id/convert`
Converts a decision into 1–10 linked action items in the decision's meeting.
**Request body:**
```json
{
  "actions": [
    {
      "title": "Add PR template to repo",
      "description": "Include test and rollback sections",
      "ownerId": "672600000000000000000002",
      "dueDate": "2026-11-09",
      "priority": "medium"
    }
  ]
}
```
**Responses:** `201 Created` `{ data: { decision, actions } }` · `400 VALIDATION_ERROR` · `404 NOT_FOUND` · `409 CONFLICT` (if decision is `'no-action'`).

### `POST /api/decisions/:id/dismiss`
**Request body:** `{ "reason": "No migration needed for Q4." }`
**Responses:** `200 OK` (status `'no-action'`) · `409 CONFLICT` (if already `'converted'`).

### `POST /api/decisions/:id/reopen`
**Responses:** `200 OK` (status `'pending'`) · `409 CONFLICT` (if `'converted'` and linked actions still exist, or already `'pending'`).

---

## 5. Actions (`/api/actions` & `/api/meetings/:id/actions`)

Every action returned by the API includes computed derived fields:
- `isOverdue: boolean` (`status !== 'done' && dueDate < todayISO()`)
- `daysOverdue: number`
- `dueState: { kind: 'done' | 'overdue' | 'today' | 'soon' | 'later', days: number }`

### `GET /api/meetings/:id/actions`
Query parameters: `status` (CSV, e.g. `open,in-progress`).

### `POST /api/meetings/:id/actions`
**Request body:**
```json
{
  "title": "Prepare launch checklist doc",
  "description": "Compile QA and ops sign-off items",
  "ownerId": "672600000000000000000003",
  "dueDate": "2026-11-05",
  "priority": "high",
  "status": "open"
}
```
**Responses:** `201 Created` · `400 VALIDATION_ERROR` (`dueDate` must be `>= today` and `>= meeting.date`).

### `GET /api/actions`
Query parameters: `status` (CSV), `ownerId`, `meetingId`, `decisionId`, `overdue` (`true|false`), `dueFrom`, `dueTo`, `q`, `page`, `limit`, `sort` (`'dueDate' | '-dueDate' | 'priority' | '-createdAt'`).

### `GET /api/actions/:id`
**Responses:** `200 OK` · `404 NOT_FOUND`.

### `PATCH /api/actions/:id`
**Request body:** Partial of `{ title, description, ownerId, dueDate, priority, status }`.

### `DELETE /api/actions/:id`
Deletes the action and removes its ID from any linked decision's `actionIds` (returning the decision to `'pending'` if no linked actions remain).

### `PATCH /api/actions/:id/status`
**Request body:** `{ "status": "done" }`
Sets `completedAt` when transitioning to `'done'`, clears `completedAt` when leaving `'done'`.

### `POST /api/actions/:id/extend`
**Request body:** `{ "days": 3 }` (`1..30`)
Sets `dueDate = addDaysISO(max(today, dueDate), days)`. Returns `409 CONFLICT` if the action is already `'done'`.

---

## 6. Insights (`/api/insights`)

### `GET /api/insights/summary`
**Response `200 OK`:**
```json
{
  "data": {
    "openActions": 7,
    "overdueActions": 4,
    "doneActions": 3,
    "totalActions": 10,
    "completionRate": 30,
    "pendingDecisions": 3,
    "upcomingMeetings": 2,
    "oldestOverdueDays": 6,
    "totalMeetings": 6
  }
}
```

### `GET /api/insights/overdue`
Returns open overdue actions grouped by owner (`count` desc, then `oldestDaysOverdue` desc; actions within each owner group sorted oldest first).

### `GET /api/insights/unconverted-decisions`
Query parameters: `limit` (default `10`, `1..100`).
Returns pending decisions sorted oldest first with `ageDays`, `decidedBy`, and `meeting`.

### `GET /api/insights/weekly-completion`
Query parameters: `weeks` (default `8`, `1..52`).
Returns zero-filled ISO week buckets oldest to newest:
```json
{
  "data": [
    { "week": "2026-W37", "completed": 0 },
    { "week": "2026-W44", "completed": 2 }
  ]
}
```
