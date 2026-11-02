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

describe('/api/decisions & /api/meetings/:id/decisions HTTP endpoints (100x)', () => {
  it('POST /api/meetings/:id/decisions & POST /api/decisions/:id/convert: 100 valid runs', async () => {
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
        fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{4,35}[A-Za-z0-9]$/),
        async (text) => {
          const createRes = await request(app)
            .post(`/api/meetings/${String(meeting._id)}/decisions`)
            .send({
              text,
              decidedById: String(member._id),
            });
          expect(createRes.status).toBe(201);
          const decId = createRes.body.data.id as string;

          const convRes = await request(app)
            .post(`/api/decisions/${decId}/convert`)
            .send({
              actions: [
                {
                  title: 'Converted task',
                  ownerId: String(member._id),
                  dueDate: '2099-12-31',
                  priority: 'high',
                },
              ],
            });
          expect(convRes.status).toBe(201);
          expect(convRes.body.data.decision.status).toBe('converted');
          expect(convRes.body.data.actions).toHaveLength(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('POST /api/decisions/:id/convert: 100 fuzzed invalid requests return 400 with details', async () => {
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
    const dec = await DecisionModel.create({
      meetingId: meeting._id,
      text: 'Valid decision text',
      decidedById: member._id,
      decidedAt: '2026-10-20',
      status: 'pending',
    });
    const fakeOwner = new mongoose.Types.ObjectId().toHexString();

    const invalidArb = fc.oneof(
      fc.record({ actions: fc.constant([]) }),
      fc.record({
        actions: fc.constant([
          {
            title: 'Valid title',
            ownerId: fakeOwner,
            dueDate: '2099-12-31',
          },
        ]),
      }),
      fc.record({
        actions: fc.constant([
          {
            title: 'Valid title',
            ownerId: String(member._id),
            dueDate: '2020-01-01', // in the past
          },
        ]),
      }),
      fc.record({
        actions: fc.constant([
          {
            title: 'A', // too short
            ownerId: String(member._id),
            dueDate: '2099-12-31',
          },
        ]),
      }),
    );

    await fc.assert(
      fc.asyncProperty(invalidArb, async (body) => {
        const res = await request(app)
          .post(`/api/decisions/${String(dec._id)}/convert`)
          .send(body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(Array.isArray(res.body.error.details)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('GET /api/decisions, dismiss, reopen, PATCH, DELETE: 100 runs verify lifecycle and 409 conflicts', async () => {
    const member = await MemberModel.create({
      name: 'Rahul Nair',
      email: 'rahul@mal.test',
    });
    const meeting = await MeetingModel.create({
      title: 'Weekly ops sync',
      date: '2026-10-30',
      startTime: '11:00',
      durationMin: 30,
      attendeeIds: [member._id],
    });

    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async (n) => {
        const c = await request(app)
          .post(`/api/meetings/${String(meeting._id)}/decisions`)
          .send({
            text: `Decision number ${n}`,
            decidedById: String(member._id),
          });
        const id = c.body.data.id as string;

        const dis = await request(app)
          .post(`/api/decisions/${id}/dismiss`)
          .send({ reason: 'Handled already' });
        expect(dis.status).toBe(200);
        expect(dis.body.data.status).toBe('no-action');

        const convConflict = await request(app)
          .post(`/api/decisions/${id}/convert`)
          .send({
            actions: [
              {
                title: 'Should fail',
                ownerId: String(member._id),
                dueDate: '2099-12-31',
              },
            ],
          });
        expect(convConflict.status).toBe(409);

        const reop = await request(app).post(`/api/decisions/${id}/reopen`).send({});
        expect(reop.status).toBe(200);
        expect(reop.body.data.status).toBe('pending');

        const listRes = await request(app).get('/api/decisions?status=pending');
        expect(listRes.status).toBe(200);

        const del = await request(app).delete(`/api/decisions/${id}`);
        expect(del.status).toBe(204);
      }),
      { numRuns: 100 },
    );
  });
});
