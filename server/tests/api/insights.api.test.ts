import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { seedDatabase } from '../../src/seed/seed';

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
  await seedDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('/api/insights HTTP endpoints (100x)', () => {
  it('GET /summary, /overdue, /unconverted-decisions, /weekly-completion: 100 valid runs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'summary' | 'overdue' | 'unconverted' | 'weekly'>(
          'summary',
          'overdue',
          'unconverted',
          'weekly',
        ),
        fc.integer({ min: 1, max: 12 }),
        async (endpoint, n) => {
          if (endpoint === 'summary') {
            const res = await request(app).get('/api/insights/summary');
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({
              openActions: 7,
              overdueActions: 4,
              doneActions: 3,
              totalActions: 10,
              completionRate: 30,
              pendingDecisions: 3,
              upcomingMeetings: 2,
            });
          } else if (endpoint === 'overdue') {
            const res = await request(app).get('/api/insights/overdue');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(3);
            expect(res.body.data[0].count).toBe(2);
          } else if (endpoint === 'unconverted') {
            const res = await request(app).get(`/api/insights/unconverted-decisions?limit=${n}`);
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeLessThanOrEqual(n);
          } else {
            const res = await request(app).get(`/api/insights/weekly-completion?weeks=${n}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(n);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('GET /unconverted-decisions & /weekly-completion: 100 invalid query requests return 400', async () => {
    const invalidQueryArb = fc.oneof(
      fc.constant('/api/insights/unconverted-decisions?limit=0'),
      fc.constant('/api/insights/unconverted-decisions?limit=101'),
      fc.constant('/api/insights/unconverted-decisions?unknown=1'),
      fc.constant('/api/insights/weekly-completion?weeks=0'),
      fc.constant('/api/insights/weekly-completion?weeks=53'),
      fc.constant('/api/insights/weekly-completion?extra=yes'),
    );

    await fc.assert(
      fc.asyncProperty(invalidQueryArb, async (url) => {
        const res = await request(app).get(url);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 100 },
    );
  });
});
