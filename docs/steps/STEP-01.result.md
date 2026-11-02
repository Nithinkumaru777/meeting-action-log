# STEP 01 result - Monorepo scaffold

## References used
N/A - infrastructure step, no screens. The no-emoji guard enforces DESIGN.md §0 rule 1 for every later UI step.

## Files created
| File | Purpose |
|---|---|
| `package.json` | Root manifest `meeting-action-log`, workspaces `shared/server/client`, scripts `dev, build, start, seed, lint, format, typecheck, test, test:100, test:e2e, test:e2e:100, test:report`, one scoped `overrides` entry (see Open questions 4) |
| `package-lock.json` | Lockfile |
| `tsconfig.base.json` | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes: false`, `ES2022`, `moduleResolution: bundler`, `skipLibCheck`, `verbatimModuleSyntax`, `isolatedModules`, `noEmit` |
| `.gitignore` | `node_modules, dist, coverage, .env, .data, playwright-report, test-results, *.log` |
| `.env.example`, `.env` | Exactly CLAUDE.md §4 (`.env` is git-ignored) |
| `docker-compose.yml` | `mongo:7`, `27017:27017`, named volume `mongo_data` |
| `eslint.config.mjs` | Flat config: `@eslint/js` recommended + `typescript-eslint` recommended, `@typescript-eslint/no-explicit-any: error`, node + browser globals |
| `.prettierrc`, `.prettierignore` | `singleQuote, semi, trailingComma all, printWidth 100`; ignores lockfile, `docs/`, `*.md`, `*.html` |
| `vitest.config.ts` | Root runner, `test.projects: ['shared', 'server', 'client']` |
| `shared/{package.json, tsconfig.json, vitest.config.ts, src/index.ts}` | `@mal/shared`, `exports: { ".": "./src/index.ts" }`, `retry: 0`, coverage thresholds 100/100/100/100, `APP_NAME = 'MeetingActionLog'` |
| `server/{package.json, tsconfig.json, vitest.config.ts, tsup.config.ts, src/index.ts}` | `@mal/server`, `tsx watch` dev, `tsup` build with `noExternal: ['@mal/shared']`, `retry: 0`, coverage thresholds 90 lines/branches, placeholder entry importing `@mal/shared` |
| `client/{package.json, tsconfig.json, vitest.config.ts, src/index.ts}` | `@mal/client`, vite scripts, `jsx: react-jsx` + DOM libs, `retry: 0`, coverage threshold 80 lines, placeholder entry importing `@mal/shared` |
| `client/src/__tests__/no-emoji.test.ts` | No-emoji guard |

## Functions added
In `client/src/__tests__/no-emoji.test.ts` (test-local, not exported):
- `hasEmoji(s: string): boolean`: tests for `/\p{Extended_Pictographic}/u`.
- `listSourceFiles(dir: string): string[]`: recursively lists `.ts .tsx .css .json .html` files and skips `node_modules`, `dist` and `coverage`.
- `findFilesWithEmoji(dirs: string[]): Array<{ file: string; match: string }>`: returns every file containing a pictograph, with the first match. Returns `[]` when the tree is clean.

The step names the block `noEmojiScan(dirPaths)` but gives the signature `findFilesWithEmoji(dirs)`. The signature is the one used.

## Dependencies (all dev)
typescript 6.0.3, vitest 5.0.5, @vitest/coverage-v8 5.0.5, fast-check 4.10.2, eslint 9.39.5, @eslint/js 9.39.5, typescript-eslint 8.72.1, globals 17, prettier 3.9.10, @types/node 26, concurrently 10, tsx 4.23 (server), tsup 9 (server), vite 8.3 (client).

## Commands run
| Command | Result |
|---|---|
| `npm install` | OK, `@mal/shared`, `@mal/server`, `@mal/client` linked (`npm ls --depth=0`) |
| `npm run lint` | exit 0 (eslint clean, prettier clean) |
| `npm run typecheck` | exit 0 in shared, server and client |
| `npm test` | exit 0, 1 file, 4 tests |
| `npm run test:100` | exit 0, 4/4 tests, `--retry=0` |
| `npm run build -w @mal/server` then `node server/dist/index.js` | builds, prints `MeetingActionLog server scaffold` (shared bundled in) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npx license-checker-rseidelsohn --onlyAllow <allowlist>;UNLICENSED` | pass. The 4 `UNLICENSED` entries are this repo's own private packages |
| Mutation check: planted U+1F680 in `shared/src/planted.ts` | the guard failed as expected; file removed, guard green again |

