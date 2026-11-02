# STEP 08 result: Insights API, Seed script, and API documentation

References used: N/A (backend step powering R2 Plausible figures strip, sparkline, and bar list on `/` and R1 Linear overdue grouping on `/overdue`).

## Files changed
| File | Purpose |
|---|---|
| `server/src/services/insights.service.ts` | `getSummary`, `getOverdueByOwner`, `getUnconvertedDecisions`, `getWeeklyCompletion` |
| `server/src/controllers/insights.controller.ts` | Express 5 handlers for `/api/insights/*` |
| `server/src/routes/insights.routes.ts` | Router mounted at `/api/insights` |
| `server/src/routes/index.routes.ts` | Mounts `/insights` |
| `server/src/seed/seed.ts` | Relative-date demo seeder (`seedDatabase`) with 5 members, 6 meetings, 7 decisions, 10 actions (4 overdue across 3 owners, 3 pending decisions), zero emojis |
| `server/src/server.ts` | Auto-seeds demo data on startup if the database is empty |
| `docs/API.md` | Complete REST API reference for all endpoints |
| `server/tests/integration/insights.service.test.ts` | 100x property tests for `insights.service` and `seedDatabase` |
| `server/tests/api/insights.api.test.ts` | 100x Supertest API tests for `/api/insights/*` |

## Functions added
- `insightsService.getSummary(now?: Date): Promise<InsightsSummaryDTO>`
- `insightsService.getOverdueByOwner(now?: Date): Promise<OverdueOwnerGroupDTO[]>`
- `insightsService.getUnconvertedDecisions(query?: ListQueryUnconverted, now?: Date): Promise<DecisionDTO[]>`
- `insightsService.getWeeklyCompletion(query?: ListQueryWeekly, now?: Date): Promise<WeeklyCompletionBucketDTO[]>`
- `seedDatabase(now?: Date): Promise<SeedSummary>`

## Commands run
| Command | Result |
|---|---|
| `npx vitest run server/tests/integration/insights.service.test.ts server/tests/api/insights.api.test.ts --retry=0` | 5/5 passed (500 property runs, 0 failed) |
| `npx vitest run --project @mal/server --coverage --retry=0` | All server suites green, coverage > 90% lines and branches |
| `npm run lint && npm run typecheck` | exit 0 |

## Test counts (retries 0)
| Suite | Tests | Property runs | Passed | Failed |
|---|---|---|---|---|
| `insights.service.test.ts` | 3 | 300 | 3 | 0 |
| `insights.api.test.ts` | 2 | 200 | 2 | 0 |
