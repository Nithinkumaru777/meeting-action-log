import { fileURLToPath } from 'node:url';
import { addDaysISO, todayISO } from '@mal/shared';
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../db/connect';
import { ActionModel } from '../models/Action';
import { DecisionModel } from '../models/Decision';
import { MeetingModel } from '../models/Meeting';
import { MemberModel } from '../models/Member';
import { UserModel } from '../models/User';
import { hashPassword } from '../utils/auth';

export interface SeedSummary {
  members: number;
  meetings: number;
  decisions: number;
  actions: number;
  overdueActions: number;
  pendingDecisions: number;
}

export async function seedDatabase(now = new Date()): Promise<SeedSummary> {
  const today = todayISO(env.APP_TIMEZONE, now);
  const d = (offset: number) => addDaysISO(today, offset);
  const dateObj = (offset: number) => new Date(now.getTime() + offset * 86_400_000);

  await Promise.all([
    ActionModel.deleteMany({}),
    DecisionModel.deleteMany({}),
    MeetingModel.deleteMany({}),
    MemberModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);

  const [m1, m2, m3, m4, m5] = await Promise.all([
    MemberModel.create({
      name: 'Ananya Rao',
      email: 'ananya.rao@meetingactionlog.dev',
      role: 'Product lead',
      avatarHue: 176,
    }),
    MemberModel.create({
      name: 'Karthik Shetty',
      email: 'karthik.shetty@meetingactionlog.dev',
      role: 'Backend engineer',
      avatarHue: 28,
    }),
    MemberModel.create({
      name: 'Meera Iyer',
      email: 'meera.iyer@meetingactionlog.dev',
      role: 'Designer',
      avatarHue: 320,
    }),
    MemberModel.create({
      name: 'Rahul Nair',
      email: 'rahul.nair@meetingactionlog.dev',
      role: 'QA engineer',
      avatarHue: 46,
    }),
    MemberModel.create({
      name: 'Priya Menon',
      email: 'priya.menon@meetingactionlog.dev',
      role: 'Marketing',
      avatarHue: 250,
    }),
  ]);

  const defaultPw = hashPassword('Password123!');
  await Promise.all(
    [m1, m2, m3, m4, m5].map((m) =>
      UserModel.create({
        name: m.name,
        email: m.email,
        role: m.role,
        avatarHue: m.avatarHue,
        memberId: m._id,
        passwordHash: defaultPw.hash,
        salt: defaultPw.salt,
      }),
    ),
  );

  const [mt1, mt2, mt3, mt4, mt5] = await Promise.all([
    MeetingModel.create({
      title: 'Sprint 14 planning',
      date: d(-9),
      startTime: '10:00',
      durationMin: 45,
      attendeeIds: [m1._id, m2._id, m3._id, m4._id],
      agenda: 'Scope for sprint 14, carry-over items from sprint 13, and the release date.',
      notes: 'Agreed to focus on reliability before adding new export formats.',
      tags: ['sprint', 'planning'],
    }),
    MeetingModel.create({
      title: 'Onboarding flow review',
      date: d(-6),
      startTime: '15:30',
      durationMin: 60,
      attendeeIds: [m1._id, m3._id, m2._id, m5._id],
      agenda: 'Walk through the new signup and first-run screens. Decide what ships in v1.',
      notes: 'Three-field signup approved; social login deferred.',
      tags: ['design', 'onboarding'],
    }),
    MeetingModel.create({
      title: 'Weekly ops sync',
      date: d(-2),
      startTime: '11:00',
      durationMin: 30,
      attendeeIds: [m2._id, m4._id, m5._id],
      agenda: 'Incidents, certificates, on-call and support hand-offs.',
      notes: 'API certificate expires soon; rotation starts next week.',
      tags: ['ops', 'infra'],
    }),
    MeetingModel.create({
      title: 'Q4 launch go / no-go',
      date: d(3),
      startTime: '16:00',
      durationMin: 45,
      attendeeIds: [m1._id, m2._id, m3._id, m4._id, m5._id],
      agenda: 'Final readiness check against the launch checklist.',
      notes: 'Bring sign-off metrics from QA and marketing.',
      tags: ['launch', 'q4'],
    }),
    MeetingModel.create({
      title: 'Retro: release 2.3',
      date: d(-16),
      startTime: '17:00',
      durationMin: 40,
      attendeeIds: [m1._id, m4._id, m5._id],
      agenda: 'What went well, what hurt, what we change for 2.4.',
      notes: 'Rollback documentation saved 20 minutes during hotfix.',
      tags: ['retro', 'release'],
    }),
    MeetingModel.create({
      title: 'Architecture & API contract review',
      date: d(6),
      startTime: '11:30',
      durationMin: 50,
      attendeeIds: [m1._id, m2._id, m4._id],
      agenda: 'Review pagination envelopes, rate limits, and webhook retries for v2.',
      notes: '',
      tags: ['architecture', 'api'],
    }),
  ]);

  const [dc1, , dc3, , , , dc7] = await Promise.all([
    DecisionModel.create({
      meetingId: mt1._id,
      text: 'Move the export feature to sprint 15',
      rationale: 'Gives backend time to finish schema migration cleanly.',
      decidedById: m1._id,
      decidedAt: d(-9),
      status: 'converted',
      actionIds: [],
    }),
    DecisionModel.create({
      meetingId: mt1._id,
      text: 'Every repository gets a pull-request template',
      rationale: 'Standardizes test plan and rollback notes on PRs.',
      decidedById: m2._id,
      decidedAt: d(-9),
      status: 'pending',
      actionIds: [],
    }),
    DecisionModel.create({
      meetingId: mt2._id,
      text: 'Cut the signup form down to three fields',
      rationale: 'Reduces drop-off on mobile first-run screens.',
      decidedById: m3._id,
      decidedAt: d(-6),
      status: 'converted',
      actionIds: [],
    }),
    DecisionModel.create({
      meetingId: mt2._id,
      text: 'Run a usability test with five new users before launch',
      rationale: 'Catch copy confusion before Q4 release.',
      decidedById: m1._id,
      decidedAt: d(-6),
      status: 'pending',
      actionIds: [],
    }),
    DecisionModel.create({
      meetingId: mt3._id,
      text: 'Rotate on-call weekly, starting Monday',
      rationale: 'Prevents burnout and spreads runbook familiarity.',
      decidedById: m4._id,
      decidedAt: d(-2),
      status: 'pending',
      actionIds: [],
    }),
    DecisionModel.create({
      meetingId: mt3._id,
      text: 'Keep the status page on the current provider',
      rationale: 'Current SLA and cost meet our needs for the next two quarters.',
      decidedById: m2._id,
      decidedAt: d(-2),
      status: 'no-action',
      noActionReason: 'No migration needed for Q4.',
      actionIds: [],
    }),
    DecisionModel.create({
      meetingId: mt5._id,
      text: 'Write a rollback checklist for every release',
      rationale: 'Ensures every on-call engineer can revert within 5 minutes.',
      decidedById: m4._id,
      decidedAt: d(-16),
      status: 'converted',
      actionIds: [],
    }),
  ]);

  const [a1, , a3, a4, , , a7] = await Promise.all([
    ActionModel.create({
      meetingId: mt1._id,
      decisionId: dc1._id,
      title: 'Re-plan export tickets into sprint 15',
      description: 'Move stories and update milestone labels.',
      ownerId: m1._id,
      dueDate: d(-4),
      priority: 'high',
      status: 'open',
      completedAt: null,
    }),
    ActionModel.create({
      meetingId: mt1._id,
      decisionId: null,
      title: 'Fix the flaky login test in CI',
      description: 'Investigate session cookie race condition under parallel workers.',
      ownerId: m4._id,
      dueDate: d(-2),
      priority: 'critical',
      status: 'in-progress',
      completedAt: null,
    }),
    ActionModel.create({
      meetingId: mt2._id,
      decisionId: dc3._id,
      title: 'Redesign signup form with three fields',
      description: 'Keep name, work email, and password only.',
      ownerId: m3._id,
      dueDate: d(2),
      priority: 'high',
      status: 'in-progress',
      completedAt: null,
    }),
    ActionModel.create({
      meetingId: mt2._id,
      decisionId: dc3._id,
      title: 'Update signup API validation rules',
      description: 'Make company and phone optional in v1 payload.',
      ownerId: m2._id,
      dueDate: d(-1),
      priority: 'medium',
      status: 'open',
      completedAt: null,
    }),
    ActionModel.create({
      meetingId: mt3._id,
      decisionId: null,
      title: 'Share ops dashboard link with support',
      description: 'Post read-only dashboard URL in support channel.',
      ownerId: m5._id,
      dueDate: d(5),
      priority: 'low',
      status: 'open',
      completedAt: null,
    }),
    ActionModel.create({
      meetingId: mt3._id,
      decisionId: null,
      title: 'Renew SSL certificate for the API domain',
      description: 'Verify DNS challenge and deploy updated cert.',
      ownerId: m2._id,
      dueDate: d(-6),
      priority: 'critical',
      status: 'open',
      completedAt: null,
    }),
    ActionModel.create({
      meetingId: mt5._id,
      decisionId: dc7._id,
      title: 'Draft the rollback checklist',
      description: 'Document database and container rollback steps.',
      ownerId: m4._id,
      dueDate: d(-10),
      priority: 'medium',
      status: 'done',
      completedAt: dateObj(-11),
    }),
    ActionModel.create({
      meetingId: mt5._id,
      decisionId: null,
      title: 'Archive release 2.3 notes',
      description: 'Publish changelog summary to internal handbook.',
      ownerId: m5._id,
      dueDate: d(-12),
      priority: 'low',
      status: 'done',
      completedAt: dateObj(-18),
    }),
    ActionModel.create({
      meetingId: mt1._id,
      decisionId: null,
      title: 'Book demo slot with stakeholders',
      description: 'Send calendar invite for Friday review.',
      ownerId: m1._id,
      dueDate: d(1),
      priority: 'medium',
      status: 'done',
      completedAt: dateObj(-1),
    }),
    ActionModel.create({
      meetingId: mt4._id,
      decisionId: null,
      title: 'Prepare launch checklist doc',
      description: 'Compile QA, ops, and marketing sign-off items.',
      ownerId: m3._id,
      dueDate: d(0),
      priority: 'high',
      status: 'open',
      completedAt: null,
    }),
  ]);

  dc1.actionIds = [a1._id];
  dc3.actionIds = [a3._id, a4._id];
  dc7.actionIds = [a7._id];
  await Promise.all([dc1.save(), dc3.save(), dc7.save()]);

  return {
    members: 5,
    meetings: 6,
    decisions: 7,
    actions: 10,
    overdueActions: 4,
    pendingDecisions: 3,
  };
}

/* v8 ignore start */
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase();

if (isMain) {
  (async () => {
    await connectDB(env.MONGODB_URI, {
      allowMemoryFallback: env.NODE_ENV !== 'production',
    });
    const result = await seedDatabase();
    console.log('Seeded MeetingActionLog database:', result);
    await disconnectDB();
  })().catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
/* v8 ignore stop */
