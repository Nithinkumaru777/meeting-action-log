import http from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z, ZodError } from 'zod';
import { idParamSchema, memberCreateSchema, paginationQuerySchema } from '@mal/shared';
import { parseEnv } from '../../src/config/env';
import {
  connectDB,
  disconnectDB,
  getDbHealth,
  isLocalMongoUri,
  registerGracefulShutdown,
} from '../../src/db/connect';
import { errorHandler } from '../../src/middleware/errorHandler';
import { notFound } from '../../src/middleware/notFound';
import { createRateLimiter } from '../../src/middleware/rateLimit';
import { validate } from '../../src/middleware/validate';
import { ApiError } from '../../src/utils/ApiError';
import { buildPaginationMeta, skipFor } from '../../src/utils/pagination';
import { applyToJsonTransform, serializeDoc } from '../../src/utils/serialize';

const RUNS = { numRuns: 100 };
const hex24 = fc.stringMatching(/^[0-9a-f]{24}$/);
const ZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/Berlin', 'Australia/Sydney'];

// ---------- mocks ----------
interface MockRes {
  statusCode: number;
  body: unknown;
  headersSent: boolean;
  status(c: number): MockRes;
  json(b: unknown): MockRes;
}
const mockRes = (headersSent = false): MockRes => ({
  statusCode: 200,
  body: undefined,
  headersSent,
  status(c) {
    this.statusCode = c;
    return this;
  },
  json(b) {
    this.body = b;
    return this;
  },
});
const asRes = (r: MockRes) => r as unknown as Response;
const asReq = (r: Partial<Request>) => r as unknown as Request;
const noop: NextFunction = () => {};

// ---------- parseEnv ----------
describe('parseEnv', () => {
  const validEnv = fc.record(
    {
      NODE_ENV: fc.constantFrom('development', 'test', 'production'),
      PORT: fc.integer({ min: 1, max: 65535 }).map(String),
      MONGODB_URI: fc
        .tuple(fc.constantFrom('mongodb://', 'mongodb+srv://'), fc.domain())
        .map(([p, h]) => `${p}${h}/db`),
      CLIENT_ORIGIN: fc
        .tuple(fc.constantFrom('http', 'https'), fc.domain(), fc.integer({ min: 1, max: 65535 }))
        .map(([p, h, port]) => `${p}://${h}:${port}`),
      APP_TIMEZONE: fc.constantFrom(...ZONES),
      RATE_LIMIT_PER_MIN: fc.integer({ min: 1, max: 100_000 }).map(String),
    },
    { requiredKeys: [] },
  );

  it('accepts 100 valid env combinations and applies defaults for missing keys', () => {
    fc.assert(
      fc.property(validEnv, (raw) => {
        const env = parseEnv(raw);
        expect(Object.isFrozen(env)).toBe(true);
        expect(env.NODE_ENV).toBe(raw.NODE_ENV ?? 'development');
        expect(env.PORT).toBe(raw.PORT ? Number(raw.PORT) : 5000);
        expect(env.MONGODB_URI).toBe(
          raw.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/meeting_action_log',
        );
        expect(env.APP_TIMEZONE).toBe(raw.APP_TIMEZONE ?? 'Asia/Kolkata');
        expect(env.RATE_LIMIT_PER_MIN).toBe(
          raw.RATE_LIMIT_PER_MIN ? Number(raw.RATE_LIMIT_PER_MIN) : 300,
        );
        expect(typeof env.CLIENT_ORIGIN).toBe('string');
      }),
      RUNS,
    );
  });

  const BAD: Record<string, string[]> = {
    NODE_ENV: ['prod', 'TEST', '', 'staging'],
    PORT: ['0', '65536', 'abc', '', '5e3', '-1', '1.5', '0x10', ' 80'],
    MONGODB_URI: ['http://x', 'mongo://x', '', 'mongodb://', 'postgres://db'],
    CLIENT_ORIGIN: ['not a url', 'ftp://x.com', '', 'localhost:5173'],
    APP_TIMEZONE: ['Mars/Phobos', 'Asia/Nowhere', 'GMT+99', 'not a zone'],
    RATE_LIMIT_PER_MIN: ['0', '100001', 'x', '', '-5', '2.5'],
  };

  it('rejects 100 invalid env combinations, naming the bad key', () => {
    const invalid = fc
      .constantFrom(...Object.keys(BAD))
      .chain((key) => fc.tuple(fc.constant(key), fc.constantFrom(...BAD[key]!)));
    fc.assert(
      fc.property(validEnv, invalid, (raw, [key, value]) => {
        expect(() => parseEnv({ ...raw, [key]: value })).toThrow(
          new RegExp(`Invalid environment configuration:[\\s\\S]*${key}`),
        );
      }),
      RUNS,
    );
  });
});

