import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ActionModel } from '../../src/models/Action';
import { MeetingModel } from '../../src/models/Meeting';
import { MemberModel } from '../../src/models/Member';
import { membersService } from '../../src/services/members.service';
import { ApiError } from '../../src/utils/ApiError';

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
    ActionModel.deleteMany({}),
  ]);
});

const nameArb = fc
  .stringMatching(/^[A-Za-z][A-Za-z0-9 ]{1,30}[A-Za-z0-9]$/)
  .filter((s) => s.trim().length >= 2 && s.trim().length <= 60);

const roleArb = fc.stringMatching(/^[A-Za-z0-9 -]{0,25}$/);
const hueArb = fc.integer({ min: 0, max: 359 });

describe('members.service (100x)', () => {
  it('create + get: 100 valid payloads persist and normalize email to lower-case', async () => {
    let seq = 0;
    await fc.assert(
      fc.asyncProperty(nameArb, roleArb, hueArb, async (name, role, avatarHue) => {
        seq += 1;
        const email = `User.${seq}@Example.COM`;
        const created = await membersService.create({ name, email, role, avatarHue });
        expect(created.id).toMatch(/^[0-9a-f]{24}$/);
        expect(created.name).toBe(name.trim());
        expect(created.email).toBe(email.toLowerCase());
        expect(created.role).toBe(role.trim());
        expect(created.avatarHue).toBe(avatarHue);
        expect(created.openActions).toBe(0);
        expect(created.overdueActions).toBe(0);

        const fetched = await membersService.get(created.id);
        expect(fetched.email).toBe(created.email);
      }),
      { numRuns: 100 },
    );
  });

  it('create: 100 duplicate email attempts (including case variations) throw CONFLICT 409', async () => {
    let seq = 0;
    await fc.assert(
      fc.asyncProperty(nameArb, async (name) => {
        seq += 1;
        const baseEmail = `dup${seq}@mal.test`;
        await membersService.create({ name, email: baseEmail });

        await expect(
          membersService.create({ name: 'Another', email: baseEmail.toUpperCase() }),
        ).rejects.toMatchObject({
          code: 'CONFLICT',
          status: 409,
        });
      }),
      { numRuns: 100 },
    );
  });

  it('update: 100 valid updates persist changes and reject email collisions with 409', async () => {
    const first = await membersService.create({
      name: 'First Member',
      email: 'first@mal.test',
      role: 'Lead',
      avatarHue: 120,
    });
    const second = await membersService.create({
      name: 'Second Member',
      email: 'second@mal.test',
      role: 'QA',
      avatarHue: 240,
    });

    let seq = 0;
    await fc.assert(
      fc.asyncProperty(nameArb, roleArb, hueArb, async (name, role, avatarHue) => {
        seq += 1;
        const updated = await membersService.update(first.id, {
          name,
          role,
          avatarHue,
          email: `first.${seq}@mal.test`,
        });
        expect(updated.name).toBe(name.trim());
        expect(updated.role).toBe(role.trim());
        expect(updated.avatarHue).toBe(avatarHue);
        expect(updated.email).toBe(`first.${seq}@mal.test`);

        await expect(
          membersService.update(first.id, { email: second.email.toUpperCase() }),
        ).rejects.toMatchObject({
          code: 'CONFLICT',
          status: 409,
        });
      }),
      { numRuns: 100 },
    );
  });

  it('list: 100 runs compute accurate openActions and overdueActions and support search/pagination', async () => {
    const fixedNow = new Date('2026-11-02T10:00:00.000Z'); // 2026-11-02 in Asia/Kolkata
    const member = await membersService.create({
      name: 'Ananya Rao',
      email: 'ananya@mal.test',
      role: 'Product Lead',
      avatarHue: 176,
    });
    const meeting = await MeetingModel.create({
      title: 'Sprint Planning',
      date: '2026-10-20',
      startTime: '10:00',
      durationMin: 45,
      attendeeIds: [member.id],
    });

    await ActionModel.create([
      {
        meetingId: meeting._id,
        title: 'Overdue task',
        ownerId: member.id,
        dueDate: '2026-10-28',
        priority: 'high',
        status: 'open',
      },
      {
        meetingId: meeting._id,
        title: 'Future open task',
        ownerId: member.id,
        dueDate: '2026-11-10',
        priority: 'medium',
        status: 'in-progress',
      },
      {
        meetingId: meeting._id,
        title: 'Completed task',
        ownerId: member.id,
        dueDate: '2026-10-25',
        priority: 'low',
        status: 'done',
        completedAt: new Date(),
      },
    ]);

    await fc.assert(
      fc.asyncProperty(fc.constantFrom('Ananya', 'ananya@mal', 'Product', undefined), async (q) => {
        const res = await membersService.list({ q, page: 1, limit: 20 }, fixedNow);
        expect(res.data).toHaveLength(1);
        expect(res.data[0]?.openActions).toBe(2);
        expect(res.data[0]?.overdueActions).toBe(1);
        expect(res.meta.total).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('remove: 100 runs enforce 409 on open actions or upcoming meetings, and 204 when only done/past exist', async () => {
    const fixedNow = new Date('2026-11-02T10:00:00.000Z');
    let seq = 0;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'open-action' | 'upcoming-meeting' | 'clean'>(
          'open-action',
          'upcoming-meeting',
          'clean',
        ),
        async (scenario) => {
          seq += 1;
          const m = await membersService.create({
            name: `Member ${seq}`,
            email: `m${seq}@mal.test`,
          });

          if (scenario === 'open-action') {
            const mt = await MeetingModel.create({
              title: 'Past Meeting',
              date: '2026-10-01',
              startTime: '10:00',
              durationMin: 30,
              attendeeIds: [m.id],
            });
            await ActionModel.create({
              meetingId: mt._id,
              title: 'Still open',
              ownerId: m.id,
              dueDate: '2026-11-05',
              priority: 'medium',
              status: 'open',
            });
            await expect(membersService.remove(m.id, fixedNow)).rejects.toThrow(ApiError);
            await expect(membersService.remove(m.id, fixedNow)).rejects.toMatchObject({
              code: 'CONFLICT',
              status: 409,
            });
          } else if (scenario === 'upcoming-meeting') {
            await MeetingModel.create({
              title: 'Upcoming Meeting',
              date: '2026-11-05',
              startTime: '10:00',
              durationMin: 30,
              attendeeIds: [m.id],
            });
            await expect(membersService.remove(m.id, fixedNow)).rejects.toMatchObject({
              code: 'CONFLICT',
              status: 409,
            });
          } else {
            const mt = await MeetingModel.create({
              title: 'Past Meeting',
              date: '2026-10-01',
              startTime: '10:00',
              durationMin: 30,
              attendeeIds: [m.id],
            });
            await ActionModel.create({
              meetingId: mt._id,
              title: 'Already done',
              ownerId: m.id,
              dueDate: '2026-10-05',
              priority: 'low',
              status: 'done',
              completedAt: new Date(),
            });
            await membersService.remove(m.id, fixedNow);
            await expect(membersService.get(m.id, fixedNow)).rejects.toMatchObject({
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
