# Step 13 — Overdue + Decision Inbox + Members + Guided Demo Tour

## Scope
1. `OverduePage` (`client/src/features/overdue/overdue-page.tsx`):
   - 4-cell Figures Strip (`Overdue actions`, `Oldest, days late`, `Owners affected`, `Still on time`).
   - Owner-grouped sections with large avatar header, looping flame tags, pen-stroke completion toggle, and `+3 days` quick extension with collapse animation + `Undo` toast.
2. `DecisionsInboxPage` (`client/src/features/decisions/decisions-inbox-page.tsx`):
   - Tabs (`Without tasks`, `Converted`, `No action`) with counts.
   - Convert to task drawer trigger, dismiss (`No action`) with collapse + `Undo` toast, and `Reopen` action on dismissed items.
3. `MembersPage` (`client/src/features/members/members-page.tsx`):
   - Team directory + create/edit drawer (`MemberFormSheet`) and delete action with `409 CONFLICT` protection toast.
4. `GuidedTourOverlay` (`client/src/features/tour/tour-overlay.tsx`):
   - 8-step interactive tour with spotlight ring (`#tourRing`), positioned popover (`#tourPop`), step ticks, and keyboard navigation (`ArrowLeft`, `ArrowRight`, `Escape`).
5. `App.tsx` and `main.tsx`:
   - Full application router (`/`, `/meetings`, `/meetings/:id`, `/overdue`, `/decisions`, `/members`, `/design-system`, `*`).
6. 100x Vitest + RTL test suite (`client/src/__tests__/overdue-decisions-members-tour.test.tsx`).
