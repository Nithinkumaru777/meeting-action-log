# MeetingActionLog: feature inventory

Read from `client/src`, `server/src` and `docs/API.md`. Item ids (I-nn) are referenced by `coverage.md`.
API paths are relative to `/api`.

## Shell (every screen)
| Id | Element | What it does | API |
|---|---|---|---|
| I-01 | Brand block | Logo and "Decisions → owners" tagline | none |
| I-02 – I-07 | Spine links: Today, Meetings, Overdue, Decision inbox, Members, Design system | Route change, sliding active marker | page queries |
| I-08 | Overdue and inbox count badges | Live counts on the spine | `GET insights/summary` |
| I-09 | Open actions meter | Rolling odometer in the spine; target of the task flight | `GET insights/summary` |
| I-10 | Breadcrumb | "Ledger / page" | none |
| I-11 | Search box, `/` shortcut | Filters meetings by title and agenda; jumps to Meetings | client filter |
| I-12 | Live indicator | Live, Reconnecting or Offline state of the event stream | `GET events` |
| I-13 | Guided demo button | Starts the 8-step tour | none |
| I-14 | Theme button | Light or dark, saved in localStorage | none |
| I-15 | New meeting button | Opens the Log a meeting sheet | none |
| I-16 | Toasts, Undo, Dismiss, drain timer | Confirmation with one-click reversal | varies |
| I-17 | Live update toast | Raised when another tab changes data | `GET events` |
| I-18 | Mobile tab bar | Below tablet width only | none |

## Today (`/`)
| Id | Element | What it does | API |
|---|---|---|---|
| I-20 | Masthead, date eyebrow | Page purpose | none |
| I-21 | Open actions figure (link) | Goes to Meetings | `GET insights/summary` |
| I-22 | Overdue figure (link) | Goes to Overdue; oldest late age | same |
| I-23 | Completion figure, ruler | Percent done | same |
| I-24 | Decisions without tasks figure (link) | Goes to inbox | same |
| I-25 | Overdue column, All overdue link | Oldest four late actions | `GET insights/overdue` |
| I-26 | Action checkbox | Marks done, draw and strike animation, Undo | `PATCH actions/:id/status` |
| I-27 | Action meeting link, From decision tag, In progress tag, priority bars, owner | Row detail | none |
| I-28 | No owner yet column, Inbox link | Oldest three pending decisions | `GET insights/unconverted-decisions` |
| I-29 | Decision: Convert to task, No action | Opens sheet, or dismiss with Undo | `POST decisions/:id/dismiss` |
| I-30 | Completed per week sparkline | 8 weeks of completions | `GET insights/weekly-completion` |
| I-31 | Late, by owner bars | Overdue count per person | `GET insights/overdue` |
| I-32 | Coming up list, Schedule button | Upcoming meetings; opens meeting sheet | `GET meetings?filter=upcoming` |
| I-33 | Error state with Retry, skeleton rows, empty states | Failure and loading paths | none |

## Meetings (`/meetings`)
| Id | Element | What it does | API |
|---|---|---|---|
| I-40 | Tabs: All, Upcoming, Held, with counts | Filters the ledger | `GET meetings` |
| I-41 | Search chip with Clear | Shows and clears the search term | none |
| I-42 | Meeting row | Date, title, agenda, overdue and no-task flags, time, attendees, progress meter; opens detail | none |
| I-43 | No meetings match state, Clear search | Empty search result | none |

## Log a meeting / Edit meeting sheet
| Id | Element | What it does | API |
|---|---|---|---|
| I-44 | Title, Date, Start, Duration, Attendee chips, Agenda | Meeting fields | none |
| I-45 | Create meeting, Cancel, Close, Esc, scrim | Save, or dismiss | `POST meetings` |
| I-46 | Field errors and toast | Title 3–100, duration 5–480, one attendee minimum | none |

