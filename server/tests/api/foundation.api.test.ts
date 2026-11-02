import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Router } from 'express';
import fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { idParamSchema, memberCreateSchema, paginationQuerySchema } from '@mal/shared';
import { createApp } from '../../src/app';
import { connectDB, disconnectDB } from '../../src/db/connect';
import { validate } from '../../src/middleware/validate';

const RUNS = { numRuns: 100 };
const ORIGIN = 'http://localhost:5173';
const testEnv = (limit = 1_000_000) =>
  ({ NODE_ENV: 'test', CLIENT_ORIGIN: ORIGIN, RATE_LIMIT_PER_MIN: limit }) as const;

const Dup = mongoose.model(
  'ApiDupThing',
  new mongoose.Schema({ email: { type: String, unique: true, required: true } }),
);

// Test-only routes exercising validate + real Mongo errors through the real middleware stack.
const extraRoutes = Router();
extraRoutes.post(
  '/__test/items/:id',
  validate({ params: idParamSchema, query: paginationQuerySchema, body: memberCreateSchema }),
  (req, res) => {
    res.status(201).json({ data: req.valid });
  },
);
extraRoutes.get('/__test/cast/:raw', async (req) => {
  await Dup.findById(req.params.raw); // real Mongoose CastError for non-ObjectIds
});
extraRoutes.post('/__test/dup', async (req, res) => {
  const email = String((req.body as { email: string }).email);
  await Dup.create({ email });
  await Dup.create({ email }); // real E11000
  res.status(201).end();
});
extraRoutes.get('/__test/boom', () => {
  throw new Error('db password=hunter2\n    at secret (/srv/app.js:10:3)');
});

const app = createApp({ env: testEnv(), extraRoutes });
let mem: MongoMemoryServer;

const errorShape = (body: unknown, code: string, message?: string) => {
  const b = body as { error: Record<string, unknown> };
  expect(Object.keys(b)).toEqual(['error']);
  expect(b.error.code).toBe(code);
  if (message) expect(b.error.message).toBe(message);
  expect(typeof b.error.requestId).toBe('string');
  expect(JSON.stringify(b)).not.toMatch(/stack|hunter2|\.js:\d+/);
};

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
});
afterAll(async () => {
  await disconnectDB();
  await mem.stop();
});

describe('GET /api/health', () => {
  it('reports db down before connecting', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.data.db).toBe('down');
  });

  it('100 requests: 200, exact shape, db up, request id echoed or generated, security headers', async () => {
    await connectDB(mem.getUri('health'), { maxRetries: 1 });
    await Dup.init();
    const header = fc.option(
      fc.oneof(
        fc.stringMatching(/^[A-Za-z0-9._-]{1,128}$/), // safe -> echoed
        fc.constantFrom('bad id with spaces', 'x'.repeat(129), 'a\tb', 'a/b'), // unsafe -> replaced
      ),
      { nil: undefined },
    );
    await fc.assert(
      fc.asyncProperty(header, async (rid) => {
        const req = request(app).get('/api/health').set('Origin', ORIGIN);
        if (rid !== undefined) req.set('x-request-id', rid);
        const res = await req.expect(200).expect('Content-Type', /json/);
        expect(Object.keys(res.body)).toEqual(['data']);
        expect(Object.keys(res.body.data).sort()).toEqual(['db', 'status', 'time']);
        expect(res.body.data.status).toBe('ok');
        expect(res.body.data.db).toBe('up');
        expect(new Date(res.body.data.time).toISOString()).toBe(res.body.data.time);
        const echoed = rid !== undefined && /^[A-Za-z0-9._-]{1,128}$/.test(rid);
        if (echoed) expect(res.headers['x-request-id']).toBe(rid);
        else expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
        expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-powered-by']).toBeUndefined();
      }),
      RUNS,
    );
  });
});

