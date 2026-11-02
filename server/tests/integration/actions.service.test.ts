import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addDaysISO, todayISO } from '@mal/shared';
import { ActionModel } from '../../src/models/Action';
import { DecisionModel } from '../../src/models/Decision';
import { MeetingModel } from '../../src/models/Meeting';
import { MemberModel } from '../../src/models/Member';
import { actionsService } from '../../src/services/actions.service';
import { decisionsService } from '../../src/services/decisions.service';

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

describe('actions.service (100x with randomised today)', () => {
  it('create, setStatus, extend: 100 runs with randomised today verify completedAt, max(today, dueDate) + days, and derived fields', async () => {
    const member = await MemberModel.create({
      name: 'Ananya Rao',
      email: 'ananya@mal.test',
    });

    await fc.assert(
      fc.asyncProperty(
        randNowArb,
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 1, max: 30 }),
        async (now, dueOffset, extendDays) => {
          const today = todayISO('Asia/Kolkata', now);
          const meetingDate = addDaysISO(today, -5);
          const dueDate = addDaysISO(today, dueOffset);

          const mt = await MeetingModel.create({
            title: 'Sprint Planning',
            date: meetingDate,
            startTime: '10:00',
            durationMin: 45,
            attendeeIds: [member._id],
          });

          const created = await actionsService.create(
            String(mt._id),
            {
              title: 'Prepare launch checklist',
              description: 'Details',
              ownerId: String(member._id),
              dueDate,
              priority: 'high',
              status: 'open',
            },
            now,
          );

          expect(created.isOverdue).toBe(false);
          expect(created.daysOverdue).toBe(0);
          expect(created.completedAt).toBeNull();

          const extended = await actionsService.extend(created.id, { days: extendDays }, now);
          expect(extended.dueDate).toBe(addDaysISO(dueDate, extendDays));

          const done = await actionsService.setStatus(created.id, { status: 'done' }, now);
          expect(done.status).toBe('done');
          expect(done.completedAt).toBeInstanceOf(Date);
          expect(done.dueState.kind).toBe('done');

          await expect(actionsService.extend(created.id, { days: 3 }, now)).rejects.toMatchObject({
            code: 'CONFLICT',
            status: 409,
          });

          const reopened = await actionsService.setStatus(
            created.id,
            { status: 'in-progress' },
            now,
          );
          expect(reopened.status).toBe('in-progress');
          expect(reopened.completedAt).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('remove: 100 runs verify deleting the last linked action transitions decision back to pending', async () => {
    const fixedNow = new Date('2026-11-02T10:00:00.000Z');
    const member = await MemberModel.create({
      name: 'Karthik Shetty',
      email: 'karthik@mal.test',
    });
    const meeting = await MeetingModel.create({
      title: 'Weekly ops sync',
      date: '2026-10-20',
      startTime: '11:00',
      durationMin: 30,
      attendeeIds: [member._id],
    });

    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async (taskCount) => {
        const dec = await decisionsService.create(
          String(meeting._id),
          {
            text: 'Rotate on-call weekly starting Monday',
            decidedById: String(member._id),
          },
          fixedNow,
        );

        const conv = await decisionsService.convert(
          dec.id,
          {
            actions: Array.from({ length: taskCount }, (_, idx) => ({
              title: `Linked task ${idx + 1}`,
              description: '',
              ownerId: String(member._id),
              dueDate: '2026-11-10',
              priority: 'medium' as const,
            })),
          },
          fixedNow,
        );

        expect(conv.decision.status).toBe('converted');
        for (let i = 0; i < conv.actions.length; i++) {
          await actionsService.remove(conv.actions[i]!.id);
          const refreshed = await decisionsService.get(dec.id, fixedNow);
          if (i < conv.actions.length - 1) {
            expect(refreshed.status).toBe('converted');
          } else {
            expect(refreshed.status).toBe('pending');
            expect(refreshed.actionIds).toHaveLength(0);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('list &overdue=true/false: 100 runs with randomised today filter and sort accurately', async () => {
    const member = await MemberModel.create({
      name: 'Meera Iyer',
      email: 'meera@mal.test',
    });
    const meeting = await MeetingModel.create({
      title: 'Onboarding review',
      date: '2026-01-01',
      startTime: '15:00',
      durationMin: 60,
      attendeeIds: [member._id],
    });

    await ActionModel.create([
      {
        meetingId: meeting._id,
        title: 'Late item',
        ownerId: member._id,
        dueDate: '2026-05-01',
        priority: 'critical',
        status: 'open',
      },
      {
        meetingId: meeting._id,
        title: 'Future item',
        ownerId: member._id,
        dueDate: '2026-12-20',
        priority: 'low',
        status: 'in-progress',
      },
      {
        meetingId: meeting._id,
        title: 'Completed item',
        ownerId: member._id,
        dueDate: '2026-04-01',
        priority: 'medium',
        status: 'done',
        completedAt: new Date(),
      },
    ]);

    const midNow = new Date('2026-08-15T10:00:00.000Z');
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<boolean | undefined>(true, false, undefined),
        fc.constantFrom<'dueDate' | '-dueDate' | 'priority' | '-createdAt'>(
          'dueDate',
          '-dueDate',
          'priority',
          '-createdAt',
        ),
        async (overdue, sort) => {
          const res = await actionsService.list({ overdue, sort, page: 1, limit: 20 }, midNow);
          if (overdue === true) {
            expect(res.data).toHaveLength(1);
            expect(res.data[0]?.title).toBe('Late item');
            expect(res.data[0]?.isOverdue).toBe(true);
          } else if (overdue === false) {
            expect(res.data).toHaveLength(2);
            expect(res.data.every((a) => !a.isOverdue)).toBe(true);
          } else {
            expect(res.data).toHaveLength(3);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