// ---------- pagination ----------
describe('buildPaginationMeta / skipFor', () => {
  it('computes meta and skip for 100 valid tuples', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        (page, limit, total) => {
          const meta = buildPaginationMeta({ page, limit, total });
          expect(meta).toEqual({ page, limit, total, pages: Math.ceil(total / limit) });
          expect(meta.pages * limit).toBeGreaterThanOrEqual(total);
          if (total > 0) expect((meta.pages - 1) * limit).toBeLessThan(total);
          else expect(meta.pages).toBe(0);
          expect(skipFor({ page, limit })).toBe((page - 1) * limit);
        },
      ),
      RUNS,
    );
  });

  it('throws RangeError for 100 edge/invalid inputs', () => {
    const bad = fc.constantFrom(0, -1, -100, 1.5, Number.NaN, Infinity, -Infinity, 2 ** 60);
    const field = fc.constantFrom('page', 'limit', 'total');
    fc.assert(
      fc.property(field, bad, (f, v) => {
        const input = { page: 2, limit: 10, total: 50, [f]: v };
        if (f === 'total' && v === 0) {
          expect(buildPaginationMeta(input).pages).toBe(0); // 0 is a legal total
          return;
        }
        expect(() => buildPaginationMeta(input)).toThrow(RangeError);
        if (f !== 'total') expect(() => skipFor(input)).toThrow(RangeError);
      }),
      RUNS,
    );
  });
});

// ---------- ApiError ----------
describe('ApiError factories', () => {
  const cases = [
    ['validation', 'VALIDATION_ERROR', 400],
    ['invalidId', 'INVALID_ID', 400],
    ['notFound', 'NOT_FOUND', 404],
    ['conflict', 'CONFLICT', 409],
    ['rateLimited', 'RATE_LIMITED', 429],
    ['payloadTooLarge', 'VALIDATION_ERROR', 413],
    ['internal', 'INTERNAL', 500],
  ] as const;

  it('each factory yields the right code/status/message 100 times', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...cases),
        fc.string({ minLength: 1 }),
        ([fn, code, status], msg) => {
          const err = (ApiError[fn] as (m: string) => ApiError)(msg);
          expect(err).toBeInstanceOf(ApiError);
          expect(err).toBeInstanceOf(Error);
          expect([err.code, err.status, err.message]).toEqual([code, status, msg]);
        },
      ),
      RUNS,
    );
  });

  it('has default messages and drops empty details', () => {
    expect(ApiError.invalidId().message).toBe('Invalid identifier.');
    expect(ApiError.notFound().message).toBe('Resource not found.');
    expect(ApiError.internal().message).toBe('An unexpected error occurred.');
    expect(ApiError.validation('x', []).details).toBeUndefined();
    expect(ApiError.validation('x', [{ path: 'a', message: 'b' }]).details).toHaveLength(1);
  });
});