describe('unknown routes', () => {
  it('100 fuzzed paths/methods -> 404 NOT_FOUND', async () => {
    const seg = fc.stringMatching(/^[a-z0-9-]{1,12}$/);
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('get', 'post', 'patch', 'delete', 'put') as fc.Arbitrary<
          'get' | 'post' | 'patch' | 'delete' | 'put'
        >,
        fc.boolean(),
        fc.array(seg, { minLength: 1, maxLength: 4 }),
        async (method, underApi, segs) => {
          const path = `${underApi ? '/api' : ''}/zz-${segs.join('/')}`;
          const res = await request(app)[method](path).expect(404);
          errorShape(res.body, 'NOT_FOUND', `Route ${method.toUpperCase()} ${path} not found.`);
          expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
        },
      ),
      RUNS,
    );
  });
});

describe('malformed JSON', () => {
  it('100 truncated/corrupt payloads -> 400 VALIDATION_ERROR', async () => {
    const obj = fc.dictionary(fc.stringMatching(/^[a-z]{1,8}$/), fc.jsonValue(), {
      minKeys: 1,
      maxKeys: 5,
    });
    const corrupt = fc
      .tuple(obj, fc.constantFrom('truncate', 'trailing', 'quote', 'single'))
      .map(([o, how]) => {
        const s = JSON.stringify(o);
        if (how === 'truncate') return s.slice(0, -1);
        if (how === 'trailing') return `${s.slice(0, -1)},}`;
        if (how === 'quote') return s.replace('"', '');
        return s.replaceAll('"', "'");
      });
    await fc.assert(
      fc.asyncProperty(corrupt, async (payload) => {
        const res = await request(app)
          .post('/api/__test/items/0123456789abcdef01234567')
          .set('Content-Type', 'application/json')
          .send(payload)
          .expect(400);
        errorShape(res.body, 'VALIDATION_ERROR', 'Request body is not valid JSON.');
      }),
      RUNS,
    );
  });
});

describe('oversize body', () => {
  it('100 bodies over 100kb -> 413 VALIDATION_ERROR', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 100 * 1024 + 1, max: 300 * 1024 }), async (size) => {
        const body = JSON.stringify({ name: 'x'.repeat(size) });
        const res = await request(app)
          .post('/api/__test/items/0123456789abcdef01234567')
          .set('Content-Type', 'application/json')
          .send(body)
          .expect(413);
        errorShape(res.body, 'VALIDATION_ERROR', 'Request body exceeds the 100kb limit.');
      }),
      RUNS,
    );
  });
});

describe('validate middleware over HTTP', () => {
  const email = fc.stringMatching(/^[a-z0-9]{1,12}@[a-z0-9]{2,12}\.(com|org|in)$/);

  it('100 valid requests -> 201 with parsed params/query/body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[0-9a-fA-F]{24}$/),
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.stringMatching(/^[A-Za-z][A-Za-z ]{1,40}[A-Za-z]$/),
        email,
        async (id, page, limit, name, mail) => {
          const res = await request(app)
            .post(`/api/__test/items/${id}?page=${page}&limit=${limit}`)
            .send({ name: `  ${name} `, email: mail.toUpperCase() })
            .expect(201);
          expect(res.body.data).toEqual({
            params: { id: id.toLowerCase() },
            query: { page, limit },
            body: { name, email: mail },
          });
        },
      ),
      RUNS,
    );
  });

  it('100 fuzzed invalid requests -> 400 with the right code and details', async () => {
    const goodId = '0123456789abcdef01234567';
    type Case = { url: string; body: unknown; code: string; path?: string };
    const cases: fc.Arbitrary<Case> = fc.oneof(
      fc
        .stringMatching(/^[a-zA-Z0-9]{1,30}$/)
        .filter((s) => !/^[0-9a-fA-F]{24}$/.test(s))
        .map((id) => ({
          url: `/api/__test/items/${id}`,
          body: { name: 'Asha', email: 'a@b.com' },
          code: 'INVALID_ID',
          path: 'id',
        })),
      fc
        .constantFrom('page=0', 'limit=101', 'page=abc', 'limit=1e2', 'page[$gt]=1', 'sort=x')
        .map((q) => ({
          url: `/api/__test/items/${goodId}?${q}`,
          body: { name: 'Asha', email: 'a@b.com' },
          code: 'VALIDATION_ERROR',
        })),
      fc
        .constantFrom<[unknown, string]>(
          [{ email: 'a@b.com' }, 'name'],
          [{ name: 'A', email: 'a@b.com' }, 'name'],
          [{ name: 'Asha', email: 'nope' }, 'email'],
          [{ name: 'Asha', email: 'a@b.com', $gt: '' }, '$gt'],
          [{ name: { $ne: null }, email: 'a@b.com' }, 'name'],
          [{ name: 'x'.repeat(5000), email: 'a@b.com' }, 'name'],
          [{ name: 'Asha', email: 'a@b.com', role: 7 }, 'role'],
          [[], ''],
        )
        .map(([body, path]) => ({
          url: `/api/__test/items/${goodId}`,
          body,
          code: 'VALIDATION_ERROR',
          path,
        })),
    );
    await fc.assert(
      fc.asyncProperty(cases, async (c) => {
        const res = await request(app)
          .post(c.url)
          .send(c.body as object)
          .expect(400);
        errorShape(res.body, c.code);
        expect(Array.isArray(res.body.error.details)).toBe(true);
        if (c.path !== undefined)
          expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(c.path);
      }),
      RUNS,
    );
  });
});

