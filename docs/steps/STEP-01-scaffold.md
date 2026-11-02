# STEP 01 — Monorepo scaffold

## Goal
Establish the complete MeetingActionLog npm workspaces monorepo (`shared`, `server`, `client`) with strict TypeScript configurations, ESLint v9 + Prettier, `.env.example`, `docker-compose.yml` (`mongo:7`), Vitest configured across workspaces with `retries: 0`, `fast-check` installed, root scripts from `CLAUDE.md` §3, and the `no-emoji` guard test scanning `client/src/**`, `server/src/**`, and `shared/src/**` (100x property/repeat compliant). `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:100` must all pass cleanly on the scaffold.

## Read first
`CLAUDE.md` §1, §2, §3, §4, §9, §10; `docs/design-spec.md`; `docs/DESIGN.md` §0, §2.

## Reference that shapes this screen
N/A (infrastructure and monorepo scaffold step; sets up the guardrails for R1 Linear, R2 Plausible, R3 Todoist UI work in later steps).

## Files to create / change
- `package.json` — Root workspace manifest (`"name": "meeting-action-log"`, `"private": true`, `workspaces: ["shared", "server", "client"]`) and all root scripts (`dev`, `build`, `start`, `seed`, `lint`, `typecheck`, `test`, `test:100`, `test:e2e`, `test:e2e:100`, `test:report`).
- `tsconfig.base.json` — Shared strict TypeScript compiler options (`strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: false`, `target: "ES2022"`, `moduleResolution: "bundler"`, `skipLibCheck: true`).
- `.gitignore` — Ignore `node_modules`, `dist`, `coverage`, `.env`, `.data`, `playwright-report`, `test-results`, `*.log`.
- `.env.example` — Exact environment variables from `CLAUDE.md` §4 (`NODE_ENV`, `PORT`, `MONGODB_URI`, `CLIENT_ORIGIN`, `APP_TIMEZONE`, `RATE_LIMIT_PER_MIN`, `VITE_API_URL`).
- `.env` — Local development copy of `.env.example`.
- `docker-compose.yml` — `mongo:7` container exposing `27017:27017` with named volume `mongo_data`.
- `eslint.config.mjs` — Flat ESLint config using `@eslint/js` and `typescript-eslint` across `shared`, `server`, and `client` with no-explicit-any error rule.
- `.prettierrc` — Prettier configuration (`singleQuote: true`, `semi: true`, `trailingComma: "all"`, `printWidth: 100`).
- `vitest.workspace.ts` or root `vitest.config.ts` — Workspace test runner configuration with `retry: 0`.
- `shared/package.json` — `"name": "@mal/shared"`, `"exports": { ".": "./src/index.ts" }`, scripts `typecheck`, `lint`, `test`.
- `shared/tsconfig.json` — Extends `../tsconfig.base.json`.
- `shared/vitest.config.ts` — Vitest config for `shared` with `retry: 0` and 100% coverage thresholds.
- `shared/src/index.ts` — Initial barrel exporting `APP_NAME = 'MeetingActionLog'`.
- `server/package.json` — `"name": "@mal/server"`, scripts `dev`, `build`, `start`, `seed`, `typecheck`, `lint`, `test`.
- `server/tsconfig.json` — Extends `../tsconfig.base.json`.
- `server/vitest.config.ts` — Vitest config for `server` with `retry: 0`.
- `server/src/index.ts` — Placeholder entry importing `@mal/shared`.
- `client/package.json` — `"name": "@mal/client"`, scripts `dev`, `build`, `preview`, `typecheck`, `lint`, `test`.
- `client/tsconfig.json` — Extends `../tsconfig.base.json` with `"jsx": "react-jsx"` and DOM libs.
- `client/vitest.config.ts` — Vitest config for `client` with `retry: 0`.
- `client/src/index.ts` — Placeholder entry importing `@mal/shared`.
- `client/src/__tests__/no-emoji.test.ts` — Guard test scanning `client/src/**`, `server/src/**`, and `shared/src/**` for `/\p{Extended_Pictographic}/u` and verifying 100 random strings + actual source files contain zero emojis.

## Functions / endpoints / components (one block each)

### `noEmojiScan(dirPaths: string[]): string[]` (in `client/src/__tests__/no-emoji.test.ts`)
- Signature: `function findFilesWithEmoji(dirs: string[]): Array<{ file: string; match: string }>`
- Input rules: `dirs` is an array of directory paths (`shared/src`, `server/src`, `client/src`).
- Behaviour:
  1. Recursively enumerates all `.ts`, `.tsx`, `.css`, `.json`, `.html` files in the provided directories.
  2. Reads each file as UTF-8 text and tests against `/\p{Extended_Pictographic}/u`.
  3. Returns any file + matching character where an emoji is found.
- Returns: Empty array `[]` when clean.
- Errors: Test fails immediately if the returned array is non-empty.
- Edge cases: Ignores `node_modules`, `dist`, `coverage`. Also includes a `fast-check` property test (`numRuns: 100`) verifying that our emoji detector catches injected pictographic characters and accepts clean ASCII/Latin/punctuation strings, plus `repeats: 100` scan of the actual workspace source tree.

## Tests (100x protocol, CLAUDE.md §9)
- `client/src/__tests__/no-emoji.test.ts`:
  - Property 1 (100 valid runs): `fc.assert(fc.property(...), { numRuns: 100 })` — clean text without pictographs passes `hasEmoji(s) === false`, and every source file in `shared/src`, `server/src`, `client/src` has `hasEmoji === false`.
  - Property 2 (100 invalid runs): `fc.assert(fc.property(...), { numRuns: 100 })` — strings injected with sample pictographs (`\u{1F525}`, `\u{2705}`, `\u{1F4C5}`, `\u{2728}`, `\u{1F680}`) always return `hasEmoji(s) === true`.
- Command: `npm run lint && npm run typecheck && npm run test:100`

## Acceptance gate
- [ ] `npm install` succeeds and links `@mal/shared`, `@mal/server`, `@mal/client`.
- [ ] `.env.example` and `docker-compose.yml` match `CLAUDE.md` §3 and §4.
- [ ] `npm run lint` exits 0.
- [ ] `npm run typecheck` exits 0 across all three workspaces.
- [ ] `npm test` and `npm run test:100` exit 0 with `retries: 0` and 100/100 runs passing on the no-emoji guard tests.
- [ ] `docs/steps/STEP-01.result.md` is written and committed.

## Deliverable
Write `docs/steps/STEP-01.result.md` and commit `"step 01: monorepo scaffold"`.
