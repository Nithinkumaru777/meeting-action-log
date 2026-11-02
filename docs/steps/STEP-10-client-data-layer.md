# Step 10 — Client Data Layer + TanStack Query Hooks

## Scope
1. Typed `apiFetch` client (`client/src/lib/api.ts`) with `ApiError` preserving HTTP status, `code`, `message`, `details`, and `requestId`, plus `applyServerErrorsToForm` helper for `react-hook-form`.
2. Shared `QueryClient` configuration (`client/src/lib/queryClient.ts`).
3. Feature API modules and TanStack Query hooks with exact query keys from `docs/design-spec.md` §3.4:
   - `['meetings', filters]`
   - `['meeting', id]`
   - `['actions', filters]`
   - `['decisions', filters]`
   - `['insights', 'overview']`, `['insights', 'by-owner']`, `['insights', 'velocity', weeks]`
   - `['members']`
4. Optimistic updates with rollback on error + Undo toast support for action status toggle, `+3 days` due date extension, decision convert, and decision dismiss/reopen.
5. 100x Vitest + MSW test suite (`client/src/__tests__/data-layer.test.tsx`) covering `200`, `400` with field details, `404`, `409`, `500`, and network error.
