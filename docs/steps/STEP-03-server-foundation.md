# STEP 03 — Server foundation

## Goal
Build the Express 5 server foundation (`env.ts`, `connect.ts` with retry, graceful shutdown, and automatic embedded MongoMemoryServer fallback when local `27017` is not running, `ApiError.ts`, `serialize.ts`, `pagination.ts`, `requestId.ts`, `rateLimit.ts`, `validate.ts` populating `req.valid`, `notFound.ts`, `errorHandler.ts`, `/api/health` route, `app.ts`, and `server.ts`) and verify every middleware, error mapping, validation path, and `/api/health` endpoint with 100x tests and real HTTP requests.

## Read first
`CLAUDE.md` §3, §4, §5, §7, §9; `docs/DESIGN.md` §9.

## Reference that shapes this screen
N/A (backend foundation step; error copy follows `docs/DESIGN.md` §9).

## Files to create / change
- `server/package.json` — Add runtime dependencies (`express@^5.1.0`, `mongoose@^8`, `cors`, `helmet`, `pino`, `pino-http`, `express-rate-limit`, `dotenv`) and dev/runtime fallback dependencies (`mongodb-memory-server`, `supertest`, `@types/express`, `@types/cors`, `@types/supertest`). Update `dev`, `build`, `start` scripts to point to `src/server.ts` / `dist/server.js`.
- `server/tsup.config.ts` — Set entry to `['src/server.ts']` with `noExternal: ['@mal/shared']`.
- `server/src/config/env.ts` — Parse `process.env` with Zod (`parseEnv(rawEnv)`), exporting typed `env` object (`NODE_ENV`, `PORT`, `MONGODB_URI`, `CLIENT_ORIGIN`, `APP_TIMEZONE`, `RATE_LIMIT_PER_MIN`). Exits with readable message when called from main process on invalid env.
- `server/src/utils/ApiError.ts` — `ApiError` class with static factory methods (`validation`, `invalidId`, `notFound`, `conflict`, `rateLimited`, `payloadTooLarge`, `internal`) and `ErrorDetail { path: string; message: string }`.
- `server/src/utils/serialize.ts` — Mongoose `applyToJsonTransform(schema)` helper (`id` string from `_id`, strips `_id` and `__v`) and `serializeDoc` helper.
- `server/src/utils/pagination.ts` — `buildPaginationMeta({ page, limit, total }) => { page, limit, total, pages }` and `skipFor({ page, limit })`.
- `server/src/db/connect.ts` — `connectDB(uri, options?)` with retry loop (`maxRetries`, `retryDelayMs`), embedded `MongoMemoryServer` fallback when local `127.0.0.1:27017` is unreachable (when `allowMemoryFallback` is enabled), `disconnectDB()`, `getDbHealth(): 'up' | 'down'`, and `registerGracefulShutdown(server?)`.
- `server/src/middleware/requestId.ts` — Reads valid incoming `x-request-id` header or generates `crypto.randomUUID()`, attaches `req.requestId`, and sets response header `x-request-id`.
- `server/src/middleware/rateLimit.ts` — Configurable rate limiter (`createRateLimiter(maxPerMin)`) returning `429` with `{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down and try again.', requestId } }`.
- `server/src/middleware/validate.ts` — `validate({ params?, query?, body? })` middleware that parses with Zod, attaches typed `{ params, query, body }` to `req.valid` (never reassigns `req.query` in Express 5), maps invalid ObjectId params to `INVALID_ID` (400) and other Zod issues to `VALIDATION_ERROR` (400) with `details: [{ path, message }]`.
- `server/src/middleware/notFound.ts` — Unknown route handler throwing `ApiError.notFound(\`Route \${req.method} \${req.originalUrl} not found.\`)`.
- `server/src/middleware/errorHandler.ts` — Central error handler mapping `ApiError`, `ZodError`, Mongoose `CastError` (`INVALID_ID` 400), Mongo duplicate key `11000` (`CONFLICT` 409), `SyntaxError` from `express.json()` (`VALIDATION_ERROR` 400 `"Request body is not valid JSON."`), `entity.too.large` / status `413` (`VALIDATION_ERROR` 413 `"Request body exceeds the 100kb limit."`), and unexpected errors (`INTERNAL` 500 without stack trace in production) into `{ error: { code, message, details?, requestId } }`.
- `server/src/routes/index.routes.ts` — Mounts `/health` (`GET /api/health` returning `{ data: { status: 'ok', db: 'up' | 'down', time: new Date().toISOString() } }`) and placeholders for resource routers.
- `server/src/app.ts` — `createApp(options?)` configuring middleware in exact `CLAUDE.md` §7 order: `requestId` -> `helmet` -> `cors(CLIENT_ORIGIN)` -> `express.json({ limit: '100kb' })` -> `pino-http` (silent in test) -> `rateLimit` -> `/api` routes -> static client serving in production if `client/dist` exists -> `notFound` -> `errorHandler`.
- `server/src/server.ts` — Entry point that loads `.env`, connects to MongoDB, starts HTTP server on `env.PORT`, and registers graceful shutdown. Remove placeholder `server/src/index.ts`.
- `server/tests/unit/foundation.unit.test.ts` — 100x property tests for `parseEnv`, `ApiError`, `buildPaginationMeta`, `serializeDoc`, `validate`, `errorHandler`, and `connectDB`.
- `server/tests/api/foundation.api.test.ts` — 100x Supertest API tests for `/api/health`, `requestId` propagation, `validate` middleware on test routes, malformed JSON (400), oversize >100kb body (413), unknown routes (404), CastError/duplicate key/internal error mapping, and rate limiting (429).

