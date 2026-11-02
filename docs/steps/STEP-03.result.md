# STEP 03 result: Server foundation

References used: N/A (backend step, no screens). Error copy follows `docs/DESIGN.md` section 9 and `CLAUDE.md` section 7.

## Files changed

| File | Change |
|---|---|
| `server/package.json` | Runtime deps: express 5.3, mongoose 8.24, cors, helmet, pino, pino-http, express-rate-limit 8, dotenv, mongodb-memory-server 11, zod. Dev deps: supertest, @types/express, @types/cors, @types/supertest. `dev` runs `src/server.ts`, `start` runs `dist/server.js` |
| `server/tsup.config.ts` | entry `src/server.ts`, `noExternal: ['@mal/shared']` |
| `server/vitest.config.ts` | `hookTimeout` 120 s and `testTimeout` 60 s (mongod start-up). Coverage excludes `src/server.ts` (process bootstrap, checked by the smoke run below) |
| `server/src/index.ts` | removed (placeholder) |
| `server/src/config/env.ts` | `parseEnv`, `Env`, `env` |
| `server/src/utils/{ApiError,serialize,pagination}.ts` | error class and zod-details mapper, Mongoose toJSON transform, pagination meta |
| `server/src/db/connect.ts` | connect with retry, memory fallback, health check, graceful shutdown |
| `server/src/middleware/{requestId,rateLimit,validate,notFound,errorHandler}.ts` | the middleware chain |
| `server/src/routes/index.routes.ts` | `GET /api/health` and the mount point for resource routers |
| `server/src/app.ts`, `server/src/server.ts` | app factory and entry point |
| `server/tests/unit/foundation.unit.test.ts`, `server/tests/api/foundation.api.test.ts` | 100x suites |

## Functions added

- `parseEnv(raw: NodeJS.ProcessEnv = process.env): Env`: frozen result. Throws `Invalid environment configuration:` followed by one `- KEY: reason` line per bad key. Importing `env` with an invalid env prints that message and calls `process.exit(1)`.
- `class ApiError extends Error { code; status; details? }` with the factories `validation`, `invalidId`, `notFound`, `conflict`, `rateLimited`, `payloadTooLarge` (VALIDATION_ERROR, 413) and `internal`. `ErrorCode` is reused from `@mal/shared` (`ERROR_CODES`).
- `zodIssuesToDetails(issues): ErrorDetail[]`: joins the path with `.`. For unknown-key issues it reports the offending key names, so `$gt` injection shows `path: "$gt"`.
- `applyToJsonTransform(schema): void` and `serializeDoc(doc): Record<string, unknown>`: output has an `id` string and no `_id` or `__v`. Works for hydrated docs and lean objects.
- `buildPaginationMeta({ page, limit, total }): { page, limit, total, pages }` and `skipFor({ page, limit }): number`: `pages` is 0 when `total` is 0. Throws `RangeError` for non-integer or out-of-range input.
- `connectDB(uri, { maxRetries=3, retryDelayMs=1000, serverSelectionTimeoutMS=2000, allowMemoryFallback=false }): Promise<{ uri, inMemory, attempts }>`
- `isLocalMongoUri(uri): boolean`
- `disconnectDB(): Promise<void>`
- `getDbHealth(): 'up' | 'down'`
- `registerGracefulShutdown(server?, exit = process.exit): (signal) => Promise<void>`
- `requestId`: echoes an incoming `x-request-id` only when it matches `^[A-Za-z0-9._-]{1,128}$` and otherwise generates `randomUUID()`. This blocks header and log injection.
- `createRateLimiter(maxPerMin): RequestHandler`
- `validate({ params?, query?, body? }): RequestHandler`
- `notFound`
- `errorHandler(err, req, res, next)`
- `createApp({ env?, clientDistDir?, extraRoutes? }): Express`

## Commands run (final pass, real exit codes)

| Command | Result |
|---|---|
| `npm run lint` | exit 0 (eslint + prettier --check) |
| `npm run typecheck` | exit 0 (all workspaces) |
| `npm run test:100` | exit 0: 5 files, **165 / 165 passed, 0 failed**, retries 0, about 9 s |
| `vitest run --coverage` (server) | exit 0: lines 99.40 %, branches 96.26 %, functions 97.77 %, statements 99.45 % (gate 90 / 90) |
| `npm run build -w @mal/server` | tsup build succeeded, writes `dist/server.js` |
| `npx license-checker-rseidelsohn --excludePrivatePackages --onlyAllow <allowlist> --summary` | exit 0 (MIT 313, Apache-2.0 33, ISC 19, BSD-2 8, BSD-3 3, MPL-2.0 2, Python-2.0 1, 0BSD 1) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Secret regex scan over the tracked tree | no matches. `hunter2` appears only as a planted test string that must never leak |

