# Step 12 — Meeting Detail + Convert Decision Sheet + Action Form Sheet

## Scope
1. `ActionFormSheet` & `ConvertDecisionSheet` (`client/src/features/actions/action-form-sheet.tsx`):
   - Unified drawer supporting both standalone action creation (`New action item`) and the signature decision-to-task conversion (`Give this decision an owner`) with quoted decision block.
   - Executes the §7.5 signature `flyToCounter` ghost flight to `#sideOpen`, collapses converted inbox rows, flashes the created row, and provides full `Undo` toast rollback.
2. `MeetingDetailPage` (`client/src/features/meetings/meeting-detail-page.tsx`):
   - Masthead with formatted date/time/duration/status eyebrow, italic agenda, attendee stack, and Edit/Delete actions.
   - 4-cell Figures Strip (`Decisions`, `Actions done`, `Overdue`, `Without tasks`).
   - Inline `addDecision` form (`>= 5` chars validation + shake) and `Action items` list with pen-stroke completion toggle and `Undo`.
3. 100x Vitest + RTL test suite (`client/src/__tests__/meeting-detail.test.tsx`).