## Functions / endpoints / components (one block each)

### `parseEnv(raw?: NodeJS.ProcessEnv): Env` (`server/src/config/env.ts`)
- Signature: `parseEnv(raw: NodeJS.ProcessEnv = process.env): Env`
- Input rules:
  - `NODE_ENV`: `'development' | 'test' | 'production'`, default `'development'`
  - `PORT`: integer `1..65535`, default `5000`
  - `MONGODB_URI`: non-empty string starting with `mongodb://` or `mongodb+srv://`, default `'mongodb://127.0.0.1:27017/meeting_action_log'`
  - `CLIENT_ORIGIN`: valid URL string, default `'http://localhost:5173'`
  - `APP_TIMEZONE`: valid IANA timezone (validated via `todayISO(tz)`), default `'Asia/Kolkata'`
  - `RATE_LIMIT_PER_MIN`: integer `1..100000`, default `300`
- Behaviour: Parses with Zod and returns frozen `Env` object; throws descriptive `Error` listing invalid keys when invalid.

### `ApiError` (`server/src/utils/ApiError.ts`)
- Signature: `class ApiError extends Error { readonly code: ErrorCode; readonly status: number; readonly details?: ErrorDetail[] }`
- Behaviour: Provides static helpers `validation(message, details?)` (400), `invalidId(message = 'Invalid identifier.', details?)` (400), `notFound(message = 'Resource not found.')` (404), `conflict(message)` (409), `rateLimited(message)` (429), `payloadTooLarge(message)` (413), `internal(message = 'An unexpected error occurred.')` (500).

### `validate(schemas: { params?: ZodType; query?: ZodType; body?: ZodType })` (`server/src/middleware/validate.ts`)
- Signature: `validate<P, Q, B>(schemas: { params?: ZodType<P>; query?: ZodType<Q>; body?: ZodType<B> }): RequestHandler`
- Behaviour, in order:
  1. Initialize `req.valid = { params: req.params, query: req.query, body: req.body }`.
  2. If `schemas.params` is provided, `safeParse(req.params)`. On failure: if any issue is on an `id` / `*Id` path with invalid ObjectId format, throw `ApiError.invalidId(issue.message, details)`; otherwise throw `ApiError.validation('Invalid route parameters.', details)`. On success: assign `req.valid.params = parsed.data`.
  3. If `schemas.query` is provided, `safeParse(req.query)`. On failure: throw `ApiError.validation('Invalid query parameters.', details)`. On success: assign `req.valid.query = parsed.data` (do NOT mutate `req.query`).
  4. If `schemas.body` is provided, `safeParse(req.body ?? {})`. On failure: throw `ApiError.validation('Check the highlighted fields.', details)`. On success: assign `req.valid.body = parsed.data` and `req.body = parsed.data`.
  5. Call `next()`.