// ---------- errorHandler ----------
describe('errorHandler', () => {
  const zodErr = () => {
    const r = z
      .strictObject({ name: z.string().min(2, 'Too short.') })
      .safeParse({ name: 'a', x: 1 });
    if (r.success) throw new Error('unreachable');
    return r.error;
  };
  const castErr = () => new mongoose.Error.CastError('ObjectId', 'nope', '_id');
  const syntaxErr = () =>
    Object.assign(new SyntaxError('Unexpected token'), {
      body: '{',
      status: 400,
      type: 'entity.parse.failed',
    });

  type Kind = [string, () => unknown, number, string, string];
  const kinds: Kind[] = [
    ['ApiError', () => ApiError.conflict('Already there.'), 409, 'CONFLICT', 'Already there.'],
    ['ZodError', zodErr, 400, 'VALIDATION_ERROR', 'Check the highlighted fields.'],
    ['CastError', castErr, 400, 'INVALID_ID', 'Invalid identifier.'],
    [
      '11000',
      () => Object.assign(new Error('E11000 dup'), { code: 11000 }),
      409,
      'CONFLICT',
      'A record with that value already exists.',
    ],
    ['SyntaxError', syntaxErr, 400, 'VALIDATION_ERROR', 'Request body is not valid JSON.'],
    [
      '413',
      () => Object.assign(new Error('too large'), { type: 'entity.too.large', status: 413 }),
      413,
      'VALIDATION_ERROR',
      'Request body exceeds the 100kb limit.',
    ],
    [
      '415',
      () => Object.assign(new Error('bad charset'), { type: 'charset.unsupported', status: 415 }),
      415,
      'VALIDATION_ERROR',
      'Request body could not be read.',
    ],
    [
      'Error',
      () => new Error('db password=hunter2 at /srv/app.js:10'),
      500,
      'INTERNAL',
      'An unexpected error occurred.',
    ],
    ['string', () => 'thrown string', 500, 'INTERNAL', 'An unexpected error occurred.'],
    ['null', () => null, 500, 'INTERNAL', 'An unexpected error occurred.'],
  ];

  it('maps every error class to the exact status, code and shape (100 runs), never leaking stacks', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...kinds),
        fc.option(fc.uuid(), { nil: undefined }),
        ([, make, status, code, message], requestId) => {
          const res = mockRes();
          errorHandler(make(), asReq({ requestId: requestId as string }), asRes(res), noop);
          expect(res.statusCode).toBe(status);
          const body = res.body as { error: Record<string, unknown> };
          expect(Object.keys(body)).toEqual(['error']);
          expect(body.error.code).toBe(code);
          expect(body.error.message).toBe(message);
          expect(body.error.requestId).toBe(requestId ?? 'unknown');
          const json = JSON.stringify(body);
          expect(json).not.toMatch(/stack|hunter2|\.js:\d+|at \//);
          if (message.startsWith('Check')) {
            expect(body.error.details).toHaveLength(2);
            expect(body.error.details).toEqual(
              expect.arrayContaining([
                { path: 'x', message: expect.any(String) },
                { path: 'name', message: 'Too short.' },
              ]),
            );
          } else expect(body.error).not.toHaveProperty('details');
        },
      ),
      RUNS,
    );
  });

  it('includes ApiError details and delegates when headers are already sent', () => {
    const res = mockRes();
    const details = [{ path: 'dueDate', message: "The due date can't be in the past." }];
    errorHandler(ApiError.validation('Bad', details), asReq({ requestId: 'r1' }), asRes(res), noop);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Bad', details, requestId: 'r1' },
    });

    let forwarded: unknown;
    const sent = mockRes(true);
    const err = new Error('late');
    errorHandler(err, asReq({}), asRes(sent), (e?: unknown) => {
      forwarded = e;
    });
    expect(forwarded).toBe(err);
    expect(sent.body).toBeUndefined();
  });
});

// ---------- notFound ----------
describe('notFound', () => {
  it('throws NOT_FOUND naming method and url (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('GET', 'POST', 'PATCH', 'DELETE'),
        fc.webPath(),
        (method, url) => {
          try {
            notFound(asReq({ method, originalUrl: url }), asRes(mockRes()), noop);
            expect.unreachable();
          } catch (e) {
            expect(e).toBeInstanceOf(ApiError);
            expect((e as ApiError).status).toBe(404);
            expect((e as ApiError).message).toBe(`Route ${method} ${url} not found.`);
          }
        },
      ),
      RUNS,
    );
  });
});