## Test counts (retries 0)
| Test | Runs | Passed | Failed |
|---|---|---|---|
| property: clean text never flagged | 100 | 100 | 0 |
| property: text with an injected pictograph (U+1F525, U+2705, U+1F4C5, U+2728, U+1F680) always flagged | 100 | 100 | 0 |
| scanner on a fixture tree (extensions filter, nested dirs, `node_modules` skipped, `.md` ignored) | 1 | 1 | 0 |
| workspace source tree (`shared/src`, `server/src`, `client/src`) has zero emojis, plus a non-empty-scan assertion | 101 (`repeats: 100` = first run + 100 repeats) | 101 | 0 |

## Coverage
Not run in this step. `shared` only exports a constant, so there is no function to cover yet. Thresholds are configured (shared 100, server 90, client 80) and start to apply in STEP 02 when `shared/dates.ts` lands.

## Check in the browser
Nothing. There is no UI yet.

## Open questions / notes for Antigravity
1. **ESLint v9 pinned as the step says.** The latest is v10, which also works with typescript-eslint 8.72. Tell me if you want v10.
2. **No `vitest.workspace.ts`.** It is deprecated since Vitest 3.2, so the root `vitest.config.ts` uses `test.projects` instead. Each project sets `retry: 0` itself, because project configs do not inherit root options.
3. **Dev-only audit advisory.** `npm audit` (dev included) reports 11 moderate findings, all from GHSA-g3hv-75wg-m249 (minimatch < 11.0.1, ReDoS) inside ESLint 9's own dependency tree. This is tooling only: production audit is 0. A `--force` fix would downgrade ESLint to 4, so it was not applied.
4. **License gate fix.** typescript-eslint pulls `minimatch@10`, which is licensed BlueOak-1.0.0 and is not on the allowlist. A scoped override `@typescript-eslint/typescript-estree -> minimatch ^9.0.5` (ISC) replaces it. typescript-estree only calls the named `minimatch()` export, which v9 has, and lint still passes.
5. **gitleaks did not run.** The local lean-ctx shell allowlist blocks it. I ran a pattern grep for API keys, tokens, AWS/GitHub/OpenAI key formats and `mongodb+srv` credentials instead: no matches. Please run `gitleaks detect --source . --no-git` on your side.
6. **Scripts that point at later-step files.** `seed` (`server/src/seed/seed.ts`), `test:e2e` and `test:e2e:100` (`e2e/playwright.config.ts`), `test:report` (`scripts/test-report.mjs`) and the client `build` (needs `client/index.html` + `main.tsx`) are wired to their final targets. They fail until those steps add the files. Playwright is not installed yet.
7. **Entry file name.** The step specifies `server/src/index.ts`, while the CLAUDE.md §3 layout has `app.ts` + `server.ts`. I followed the step for now; the API step should rename it and update `dev`, `start` and `tsup.config.ts`.
8. **Blocked install script.** npm 11 `allow-scripts` blocked esbuild's postinstall. The tsup build still works without it, so I did not approve it.
9. **`test` vs `test:100`.** These are currently the same suite, because the 100x runs live inside the tests (`numRuns: 100`, `repeats: 100`). `test:100` adds `--retry=0` and the verbose reporter. The E2E 100x lives in `test:e2e:100`.
10. **Duplicate docs at the root.** `DESIGN.md`, `design-spec.md` and `prototype.html` at the root are byte-identical to the copies in `docs/`. They are committed as-is (`git add -A`) and not removed.