### `errorHandler` (`server/src/middleware/errorHandler.ts`)
- Signature: `errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void`
- Behaviour, in order:
  1. Read `requestId = req.requestId || 'unknown'`.
  2. If `err instanceof ApiError`: respond with `err.status` and `{ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}), requestId } }`.
  3. If `err` is body-parser `type === 'entity.too.large'` or `status === 413`: respond `413` with `code: 'VALIDATION_ERROR'`, `message: 'Request body exceeds the 100kb limit.'`.
  4. If `err instanceof SyntaxError` with `'body' in err`: respond `400` with `code: 'VALIDATION_ERROR'`, `message: 'Request body is not valid JSON.'`.
  5. If `err instanceof ZodError`: map issues to `details: [{ path: issue.path.join('.'), message: issue.message }]` and respond `400` with `code: 'VALIDATION_ERROR'`.
  6. If Mongoose `CastError` (`err.name === 'CastError'`): respond `400` with `code: 'INVALID_ID'`, `message: 'Invalid identifier.'`.
  7. If Mongo duplicate key (`(err as { code?: number }).code === 11000`): respond `409` with `code: 'CONFLICT'`, `message: 'A record with that value already exists.'`.
  8. Otherwise respond `500` with `{ error: { code: 'INTERNAL', message: 'An unexpected error occurred.', requestId } }` (never leak `err.stack` in the JSON body).

### `GET /api/health`
- Behaviour: Returns `200` `{ data: { status: 'ok', db: getDbHealth(), time: new Date().toISOString() } }`.

## Tests (100x protocol, CLAUDE.md §9)
- `server/tests/unit/foundation.unit.test.ts`:
  - `parseEnv`: 100 valid env combinations + 100 invalid env combinations (bad port, bad URI, bad timezone, bad NODE_ENV, bad rate limit).
  - `buildPaginationMeta` & `skipFor`: 100 valid `(page, limit, total)` tuples + 100 edge/invalid inputs.
  - `ApiError` & `errorHandler`: 100 runs verifying every error class (`ApiError`, `ZodError`, `CastError`, `11000`, `SyntaxError`, `413`, `Error`) maps to the exact status code, error code, and JSON shape with no stack trace leaked.
  - `validate`: 100 valid payloads/queries/params + 100 invalid payloads/queries/params asserting `req.valid` population and `INVALID_ID` vs `VALIDATION_ERROR` classification.
- `server/tests/api/foundation.api.test.ts`:
  - `GET /api/health`: 100 requests asserting 200, `{ data: { status: 'ok', db: 'up' | 'down', time } }`, and `x-request-id` header echoed or generated.
  - Unknown routes: 100 fuzzed unknown paths asserting 404 `NOT_FOUND`.
  - Malformed JSON: 100 truncated/corrupt JSON payloads asserting 400 `VALIDATION_ERROR`.
  - Oversize payload (>100kb): 413 response check.
  - Rate limit: verifies 429 `RATE_LIMITED` when limit is exceeded.
- Command: `npm run lint && npm run typecheck && npm run test:100`

## Acceptance gate
- [ ] `npm run lint` and `npm run typecheck` exit 0.
- [ ] `npm run test:100` passes 100/100 on all unit, API, shared, and client tests with `retries: 0`.
- [ ] Starting the server and hitting `GET /api/health`, an unknown route, and a malformed JSON POST returns the exact status codes and JSON shapes from `CLAUDE.md` §7.
- [ ] `docs/steps/STEP-03.result.md` is written and committed.

## Deliverable
Write `docs/steps/STEP-03.result.md` and commit `"step 03: server foundation and middleware"`.