// ---------- validate ----------
describe('validate', () => {
  const mw = validate({
    params: idParamSchema,
    query: paginationQuerySchema,
    body: memberCreateSchema,
  });
  const run = (req: Partial<Request>) => {
    const r = asReq(req);
    let called = false;
    mw(r, asRes(mockRes()), () => {
      called = true;
    });
    return { req: r, called };
  };

  const validInput = fc.record({
    id: fc.stringMatching(/^[0-9a-fA-F]{24}$/),
    page: fc.integer({ min: 1, max: 100_000 }),
    limit: fc.integer({ min: 1, max: 100 }),
    name: fc.string({ minLength: 2, maxLength: 60 }).filter((s) => s.trim().length >= 2),
    // Realistic addresses: the shared schema uses zod's practical email rule, not full RFC 5322.
    email: fc.stringMatching(
      /^[a-z0-9]{1,12}([._-][a-z0-9]{1,8})?@[a-z0-9]{2,12}\.(com|org|in|io)$/,
    ),
  });

  it('populates req.valid for 100 valid params/query/body and never reassigns req.query', () => {
    fc.assert(
      fc.property(validInput, (v) => {
        const query = Object.freeze({ page: String(v.page), limit: String(v.limit) });
        const { req, called } = run({
          params: { id: v.id },
          query,
          body: { name: v.name, email: v.email },
        });
        expect(called).toBe(true);
        expect(req.valid.params).toEqual({ id: v.id.toLowerCase() });
        expect(req.valid.query).toEqual({ page: v.page, limit: v.limit });
        expect(req.valid.body).toMatchObject({ name: v.name.trim() });
        expect(req.body).toBe(req.valid.body);
        expect(req.query).toBe(query);
      }),
      RUNS,
    );
  });

  it('passes through untouched parts when no schema is given', () => {
    const r = asReq({ params: { a: '1' }, query: { b: '2' }, body: undefined });
    let called = false;
    validate({})(r, asRes(mockRes()), () => (called = true));
    expect(called).toBe(true);
    expect(r.valid).toEqual({ params: { a: '1' }, query: { b: '2' }, body: undefined });
  });

  const badId = fc.oneof(
    fc.string().filter((s) => !/^[0-9a-fA-F]{24}$/.test(s)),
    fc.stringMatching(/^[0-9a-f]{23}$/),
    fc.stringMatching(/^[0-9a-f]{24}[g-z]$/),
  );
  type Bad = { where: 'params' | 'query' | 'body' | 'otherParam'; patch: Record<string, unknown> };
  const invalid: fc.Arbitrary<Bad> = fc.oneof(
    badId.map((id) => ({ where: 'params' as const, patch: { id } })),
    fc
      .constantFrom('0', '-1', 'abc', '1e2', '101')
      .map((limit) => ({ where: 'query' as const, patch: { limit } })),
    fc.constantFrom({ $gt: '' }, { extra: 1 }).map((patch) => ({ where: 'query' as const, patch })),
    fc
      .oneof(
        fc.constant({ name: 'a' }),
        fc.constant({ email: 'not-an-email' }),
        fc.constant({ name: 'x'.repeat(61) }),
        fc.constant({ $where: '1' }),
        fc.constant({ name: 42 }),
        fc.constant({ email: undefined }),
      )
      .map((patch) => ({ where: 'body' as const, patch })),
    fc.constant({ where: 'otherParam' as const, patch: { slug: 'x' } }),
  );

  it('classifies 100 invalid inputs as INVALID_ID vs VALIDATION_ERROR with details', () => {
    fc.assert(
      fc.property(validInput, invalid, (v, bad) => {
        const params: Record<string, unknown> = { id: v.id };
        const query: Record<string, unknown> = { page: '1', limit: '20' };
        const body: Record<string, unknown> = { name: 'Asha Rao', email: 'asha@example.com' };
        if (bad.where === 'params' || bad.where === 'otherParam') Object.assign(params, bad.patch);
        if (bad.where === 'query') Object.assign(query, bad.patch);
        if (bad.where === 'body') Object.assign(body, bad.patch);
        let err: unknown;
        let called = false;
        try {
          called = run({
            params: params as Request['params'],
            query: query as Request['query'],
            body,
          }).called;
        } catch (e) {
          err = e;
        }
        expect(called).toBe(false);
        expect(err).toBeInstanceOf(ApiError);
        const e = err as ApiError;
        expect(e.status).toBe(400);
        expect(e.details?.length).toBeGreaterThan(0);
        for (const d of e.details ?? []) {
          expect(typeof d.path).toBe('string');
          expect(d.message.length).toBeGreaterThan(0);
        }
        if (bad.where === 'params') {
          expect(e.code).toBe('INVALID_ID');
          expect(e.details?.[0]?.path).toBe('id');
        } else {
          expect(e.code).toBe('VALIDATION_ERROR');
          expect(e.message).toBe(
            bad.where === 'otherParam'
              ? 'Invalid route parameters.'
              : bad.where === 'query'
                ? 'Invalid query parameters.'
                : 'Check the highlighted fields.',
          );
        }
      }),
      RUNS,
    );
  });

  it('treats a missing body as {} (required-field errors, not a crash)', () => {
    const r = asReq({ params: {}, query: {}, body: undefined });
    expect(() => validate({ body: memberCreateSchema })(r, asRes(mockRes()), noop)).toThrow(
      ApiError,
    );
  });
});

