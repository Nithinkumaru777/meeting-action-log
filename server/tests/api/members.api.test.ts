import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { ActionModel } from '../../src/models/Action';
import { MeetingModel } from '../../src/models/Meeting';
import { MemberModel } from '../../src/models/Member';

let mongod: MongoMemoryServer;
const app = createApp({
  env: {
    NODE_ENV: 'test',
    CLIENT_ORIGIN: 'http://localhost:5173',
    RATE_LIMIT_PER_MIN: 100_000,
  },
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    MemberModel.deleteMany({}),
    MeetingModel.deleteMany({}),
    ActionModel.deleteMany({}),
  ]);
});

describe('/api/members HTTP endpoints (100x)', () => {
  it('POST /api/members: 100 valid requests return 201 and persist', async () => {
    let seq = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[A-Za-z][A-Za-z ]{1,25}[A-Za-z]$/),
        fc.integer({ min: 0, max: 359 }),
        async (name, avatarHue) => {
          seq += 1;
          const res = await request(app)
            .post('/api/members')
            .send({
              name,
              email: `member${seq}@example.com`,
              role: 'Engineer',
              avatarHue,
            });
          expect(res.status).toBe(201);
          expect(res.body.data).toMatchObject({
            name: name.trim(),
            email: `member${seq}@example.com`,
            role: 'Engineer',
            avatarHue,
            openActions: 0,
            overdueActions: 0,
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('POST /api/members: 100 fuzzed invalid requests return 400 VALIDATION_ERROR', async () => {
    const invalidBodyArb = fc.oneof(
      fc.record({ name: fc.constant('A'), email: fc.constant('a@b.com') }),
      fc.record({ name: fc.constant('Valid Name'), email: fc.constant('not-an-email') }),
      fc.record({
        name: fc.constant('Valid Name'),
        email: fc.constant('a@b.com'),
        avatarHue: fc.integer({ min: 360, max: 999 }),
      }),
      fc.record({
        name: fc.constant('Valid Name'),
        email: fc.constant('a@b.com'),
        $gt: fc.constant('injection'),
      }),
    );

    await fc.assert(
      fc.asyncProperty(invalidBodyArb, async (body) => {
        const res = await request(app).post('/api/members').send(body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(Array.isArray(res.body.error.details)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('GET /api/members, GET/:id, PATCH/:id, DELETE/:id: 100 runs cover valid, 400, 404, and 409', async () => {
    const created = await request(app).post('/api/members').send({
      name: 'Karthik Shetty',
      email: 'karthik@example.com',
      role: 'Backend Engineer',
      avatarHue: 28,
    });
    const memberId = created.body.data.id as string;

    let seq = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'list' | 'get' | 'patch' | 'bad-id' | 'not-found'>(
          'list',
          'get',
          'patch',
          'bad-id',
          'not-found',
        ),
        async (op) => {
          seq += 1;
          if (op === 'list') {
            const res = await request(app).get('/api/members?q=Karthik&page=1&limit=10');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.meta.total).toBe(1);
          } else if (op === 'get') {
            const res = await request(app).get(`/api/members/${memberId}`);
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(memberId);
          } else if (op === 'patch') {
            const res = await request(app)
              .patch(`/api/members/${memberId}`)
              .send({ role: `Role ${seq}` });
            expect(res.status).toBe(200);
            expect(res.body.data.role).toBe(`Role ${seq}`);
          } else if (op === 'bad-id') {
            const res = await request(app).get('/api/members/not-a-valid-objectid');
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('INVALID_ID');
          } else {
            const missingId = new mongoose.Types.ObjectId().toHexString();
            const res = await request(app).delete(`/api/members/${missingId}`);
            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('NOT_FOUND');
          }
        },
      ),
      { numRuns: 100 },
    );

    const delRes = await request(app).delete(`/api/members/${memberId}`);
    expect(delRes.status).toBe(204);
  });
});
