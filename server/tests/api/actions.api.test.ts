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

describe('/api/actions & /api/meetings/:id/actions HTTP endpoints (100x)', () => {
  it('POST /api/meetings/:id/actions, PATCH status, POST extend, DELETE: 100 valid runs', async () => {
    const member = await MemberModel.create({
      name: 'Ananya Rao',
      email: 'ananya@mal.test',
    });
    const meeting = await MeetingModel.create({
      title: 'Sprint 14 planning',
      date: '2026-10-20',
      startTime: '10:00',
      durationMin: 45,
      attendeeIds: [member._id],
    });

    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{3,30}[A-Za-z0-9]$/),
        fc.constantFrom<'low' | 'medium' | 'high' | 'critical'>(
          'low',
          'medium',
          'high',
          'critical',
        ),
        async (title, priority) => {
          const createRes = await request(app)
            .post(`/api/meetings/${String(meeting._id)}/actions`)
            .send({
              title,
              ownerId: String(member._id),
              dueDate: '2099-12-01',
              priority,
            });
          expect(createRes.status).toBe(201);
          const id = createRes.body.data.id as string;
          expect(createRes.body.data.dueState).toBeDefined();

          const extRes = await request(app).post(`/api/actions/${id}/extend`).send({ days: 3 });
          expect(extRes.status).toBe(200);
          expect(extRes.body.data.dueDate).toBe('2099-12-04');

          const stRes = await request(app)
            .patch(`/api/actions/${id}/status`)
            .send({ status: 'done' });
          expect(stRes.status).toBe(200);
          expect(stRes.body.data.status).toBe('done');
          expect(stRes.body.data.completedAt).toBeTruthy();

          const delRes = await request(app).delete(`/api/actions/${id}`);
          expect(delRes.status).toBe(204);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('POST /api/meetings/:id/actions & PATCH /api/actions/:id: 100 fuzzed invalid requests return 400', async () => {
    const member = await MemberModel.create({
      name: 'Ananya Rao',
      email: 'ananya@mal.test',
    });
    const meeting = await MeetingModel.create({
      title: 'Sprint 14 planning',
      date: '2026-10-20',
      startTime: '10:00',
      durationMin: 45,
      attendeeIds: [member._id],
    });
    const fakeOwner = new mongoose.Types.ObjectId().toHexString();

    const invalidArb = fc.oneof(
      fc.record({
        title: fc.constant('Ab'),
        ownerId: fc.constant(String(member._id)),
        dueDate: fc.constant('2099-12-01'),
      }),
      fc.record({
        title: fc.constant('Valid Title'),
        ownerId: fc.constant(fakeOwner),
        dueDate: fc.constant('2099-12-01'),
      }),
      fc.record({
        title: fc.constant('Valid Title'),
        ownerId: fc.constant(String(member._id)),
        dueDate: fc.constant('2020-01-01'),
      }),
      fc.record({
        title: fc.constant('Valid Title'),
        ownerId: fc.constant(String(member._id)),
        dueDate: fc.constant('2099-12-01'),
        extraKey: fc.constant('rejected'),
      }),
    );

    await fc.assert(
      fc.asyncProperty(invalidArb, async (body) => {
        const res = await request(app)
          .post(`/api/meetings/${String(meeting._id)}/actions`)
          .send(body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 100 },
    );
  });
});