// ---------- serialize ----------
describe('serializeDoc / applyToJsonTransform', () => {
  const schema = new mongoose.Schema({ name: String, tags: [String] });
  applyToJsonTransform(schema);
  const Thing = mongoose.models.SerializeThing ?? mongoose.model('SerializeThing', schema);

  it('emits id string and strips _id/__v for 100 hydrated and lean docs', () => {
    fc.assert(
      fc.property(
        hex24,
        fc.string(),
        fc.array(fc.string(), { maxLength: 5 }),
        (hex, name, tags) => {
          const _id = new mongoose.Types.ObjectId(hex);
          const hydrated = serializeDoc(new Thing({ _id, name, tags }));
          const lean = serializeDoc({ _id, __v: 3, name, tags });
          const viaJson = JSON.parse(JSON.stringify(new Thing({ _id, name, tags }))) as Record<
            string,
            unknown
          >;
          for (const out of [hydrated, lean, viaJson]) {
            expect(out.id).toBe(hex);
            expect(out).not.toHaveProperty('_id');
            expect(out).not.toHaveProperty('__v');
            expect(out.name).toBe(name);
            expect(out.tags).toEqual(tags);
          }
        },
      ),
      RUNS,
    );
  });

  it('leaves objects without _id alone apart from __v', () => {
    expect(serializeDoc({ a: 1, __v: 0 })).toEqual({ a: 1 });
  });
});

// ---------- connectDB ----------
describe('connectDB / getDbHealth / disconnectDB', () => {
  let mem: MongoMemoryServer;
  beforeAll(async () => {
    mem = await MongoMemoryServer.create();
  });
  afterAll(async () => {
    await disconnectDB();
    await mem.stop();
  });

  it('connects and disconnects 100 times, health tracking the state', async () => {
    await fc.assert(
      fc.asyncProperty(fc.stringMatching(/^[a-z][a-z0-9_]{0,20}$/), async (db) => {
        expect(getDbHealth()).toBe('down');
        const r = await connectDB(mem.getUri(db), { maxRetries: 1 });
        expect(r).toEqual({ uri: mem.getUri(db), inMemory: false, attempts: 1 });
        expect(getDbHealth()).toBe('up');
        expect(mongoose.connection.name).toBe(db);
        await disconnectDB();
        expect(getDbHealth()).toBe('down');
      }),
      RUNS,
    );
  });

  it('retries exactly maxRetries times then throws a readable error (100 runs)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async (maxRetries) => {
        const t = Date.now();
        await expect(
          connectDB('mongodb://127.0.0.1:1/unreachable', {
            maxRetries,
            retryDelayMs: 1,
            serverSelectionTimeoutMS: 15,
            allowMemoryFallback: false,
          }),
        ).rejects.toThrow(`Could not connect to MongoDB after ${maxRetries} attempt(s)`);
        expect(Date.now() - t).toBeGreaterThanOrEqual(15 * maxRetries);
        expect(getDbHealth()).toBe('down');
      }),
      RUNS,
    );
  });

  it('rejects invalid maxRetries and never falls back for remote URIs', async () => {
    await expect(connectDB(mem.getUri(), { maxRetries: 0 })).rejects.toThrow(RangeError);
    await expect(
      connectDB('mongodb://db.invalid:27017/x', {
        maxRetries: 1,
        serverSelectionTimeoutMS: 15,
        allowMemoryFallback: true,
      }),
    ).rejects.toThrow(/Could not connect/);
  });

  it('isLocalMongoUri recognises local single-host URIs only (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('127.0.0.1', 'localhost', '[::1]', 'db.example.com', '10.0.0.5'),
        fc.integer({ min: 1, max: 65535 }),
        fc.constantFrom('mongodb://', 'mongodb+srv://'),
        (host, port, scheme) => {
          const local =
            ['127.0.0.1', 'localhost', '[::1]'].includes(host) && scheme === 'mongodb://';
          expect(isLocalMongoUri(`${scheme}${host}:${port}/x`)).toBe(local);
        },
      ),
      RUNS,
    );
    expect(isLocalMongoUri('not a uri')).toBe(false);
  });

  // Each fallback launches a real mongod (~1-2s), so this path runs 3 times, not 100.
  it.each([1, 2, 3])(
    'falls back to an embedded MongoMemoryServer when local 27017-style URI is down (#%i)',
    async () => {
      const r = await connectDB('mongodb://127.0.0.1:1/fallback_db', {
        maxRetries: 1,
        serverSelectionTimeoutMS: 15,
        allowMemoryFallback: true,
      });
      expect(r.inMemory).toBe(true);
      expect(r.uri).toMatch(/^mongodb:\/\/127\.0\.0\.1:\d+\/fallback_db/);
      expect(getDbHealth()).toBe('up');
      expect(mongoose.connection.name).toBe('fallback_db');
      await disconnectDB();
      expect(getDbHealth()).toBe('down');
    },
  );
});

