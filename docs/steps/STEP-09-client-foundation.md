# STEP 09 — Client foundation + design system (`Signal Ledger v2`)

## Goal
Build the React 19 + Vite + Tailwind v4 client foundation with all `Signal Ledger v2` design tokens (`client/src/styles/tokens.css`, `globals.css`), self-hosted fonts (`Newsreader`, `Schibsted Grotesk`, `IBM Plex Mono`), `lib/motion.ts`, `<AnimatedIcon>` with every icon and motion from `docs/DESIGN.md` §6, `useHostHover`, the Transformative Teal spine sidebar with sliding indicator + count badges + Open-actions odometer, top bar with mono breadcrumb + search + Guided demo trigger + theme toggle + New meeting button, masthead, figures strip + odometer + 20-tick ruler, ledger row / decision row / timetable row primitives, ink-wipe buttons, text tabs with sliding underline, custom toast system with drain bar + Undo, particle burst, `flyToCounter` ghost flight utility, command palette (`/` or `Ctrl+K`), error boundary, 404 screen, skeleton/empty/error states, and the `/design-system` showcase page matching `docs/prototype.html#system`.

## Read first
`CLAUDE.md` §8, §9; `docs/design-spec.md` §1–§7; `docs/DESIGN.md` §0–§7, §8 (`/design-system`, `*`), §9, §10; `docs/prototype.html` (`#system`).

## Reference that shapes this screen
- **R1 Linear**: Transformative Teal spine sidebar (`232px`) with sliding active indicator and count badges; dense ledger rows (`ActionRow`, `DecisionRow`, `MeetingRow`).
- **R2 Plausible Analytics**: 4-column figures strip (`FiguresStrip`) with vertical rules, `Odometer`, 20-tick `Ruler`, single-line SVG `Sparkline`, and horizontal `BarList`.
- **R3 Todoist**: Cloud Dancer paper ground (`#F0EEE9` light / `#0C1716` dark), rules-not-boxes sections (`Section`), IBM Plex Mono uppercase eyebrows, and pen-stroke strike-through on completed tasks.

## Files to create / change
- `client/package.json` — Add runtime & test dependencies (`react@^19`, `react-dom@^19`, `react-router@^7`, `@tanstack/react-query@^5`, `motion`, `lucide-react`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `zod`, `date-fns`, `clsx`, `tailwind-merge`, `@tailwindcss/vite`, `tailwindcss@^4`, `@fontsource-variable/newsreader`, `@fontsource/schibsted-grotesk`, `@fontsource/ibm-plex-mono`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw`).
- `client/index.html` — HTML shell with title `MeetingActionLog`.
- `client/vite.config.ts` — Vite config with `@vitejs/plugin-react` and `@tailwindcss/vite`.
- `client/src/styles/tokens.css` — All light and dark CSS custom properties from `docs/DESIGN.md` §3 and `docs/prototype.html`.
- `client/src/styles/globals.css` — Complete `Signal Ledger v2` stylesheet matching `docs/prototype.html` rules, typography, keyframes, ink-wipe buttons, ledger rows, drawers, toasts, tour spotlight, responsive breakpoints (`1100px`, `760px`), and `prefers-reduced-motion`.
- `client/src/lib/cn.ts` — `cn(...inputs)` class utility.
- `client/src/lib/motion.ts` — Motion tokens (`t = { feedback: 0.1, state: 0.22, layout: 0.36, travel: 0.65 }`, `ease = { out: [0.22, 1, 0.36, 1], inOut: [0.65, 0, 0.35, 1] }`, `stagger = 0.035`), `burst(el, colors)`, `collapseElement(el)`, and `flyToCounter(fromRect)`.
- `client/src/components/ui/animated-icon.tsx` — `<AnimatedIcon name size trigger label>` implementing all 25 SVG icons and animations from `docs/DESIGN.md` §6 and `docs/prototype.html`.
- `client/src/components/ui/primitives.tsx` — `Button` (with ink-wipe, loading spinner, and success checkmark states), `Tag`, `PriorityBars`, `PriorityPicker`, `Avatar`, `AvatarStack`, `Who`, `Odometer`, `Ruler`, `Masthead`, `Section`, `Tabs`, `DrawerSheet`, `EmptyState`, `SkeletonRows`, `ErrorState`.
- `client/src/components/charts/charts.tsx` — `Sparkline` and `BarList` SVG/HTML chart components matching `docs/prototype.html`.
- `client/src/components/feedback/toast-store.tsx` — Custom ledger toast system with 28px tinted icon tile, 4.5s drain bar (pauses on hover), Undo action button, and max 3 visible toasts.
- `client/src/components/feedback/error-boundary.tsx` — React ErrorBoundary with recovery action.
- `client/src/components/layout/app-shell.tsx` — Spine sidebar, mobile bottom tabbar, sticky top bar with breadcrumb, search input (`/` shortcut), Guided demo button, `ThemeToggle` (persisted in `localStorage` under `mal-theme` with `document.startViewTransition`), and `New meeting` button.
- `client/src/features/design-system/design-system-page.tsx` — `/design-system` page mirroring `docs/prototype.html#system` (palette swatches with live computed hexes and sources, R1/R2/R3 references, type scale, ink-wipe and async buttons, motion timing lanes, all 24 animated icons grid with Play All, component demos, refused patterns list).
- `client/src/__tests__/design-system.test.tsx` — 100x component tests (`{ repeats: 100 }`) for `<AnimatedIcon>`, `Odometer`, `Button`, `PriorityPicker`, `ThemeToggle`, and `DesignSystemPage`.

## Acceptance gate
- [ ] All tokens, fonts, icons, motion utilities, and UI primitives implemented.
- [ ] `/design-system` matches `docs/prototype.html#system` in light and dark modes.
- [ ] `npm run lint`, `npm run typecheck`, and 100x tests pass with `retries: 0`.
- [ ] `docs/steps/STEP-09.result.md` written (recording R1/R2/R3 references) and committed.

## Deliverable
Write `docs/steps/STEP-09.result.md` and commit `"step 09: client foundation and signal ledger design system"`.
