import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ActionModel } from '../../src/models/Action';
import { DecisionModel } from '../../src/models/Decision';
import { MeetingModel } from '../../src/models/Meeting';
import { MemberModel } from '../../src/models/Member';
import { meetingsService } from '../../src/services/meetings.service';

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

const titleArb = fc
  .stringMatching(/^[A-Za-z][A-Za-z0-9 -]{2,35}[A-Za-z0-9]$/)
  .filter((s) => s.trim().length >= 3);

describe('meetings.service (100x)', () => {
  it('create + getWithDetails: 100 valid meetings persist and populate attendees + zero stats', async () => {
    const m1 = await MemberModel.create({ name: 'Ananya Rao', email: 'ananya@mal.test' });
    const m2 = await MemberModel.create({ name: 'Karthik Shetty', email: 'karthik@mal.test' });
    const ids = [String(m1._id), String(m2._id)];

    await fc.assert(
      fc.asyncProperty(
        titleArb,
        fc.integer({ min: 5, max: 480 }),
        fc.constantFrom('09:00', '10:30', '14:15', '17:45'),
        async (title, durationMin, startTime) => {
          const created = await meetingsService.create({
            title,
            date: '2026-11-02',
            startTime,
            durationMin,
            attendeeIds: ids,
            agenda: 'Review sprint backlog',
            notes: 'Notes here',
            tags: ['sprint', 'planning'],
          });

          expect(created.title).toBe(title.trim());
          expect(created.durationMin).toBe(durationMin);
          expect(created.attendeeIds).toEqual(ids);
          expect(created.stats).toEqual({
            decisions: 0,
            pendingDecisions: 0,
            actions: 0,
            doneActions: 0,
            overdueActions: 0,
          });

          const detail = await meetingsService.getWithDetails(created.id);
          expect(detail.attendees).toHaveLength(2);
          expect(detail.decisions).toEqual([]);
          expect(detail.actions).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('create: 100 runs with unknown attendeeIds reject with 400 VALIDATION_ERROR on path attendeeIds', async () => {
    await fc.assert(
      fc.asyncProperty(titleArb, async (title) => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        await expect(
          meetingsService.create({
            title,
            date: '2026-11-02',
            startTime: '10:00',
            durationMin: 30,
            attendeeIds: [fakeId],
          }),
        ).rejects.toMatchObject({
          code: 'VALIDATION_ERROR',
          status: 400,
          details: [
            { path: 'attendeeIds', message: 'One or more selected attendees do not exist.' },
          ],
        });
      }),
      { numRuns: 100 },
    );
  });

  it('list: 100 filter/sort combinations compute accurate per-meeting stats', async () => {
    const fixedNow = new Date('2026-11-02T10:00:00.000Z');
    const m1 = await MemberModel.create({ name: 'Ananya Rao', email: 'ananya@mal.test' });
    const m2 = await MemberModel.create({ name: 'Karthik Shetty', email: 'karthik@mal.test' });

    const pastMeeting = await meetingsService.create({
      title: 'Sprint 14 Planning',
      date: '2026-10-20',
      startTime: '10:00',
      durationMin: 45,
      attendeeIds: [String(m1._id), String(m2._id)],
      agenda: 'Carry-over items',
    });

    const upcomingMeeting = await meetingsService.create({
      title: 'Q4 Launch Check',
      date: '2026-11-10',
      startTime: '16:00',
      durationMin: 60,
      attendeeIds: [String(m1._id)],
      agenda: 'Final readiness',
    });

    await DecisionModel.create([
      {
        meetingId: pastMeeting.id,
        text: 'Every repo gets a PR template',
        decidedById: m1._id,
        decidedAt: '2026-10-20',
        status: 'pending',
      },
      {
        meetingId: pastMeeting.id,
        text: 'Move export to sprint 15',
        decidedById: m2._id,
        decidedAt: '2026-10-20',
        status: 'converted',
      },
    ]);

    await ActionModel.create([
      {
        meetingId: pastMeeting.id,
        title: 'Overdue action',
        ownerId: m1._id,
        dueDate: '2026-10-25',
        priority: 'high',
        status: 'open',
      },
      {
        meetingId: pastMeeting.id,
        title: 'Done action',
        ownerId: m2._id,
        dueDate: '2026-10-22',
        priority: 'medium',
        status: 'done',
        completedAt: new Date(),
      },
    ]);

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'all' | 'upcoming' | 'past'>('all', 'upcoming', 'past'),
        fc.constantFrom<'date' | '-date' | 'title'>('date', '-date', 'title'),
        fc.constantFrom(undefined, 'Sprint', 'Launch'),
        async (status, sort, q) => {
          const res = await meetingsService.list({ status, sort, q, page: 1, limit: 20 }, fixedNow);
          for (const item of res.data) {
            if (item.id === pastMeeting.id) {
              expect(item.stats).toEqual({
                decisions: 2,
                pendingDecisions: 1,
                actions: 2,
                doneActions: 1,
                overdueActions: 1,
              });
            }
            if (item.id === upcomingMeeting.id) {
              expect(item.stats).toEqual({
                decisions: 0,
                pendingDecisions: 0,
                actions: 0,
                doneActions: 0,
                overdueActions: 0,
              });
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('update & remove: 100 runs enforce 409 on removing attendee with open actions and cascade on delete', async () => {
    let seq = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'conflict' | 'allowed-when-done' | 'cascade-delete'>(
          'conflict',
          'allowed-when-done',
          'cascade-delete',
        ),
        async (scenario) => {
          seq += 1;
          const m1 = await MemberModel.create({
            name: `M1 ${seq}`,
            email: `m1.${seq}@mal.test`,
          });
          const m2 = await MemberModel.create({
            name: `M2 ${seq}`,
            email: `m2.${seq}@mal.test`,
          });
          const mt = await meetingsService.create({
            title: `Meeting ${seq}`,
            date: '2026-11-02',
            startTime: '10:00',
            durationMin: 30,
            attendeeIds: [String(m1._id), String(m2._id)],
          });

          if (scenario === 'conflict') {
            await ActionModel.create({
              meetingId: mt.id,
              title: 'Open action owned by m2',
              ownerId: m2._id,
              dueDate: '2026-11-08',
              priority: 'high',
              status: 'open',
            });
            await expect(
              meetingsService.update(mt.id, { attendeeIds: [String(m1._id)] }),
            ).rejects.toMatchObject({
              code: 'CONFLICT',
              status: 409,
            });
          } else if (scenario === 'allowed-when-done') {
            await ActionModel.create({
              meetingId: mt.id,
              title: 'Done action owned by m2',
              ownerId: m2._id,
              dueDate: '2026-11-08',
              priority: 'low',
              status: 'done',
              completedAt: new Date(),
            });
            const updated = await meetingsService.update(mt.id, {
              attendeeIds: [String(m1._id)],
            });
            expect(updated.attendeeIds).toEqual([String(m1._id)]);
          } else {
            await DecisionModel.create({
              meetingId: mt.id,
              text: 'Decision to cascade',
              decidedById: m1._id,
              decidedAt: '2026-11-02',
              status: 'pending',
            });
            await ActionModel.create({
              meetingId: mt.id,
              title: 'Action to cascade',
              ownerId: m1._id,
              dueDate: '2026-11-08',
              priority: 'medium',
              status: 'open',
            });

            await meetingsService.remove(mt.id);
            expect(await DecisionModel.countDocuments({ meetingId: mt.id })).toBe(0);
            expect(await ActionModel.countDocuments({ meetingId: mt.id })).toBe(0);
            await expect(meetingsService.getWithDetails(mt.id)).rejects.toMatchObject({
              code: 'NOT_FOUND',
              status: 404,
            });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
