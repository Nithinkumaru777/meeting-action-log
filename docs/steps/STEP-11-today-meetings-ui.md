# Step 11 — Today Dashboard + Meetings List + Meeting Form Sheet

## Scope
1. `MeetingFormSheet` (`client/src/features/meetings/meeting-form-sheet.tsx`):
   - Create and Edit meeting drawer (`react-hook-form` + `@mal/shared` `meetingCreateSchema`).
   - Attendee multi-select pill chips, duration (5–480 min), date, start time, optional agenda, field shake animation on validation error, and server field-level error mapping.
2. `TodayPage` (`client/src/features/dashboard/today-page.tsx`):
   - Masthead (`Who owns what, and what is slipping`).
   - 4-cell Figures Strip (`Open actions`, `Overdue`, `Completion` with 20-tick `Ruler`, `Decisions without tasks`).
   - Asymmetric 2-column Overdue actions + Decisions without tasks (`Convert to task` and `No action`).
   - Even 2-column `Completed per week` (`Sparkline`) + `Late, by owner` (`BarList`).
   - `Coming up` upcoming meetings section with `+ Schedule` button.
3. `MeetingsPage` (`client/src/features/meetings/meetings-page.tsx`):
   - Filter tabs (`All`, `Upcoming`, `Held`) with counts and animated indicator.
   - Live search query badge with clear button (`/` shortcut).
   - Timetable `MeetingRow` list with progress meter and flags.
4. 100x Vitest + RTL test suite (`client/src/__tests__/today-meetings.test.tsx`).
