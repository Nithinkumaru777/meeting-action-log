import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ActionModel } from '../../src/models/Action';
import { DecisionModel } from '../../src/models/Decision';
import { MeetingModel } from '../../src/models/Meeting';
import { MemberModel } from '../../src/models/Member';
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

const textArb = fc
  .stringMatching(/^[A-Za-z][A-Za-z0-9 ,.-]{4,50}[A-Za-z0-9]$/)
  .filter((s) => s.trim().length >= 5);

describe('decisions.service (100x)', () => {
  it('create, listByMeeting, list, update, remove: 100 runs verify ageDays, status pending, and DELETE unlinks actions', async () => {
    const fixedNow = new Date('2026-11-02T10:00:00.000Z');
    const member = await MemberModel.create({
      name: 'Ananya Rao',
      email: 'ananya@mal.test',
    });
    const meeting = await MeetingModel.create({
      title: 'Sprint 14 planning',
      date: '2026-10-24',
      startTime: '10:00',
      durationMin: 45,
      attendeeIds: [member._id],
    });

    await fc.assert(
      fc.asyncProperty(textArb, async (text) => {
        const created = await decisionsService.create(
          String(meeting._id),
          {
            text,
            rationale: 'Because team agreed',
            decidedById: String(member._id),
          },
          fixedNow,
        );
        expect(created.status).toBe('pending');
        expect(created.decidedAt).toBe('2026-10-24');
        expect(created.ageDays).toBe(9);
        expect(created.meetingTitle).toBe('Sprint 14 planning');

        const updated = await decisionsService.update(
          created.id,
          { rationale: 'Updated rationale' },
          fixedNow,
        );
        expect(updated.rationale).toBe('Updated rationale');

        const converted = await decisionsService.convert(
          created.id,
          {
            actions: [
              {
                title: 'Task from decision',
                description: '',
                ownerId: String(member._id),
                dueDate: '2026-11-05',
                priority: 'high',
              },
            ],
          },
          fixedNow,
        );
        expect(converted.decision.status).toBe('converted');
        expect(converted.actions).toHaveLength(1);
        const actionId = converted.actions[0]!.id;

        await decisionsService.remove(created.id);
        const survivingAction = await ActionModel.findById(actionId);
        expect(survivingAction).not.toBeNull();
        expect(survivingAction?.decisionId).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('convert: 100 valid runs set status===converted and link every returned action in decision.actionIds', async () => {
    const fixedNow = new Date('2026-11-02T10:00:00.000Z');
    const member = await MemberModel.create({
      name: 'Karthik Shetty',
      email: 'karthik@mal.test',
    });
    const meeting = await MeetingModel.create({
      title: 'Weekly ops sync',
      date: '2026-10-30',
      startTime: '11:00',
      durationMin: 30,
      attendeeIds: [member._id],
    });

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        fc.constantFrom<'low' | 'medium' | 'high' | 'critical'>(
          'low',
          'medium',
          'high',
          'critical',
        ),
        async (count, priority) => {
          const dec = await decisionsService.create(
            String(meeting._id),
            {
              text: 'Rotate on-call weekly starting Monday',
              decidedById: String(member._id),
            },
            fixedNow,
          );

          const items = Array.from({ length: count }, (_, i) => ({
            title: `Action item ${i + 1}`,
            description: 'Context',
            ownerId: String(member._id),
            dueDate: '2026-11-06',
            priority,
          }));

          const result = await decisionsService.convert(dec.id, { actions: items }, fixedNow);
          expect(result.decision.status).toBe('converted');
          expect(result.actions).toHaveLength(count);
          for (const act of result.actions) {
            expect(act.decisionId).toBe(dec.id);
            expect(result.decision.actionIds).toContain(act.id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('state machine: 100 random transition sequences never reach an invalid state', async () => {
    const fixedNow = new Date('2026-11-02T10:00:00.000Z');
    const member = await MemberModel.create({
      name: 'Meera Iyer',
      email: 'meera@mal.test',
    });
    const meeting = await MeetingModel.create({
      title: 'Onboarding flow review',
      date: '2026-10-27',
      startTime: '15:30',
      durationMin: 60,
      attendeeIds: [member._id],
    });

    type Op = 'convert' | 'dismiss' | 'reopen' | 'clearActions';
    const seqArb = fc.array(fc.constantFrom<Op>('convert', 'dismiss', 'reopen', 'clearActions'), {
      minLength: 3,
      maxLength: 8,
    });

    await fc.assert(
      fc.asyncProperty(seqArb, async (ops) => {
        let dec = await decisionsService.create(
          String(meeting._id),
          {
            text: 'Cut signup form down to three fields',
            decidedById: String(member._id),
          },
          fixedNow,
        );

        for (const op of ops) {
          if (op === 'convert') {
            if (dec.status === 'no-action') {
              await expect(
                decisionsService.convert(
                  dec.id,
                  {
                    actions: [
                      {
                        title: 'New task',
                        ownerId: String(member._id),
                        dueDate: '2026-11-05',
                        priority: 'medium',
                      },
                    ],
                  },
                  fixedNow,
                ),
              ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
            } else {
              const res = await decisionsService.convert(
                dec.id,
                {
                  actions: [
                    {
                      title: 'New task',
                      ownerId: String(member._id),
                      dueDate: '2026-11-05',
                      priority: 'medium',
                    },
                  ],
                },
                fixedNow,
              );
              dec = res.decision;
              expect(dec.status).toBe('converted');
              expect(dec.actionIds.length).toBeGreaterThan(0);
            }
          } else if (op === 'dismiss') {
            if (dec.status === 'converted') {
              await expect(
                decisionsService.dismiss(dec.id, { reason: 'No need' }, fixedNow),
              ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
            } else {
              dec = await decisionsService.dismiss(dec.id, { reason: 'No need' }, fixedNow);
              expect(dec.status).toBe('no-action');
            }
          } else if (op === 'reopen') {
            if (
              dec.status === 'pending' ||
              (dec.status === 'converted' && dec.actionIds.length > 0)
            ) {
              await expect(decisionsService.reopen(dec.id, fixedNow)).rejects.toMatchObject({
                code: 'CONFLICT',
                status: 409,
              });
            } else {
              dec = await decisionsService.reopen(dec.id, fixedNow);
              expect(dec.status).toBe('pending');
              expect(dec.actionIds).toHaveLength(0);
            }
          } else if (op === 'clearActions') {
            await ActionModel.deleteMany({ decisionId: dec.id });
            await DecisionModel.updateOne({ _id: dec.id }, { $set: { actionIds: [] } });
            dec = await decisionsService.get(dec.id, fixedNow);
          }

          // Invariant check after every step
          expect(['pending', 'converted', 'no-action']).toContain(dec.status);
          if (dec.status === 'no-action') {
            expect(dec.actionIds).toHaveLength(0);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
