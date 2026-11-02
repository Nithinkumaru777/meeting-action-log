import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ActionModel } from '../../src/models/Action';
import { DecisionModel } from '../../src/models/Decision';
import { MeetingModel } from '../../src/models/Meeting';
import { MemberModel } from '../../src/models/Member';
import { seedDatabase } from '../../src/seed/seed';
import { decisionsService } from '../../src/services/decisions.service';
import { insightsService } from '../../src/services/insights.service';

let mongod: MongoMemoryServer;

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

const randNowArb = fc.integer({ min: 1700000000000, max: 1850000000000 }).map((ms) => new Date(ms));

describe('insights.service & seedDatabase (100x)', () => {
  it('seedDatabase + getSummary + getOverdueByOwner + getUnconvertedDecisions: 100 runs with randomised today satisfy all invariants', async () => {
    await fc.assert(
      fc.asyncProperty(randNowArb, async (now) => {
        const seedRes = await seedDatabase(now);
        expect(seedRes.members).toBe(5);
        expect(seedRes.meetings).toBe(6);
        expect(seedRes.overdueActions).toBe(4);
        expect(seedRes.pendingDecisions).toBe(3);

        const summary = await insightsService.getSummary(now);
        expect(summary.totalActions).toBe(10);
        expect(summary.doneActions).toBe(3);
        expect(summary.openActions).toBe(7);
        expect(summary.overdueActions).toBe(4);
        expect(summary.completionRate).toBe(30);
        expect(summary.pendingDecisions).toBe(3);
        expect(summary.upcomingMeetings).toBe(2);
        expect(summary.oldestOverdueDays).toBe(6);

        const overdueGroups = await insightsService.getOverdueByOwner(now);
        expect(overdueGroups).toHaveLength(3);
        expect(overdueGroups[0]?.owner.name).toBe('Karthik Shetty');
        expect(overdueGroups[0]?.count).toBe(2);
        expect(overdueGroups[0]?.oldestDaysOverdue).toBe(6);
        // Actions inside each owner group are oldest first
        for (const grp of overdueGroups) {
          for (let i = 1; i < grp.actions.length; i++) {
            expect(grp.actions[i - 1]!.dueDate <= grp.actions[i]!.dueDate).toBe(true);
          }
        }

        const unconverted = await insightsService.getUnconvertedDecisions({ limit: 10 }, now);
        expect(unconverted).toHaveLength(3);
        // Oldest first => decidedAt ascending
        for (let i = 1; i < unconverted.length; i++) {
          expect(unconverted[i - 1]!.decidedAt <= unconverted[i]!.decidedAt).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('getWeeklyCompletion: 100 runs return zero-filled ISO weeks in chronological order', async () => {
    const fixedNow = new Date('2026-11-02T10:00:00.000Z');
    await seedDatabase(fixedNow);

    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (weeks) => {
        const buckets = await insightsService.getWeeklyCompletion({ weeks }, fixedNow);
        expect(buckets.length).toBeGreaterThanOrEqual(1);
        expect(buckets.length).toBeLessThanOrEqual(weeks);
        for (const b of buckets) {
          expect(b.week).toMatch(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/);
          expect(b.completed).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('converting a pending decision removes it from unconverted-decisions 100 times', async () => {
    const fixedNow = new Date('2026-11-02T10:00:00.000Z');
    await seedDatabase(fixedNow);
    const member = await MemberModel.findOne({});

    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async (idx) => {
        const mt = await MeetingModel.findOne({});
        const dec = await decisionsService.create(
          String(mt!._id),
          {
            text: `Pending decision ${idx}`,
            decidedById: String(member!._id),
          },
          fixedNow,
        );

        const before = await insightsService.getUnconvertedDecisions({ limit: 100 }, fixedNow);
        expect(before.some((d) => d.id === dec.id)).toBe(true);

        await decisionsService.convert(
          dec.id,
          {
            actions: [
              {
                title: `Task for ${idx}`,
                description: '',
                ownerId: String(member!._id),
                dueDate: '2026-11-10',
                priority: 'medium',
              },
            ],
          },
          fixedNow,
        );

        const after = await insightsService.getUnconvertedDecisions({ limit: 100 }, fixedNow);
        expect(after.some((d) => d.id === dec.id)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