## Meeting detail (`/meetings/:id`)
| Id | Element | What it does | API |
|---|---|---|---|
| I-50 | All meetings back link | Returns to ledger | none |
| I-51 | Eyebrow, title, agenda, attendee stack | Meeting record | `GET meetings/:id` |
| I-52 | Edit button | Opens sheet with values, Save changes | `PATCH meetings/:id` |
| I-53 | Delete meeting button | Removes meeting and its records | `DELETE meetings/:id` |
| I-54 | Four figures: Decisions, Actions done, Overdue, Without tasks | Meeting health | none |
| I-55 | Log a decision input and Log | Adds a pending decision; 5 character minimum | `POST meetings/:id/decisions` |
| I-56 | Decision row: Convert, No action, Reopen | State machine on the row | `POST decisions/:id/convert`, `dismiss`, `reopen` |
| I-57 | Add action | Opens New action item sheet | none |
| I-58 | Action sheet: Title, Owner, Due date, Priority, Notes, Add action, Cancel | Creates a task | `POST meetings/:id/actions` |
| I-59 | Convert sheet: quote, Create task, 650 ms flight to the counter | Decision becomes a linked task | `POST decisions/:id/convert` |
| I-60 | Meeting not found state | Deleted or bad id | `GET meetings/:id` 404 |

## Decision inbox (`/decisions`)
| Id | Element | What it does | API |
|---|---|---|---|
| I-65 | Tabs: Without tasks, Converted, No action | Status filter with counts | `GET decisions` |
| I-66 | Pending row: Convert to task, No action | Folds out of list, Undo | `convert`, `dismiss` |
| I-67 | Converted row, task count tag | Shows linked tasks | none |
| I-68 | No action row, Reopen | Back to pending | `reopen` |
| I-69 | Every decision has an owner state | Empty inbox | none |

## Overdue (`/overdue`)
| Id | Element | What it does | API |
|---|---|---|---|
| I-70 | Four figures: Overdue actions, Oldest, Owners affected, Still on time | Summary | `GET insights/summary` |
| I-71 | Owner groups, most late first | Avatar, name, role, late count | `GET insights/overdue` |
| I-72 | +3 days | Moves due date, row folds out. Its Undo fails on overdue rows: the server rejects restoring a past date (400), so the video does not show it | `POST actions/:id/extend` |
| I-73 | Checkbox | Marks done, Undo | `PATCH actions/:id/status` |
| I-74 | Nothing overdue state | Empty list | none |

## Members (`/members`)
| Id | Element | What it does | API |
|---|---|---|---|
| I-80 | Add member, sheet: Full name, Email, Role, Avatar hue | Creates a person | `POST members` |
| I-81 | Directory row, Edit | Update sheet, Save changes | `PATCH members/:id` |
| I-82 | Remove | Deletes, or refuses while the member owns records | `DELETE members/:id` |
| I-83 | Name and email errors | Inline validation | none |

## Power features
| Id | Element | What it does | API |
|---|---|---|---|
| I-85 | Command palette, Ctrl K | Filter, arrows, Enter, Esc; Go to pages, Log a new meeting, Start tour, Toggle theme | none |
| I-86 | No matching commands | Palette empty state | none |
| I-87 | Guided tour: 8 steps, Next, Back, End, Finish, arrow keys, Esc, ticks | Spotlight walkthrough | none |
| I-88 | Design system page | Palette, references, type, buttons, motion, icons, components, refusals | none |
| I-89 | 404 page, Back to Today | Unknown address | none |

## Backend, visible through the browser
| Id | Element | What it does |
|---|---|---|
| I-90 | `GET /api/health` | Status, database state, time |
| I-91 | `GET /api/insights/summary` | Success envelope with computed metrics |
| I-92 | Validation error envelope | `GET /api/actions?status=nope` returns a structured error |
| I-93 | Not-found error envelope | `GET /api/meetings/<unknown id>` |