describe('database error mapping', () => {
  it('100 real CastErrors -> 400 INVALID_ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .stringMatching(/^[a-zA-Z0-9]{1,30}$/)
          .filter((s) => !/^[0-9a-fA-F]{24}$/.test(s) && s.length !== 12),
        async (raw) => {
          const res = await request(app).get(`/api/__test/cast/${raw}`).expect(400);
          errorShape(res.body, 'INVALID_ID', 'Invalid identifier.');
        },
      ),
      RUNS,
    );
  });

  it('100 real duplicate-key errors -> 409 CONFLICT', async () => {
    let n = 0;
    await fc.assert(
      fc.asyncProperty(fc.stringMatching(/^[a-z]{1,10}$/), async (local) => {
        const res = await request(app)
          .post('/api/__test/dup')
          .send({ email: `${local}.${n++}@example.com` })
          .expect(409);
        errorShape(res.body, 'CONFLICT', 'A record with that value already exists.');
      }),
      RUNS,
    );
  });

  it('100 unexpected errors -> 500 INTERNAL without leaking details', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (rid) => {
        const res = await request(app).get('/api/__test/boom').set('x-request-id', rid).expect(500);
        expect(res.body).toEqual({
          error: { code: 'INTERNAL', message: 'An unexpected error occurred.', requestId: rid },
        });
      }),
      RUNS,
    );
  });
});

describe('rate limiting', () => {
  it('100 runs: request limit+1 inside the window -> 429 RATE_LIMITED', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 8 }), async (limit) => {
        const limited = createApp({ env: testEnv(limit) });
        for (let i = 0; i < limit; i++) await request(limited).get('/api/health').expect(200);
        const res = await request(limited).get('/api/health').expect(429);
        errorShape(res.body, 'RATE_LIMITED', 'Too many requests. Please slow down and try again.');
        expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
        expect(res.headers.ratelimit).toBeDefined();
      }),
      RUNS,
    );
  });
});

describe('production static client + SPA fallback', () => {
  it('100 runs: serves index.html for client routes, keeps /api JSON 404s', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mal-client-'));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>MAL</title>');
    writeFileSync(path.join(dir, 'app.js'), 'export {};');
    const prod = createApp({
      env: { NODE_ENV: 'production', CLIENT_ORIGIN: ORIGIN, RATE_LIMIT_PER_MIN: 1_000_000 },
      clientDistDir: dir,
    });
    try {
      await request(prod)
        .get('/app.js')
        .expect(200)
        .expect('Content-Type', /javascript/);
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.stringMatching(/^[a-z0-9-]{1,10}$/), { maxLength: 3 }),
          async (segs) => {
            const client = `/${segs.join('/')}`;
            const html = await request(prod).get(client).expect(200);
            expect(html.text).toContain('<title>MAL</title>');
            const api = await request(prod).get(`/api/zz${client}`).expect(404);
            errorShape(api.body, 'NOT_FOUND');
            const post = await request(prod).post(`/zz${client}`).expect(404);
            errorShape(post.body, 'NOT_FOUND');
          },
        ),
        RUNS,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not serve the client outside production', async () => {
    await request(app).get('/').expect(404);
  });
});