// ---------- registerGracefulShutdown ----------
describe('registerGracefulShutdown', () => {
  it('closes the server, disconnects, exits 0, and ignores repeat signals', async () => {
    const server = http.createServer();
    await new Promise<void>((r) => server.listen(0, r));
    const codes: number[] = [];
    const shutdown = registerGracefulShutdown(server, (c) => codes.push(c));
    try {
      await shutdown('SIGTERM');
      await shutdown('SIGTERM');
      expect(codes).toEqual([0]);
      expect(server.listening).toBe(false);
    } finally {
      process.off('SIGINT', shutdown);
      process.off('SIGTERM', shutdown);
    }
  });

  it('exits 1 when shutdown fails', async () => {
    const broken = {
      close: () => {
        throw new Error('boom');
      },
    } as unknown as http.Server;
    const codes: number[] = [];
    const shutdown = registerGracefulShutdown(broken, (c) => codes.push(c));
    try {
      await shutdown('SIGINT');
      expect(codes).toEqual([1]);
    } finally {
      process.off('SIGINT', shutdown);
      process.off('SIGTERM', shutdown);
    }
  });
});

// keep ZodError import meaningful: the handler must recognise thrown ZodErrors too.
it('errorHandler handles a raw thrown ZodError instance', () => {
  const res = mockRes();
  errorHandler(new ZodError([]), asReq({ requestId: 'z' }), asRes(res), noop);
  expect(res.statusCode).toBe(400);
});

describe('env module load', () => {
  it('prints the readable message and exits 1 on invalid env', async () => {
    vi.resetModules();
    const prev = process.env.PORT;
    process.env.PORT = 'not-a-port';
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await import('../../src/config/env');
      expect(exit).toHaveBeenCalledWith(1);
      expect(String(err.mock.calls[0]?.[0])).toMatch(
        /Invalid environment configuration:[\s\S]*PORT/,
      );
    } finally {
      if (prev === undefined) delete process.env.PORT;
      else process.env.PORT = prev;
      exit.mockRestore();
      err.mockRestore();
      vi.resetModules();
    }
  });
});

describe('shutdown without an HTTP server', () => {
  it('still disconnects and exits 0', async () => {
    const codes: number[] = [];
    const shutdown = registerGracefulShutdown(undefined, (c) => codes.push(c));
    try {
      await shutdown('SIGINT');
      expect(codes).toEqual([0]);
    } finally {
      process.off('SIGINT', shutdown);
      process.off('SIGTERM', shutdown);
    }
  });
});

describe('createRateLimiter without requestId middleware', () => {
  it('falls back to requestId "unknown"', async () => {
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const bare = express()
      .use(createRateLimiter(1))
      .get('/', (_q, r) => void r.end());
    await supertest(bare).get('/').expect(200);
    const res = await supertest(bare).get('/').expect(429);
    expect(res.body.error.requestId).toBe('unknown');
  });
});
