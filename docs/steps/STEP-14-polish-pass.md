# Step 14 — Responsive, Accessibility & Visual Polish Pass

## Scope
1. Playwright configuration (`e2e/playwright.config.ts` & `e2e/tsconfig.json`) running against the built production application served by Express on `http://127.0.0.1:5179` with auto-seeded MongoDB data.
2. Polish & Accessibility E2E suite (`e2e/specs/polish.spec.ts`):
   - Responsive layout verification at viewports `360`, `390`, `768`, `1024`, `1366`, and `1920` (no horizontal overflow, desktop spine vs mobile bottom tabbar).
   - Automated WCAG AA accessibility audit via `@axe-core/playwright` across all routes (`/`, `/meetings`, `/meetings/:id`, `/overdue`, `/decisions`, `/members`, `/design-system`) in light and dark themes.
   - Keyboard-only navigation (`/` search shortcut, `Ctrl+K` command palette, `Escape` drawer/modal dismissal, `ArrowRight`/`Escape` Guided Demo tour).
   - `prefers-reduced-motion: reduce` verification and zero console/page error gate.
   - Automated visual evidence capture into `docs/screenshots/STEP-*.png`.