## Test counts (each property runs 100 times, `numRuns: 100`)

| Suite | Tests | Passed | Failed |
|---|---|---|---|
| server unit (`foundation.unit.test.ts`) | 28 | 28 | 0 |
| server API (`foundation.api.test.ts`) | 13 | 13 | 0 |
| shared (step 02) | 124 | 124 | 0 |
| **Total** | **165** | **165** | **0** |

What the 100x properties cover:
- `parseEnv`: 100 valid, 100 invalid.
- Pagination: 100 valid, 100 invalid.
- `ApiError` factories: 100 runs.
- `errorHandler`: 100 runs across 10 error classes (ApiError, ZodError, CastError, 11000, SyntaxError, 413, 415, Error, string, null).
- `notFound`: 100 runs.
- `validate`: 100 valid, 100 invalid.
- `serialize`: 100 runs.
- `connectDB`: 100 connect/disconnect cycles and 100 retry-exhaustion runs.
- `isLocalMongoUri`: 100 runs.
- HTTP (each 100 runs):
  - `/api/health`
  - unknown routes
  - malformed JSON
  - bodies over 100 kb
  - valid and invalid validate requests
  - real Mongoose CastError
  - real E11000 duplicate key
  - unexpected 500s
  - rate-limit windows
  - production SPA serving

Mutation check: two planted mutants were each caught. Changing the duplicate-key status from 409 to 400 failed 2 tests. Making `validate` stop classifying INVALID_ID failed 2 tests. Both files were restored.

## Live smoke run (built bundle, no MongoDB on 27017)

`PORT=5055 node dist/server.js` logged `MongoDB at MONGODB_URI is unreachable; using an embedded in-memory database.` and then served:

```
GET  /api/health  (x-request-id: smoke-1)  -> 200 {"data":{"status":"ok","db":"up","time":"2026-11-02T09:44:12.234Z"}}, x-request-id: smoke-1
GET  /api/nope                                -> 404 {"error":{"code":"NOT_FOUND","message":"Route GET /api/nope not found.","requestId":"<uuid>"}}
POST /api/health  body "{bad"                 -> 400 {"error":{"code":"VALIDATION_ERROR","message":"Request body is not valid JSON.","requestId":"<uuid>"}}
POST /api/health  110 kb body                 -> 413 {"error":{"code":"VALIDATION_ERROR","message":"Request body exceeds the 100kb limit.","requestId":"<uuid>"}}
```

## Things for Antigravity to check

- **Port 5000 is taken on this machine** by another local Node process that answers JSON-RPC, so the smoke run used `PORT=5055`. `npm run dev` with the default `.env` will fail with EADDRINUSE until that process is stopped or `PORT` is changed. I did not touch the other process.
- The memory fallback is on in development and test and off in production (`allowMemoryFallback: NODE_ENV !== 'production'`). It only applies to single-host local URIs (`127.0.0.1`, `localhost`, `[::1]`).

## Deviations and open questions

1. The rate limiter is mounted on `/api` only, still between pino-http and the routes as section 7 requires, so static client assets in production are not rate-limited.
2. `errorHandler` has one extra branch beyond the spec. Other body-parser 4xx errors (unsupported charset or encoding, aborted request) map to `VALIDATION_ERROR` with their own status and the message "Request body could not be read.". Without it, they would be reported as 500 INTERNAL.
3. `errorHandler` hands off to Express's default handler when `res.headersSent` is already true (the standard Express rule).
4. `createApp` takes an `extraRoutes` option, used only by the API tests to mount the validate, CastError, duplicate-key and boom routes behind the real middleware chain.
5. The memory-fallback end-to-end test runs 3 times, not 100, because each run starts a real mongod (about 1 to 2 s). The decision logic (`isLocalMongoUri`) and the retry loop each run 100 times.
6. `mongodb-memory-server` is a runtime dependency, not a dev dependency, because `connectDB` imports it lazily for the fallback. It is never loaded in production.
7. `license-checker` needs `--excludePrivatePackages`, because the private workspaces (`@mal/client` and others) are `UNLICENSED` by design. The global `CLAUDE.md` command should probably include that flag.
8. Helmet's default CSP (`script-src 'self'`) will block externally hosted fonts or scripts if the client loads any (for example Google Fonts). Revisit this when the client build is served in production.
9. npm's allow-scripts blocked the postinstall for `mongodb-memory-server`. The mongod binary downloads on first use instead (already cached on this machine).
