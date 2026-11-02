import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { ActionModel } from '../../src/models/Action';
import { DecisionModel } from '../../src/models/Decision';
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
    DecisionModel.deleteMany({}),
    ActionModel.deleteMany({}),
  ]);
});

describe('/api/meetings HTTP endpoints (100x)', () => {
  it('POST /api/meetings: 100 valid requests return 201', async () => {
    const member = await MemberModel.create({
      name: 'Ananya Rao',
      email: 'ananya@mal.test',
    });
    const memberId = String(member._id);

    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,25}[A-Za-z0-9]$/),
        fc.integer({ min: 5, max: 480 }),
        async (title, durationMin) => {
          const res = await request(app)
            .post('/api/meetings')
            .send({
              title,
              date: '2026-11-02',
              startTime: '10:00',
              durationMin,
              attendeeIds: [memberId],
              agenda: 'Sprint review',
            });
          expect(res.status).toBe(201);
          expect(res.body.data.title).toBe(title.trim());
          expect(res.body.data.stats).toEqual({
            decisions: 0,
            pendingDecisions: 0,
            actions: 0,
            doneActions: 0,
            overdueActions: 0,
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('POST /api/meetings: 100 fuzzed invalid requests return 400 VALIDATION_ERROR', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const invalidArb = fc.oneof(
      fc.record({
        title: fc.constant('Ab'),
        date: fc.constant('2026-11-02'),
        startTime: fc.constant('10:00'),
        durationMin: fc.constant(30),
        attendeeIds: fc.constant([fakeId]),
      }),
      fc.record({
        title: fc.constant('Valid Title'),
        date: fc.constant('2026-02-30'),
        startTime: fc.constant('10:00'),
        durationMin: fc.constant(30),
        attendeeIds: fc.constant([fakeId]),
      }),
      fc.record({
        title: fc.constant('Valid Title'),
        date: fc.constant('2026-11-02'),
        startTime: fc.constant('25:99'),
        durationMin: fc.constant(30),
        attendeeIds: fc.constant([fakeId]),
      }),
      fc.record({
        title: fc.constant('Valid Title'),
        date: fc.constant('2026-11-02'),
        startTime: fc.constant('10:00'),
        durationMin: fc.constant(2),
        attendeeIds: fc.constant([fakeId]),
      }),
      fc.record({
        title: fc.constant('Valid Title'),
        date: fc.constant('2026-11-02'),
        startTime: fc.constant('10:00'),
        durationMin: fc.constant(30),
        attendeeIds: fc.constant([]),
      }),
    );

    await fc.assert(
      fc.asyncProperty(invalidArb, async (body) => {
        const res = await request(app).post('/api/meetings').send(body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 100 },
    );
  });

  it('GET /api/meetings, GET/:id, PATCH/:id, DELETE/:id: 100 runs verify list, detail, update, 404, 400', async () => {
    const member = await MemberModel.create({
      name: 'Meera Iyer',
      email: 'meera@mal.test',
    });
    const createRes = await request(app)
      .post('/api/meetings')
      .send({
        title: 'Onboarding flow review',
        date: '2026-11-02',
        startTime: '15:30',
        durationMin: 60,
        attendeeIds: [String(member._id)],
        agenda: 'Signup screens',
      });
    const meetingId = createRes.body.data.id as string;

    let seq = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'list' | 'detail' | 'patch' | 'bad-id' | 'not-found'>(
          'list',
          'detail',
          'patch',
          'bad-id',
          'not-found',
        ),
        async (op) => {
          seq += 1;
          if (op === 'list') {
            const res = await request(app).get('/api/meetings?status=all&sort=-date');
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
          } else if (op === 'detail') {
            const res = await request(app).get(`/api/meetings/${meetingId}`);
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(meetingId);
            expect(Array.isArray(res.body.data.attendees)).toBe(true);
            expect(Array.isArray(res.body.data.decisions)).toBe(true);
            expect(Array.isArray(res.body.data.actions)).toBe(true);
          } else if (op === 'patch') {
            const res = await request(app)
              .patch(`/api/meetings/${meetingId}`)
              .send({ agenda: `Updated agenda ${seq}` });
            expect(res.status).toBe(200);
            expect(res.body.data.agenda).toBe(`Updated agenda ${seq}`);
          } else if (op === 'bad-id') {
            const res = await request(app).get('/api/meetings/bad-id');
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('INVALID_ID');
          } else {
            const missingId = new mongoose.Types.ObjectId().toHexString();
            const res = await request(app).get(`/api/meetings/${missingId}`);
            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('NOT_FOUND');
          }
        },
      ),
      { numRuns: 100 },
    );

    const del = await request(app).delete(`/api/meetings/${meetingId}`);
    expect(del.status).toBe(204);
  });
});
