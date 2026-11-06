import type {
  ActionDTO,
  DecisionDTO,
  InsightsSummaryDTO,
  MeetingDTO,
  MemberDTO,
  OverdueOwnerGroupDTO,
  WeeklyCompletionBucketDTO,
} from './api';

const M1: MemberDTO = {
  id: '000000000000000000000001',
  name: 'Ananya Rao',
  email: 'ananya.rao@meetingactionlog.dev',
  role: 'Product lead',
  avatarHue: 176,
  openActions: 2,
  overdueActions: 1,
};

const M2: MemberDTO = {
  id: '000000000000000000000002',
  name: 'Karthik Shetty',
  email: 'karthik.shetty@meetingactionlog.dev',
  role: 'Backend engineer',
  avatarHue: 28,
  openActions: 3,
  overdueActions: 2,
};

const M3: MemberDTO = {
  id: '000000000000000000000003',
  name: 'Meera Iyer',
  email: 'meera.iyer@meetingactionlog.dev',
  role: 'Designer',
  avatarHue: 320,
  openActions: 2,
  overdueActions: 0,
};

const M4: MemberDTO = {
  id: '000000000000000000000004',
  name: 'Rahul Nair',
  email: 'rahul.nair@meetingactionlog.dev',
  role: 'QA engineer',
  avatarHue: 46,
  openActions: 1,
  overdueActions: 1,
};

const M5: MemberDTO = {
  id: '000000000000000000000005',
  name: 'Priya Menon',
  email: 'priya.menon@meetingactionlog.dev',
  role: 'Marketing',
  avatarHue: 250,
  openActions: 2,
  overdueActions: 0,
};

export const MEMBERS: MemberDTO[] = [M1, M2, M3, M4, M5];

const MT1: MeetingDTO = {
  id: '000000000000000000000011',
  title: 'Sprint 14 planning',
  date: '2026-10-28',
  startTime: '10:00',
  durationMin: 45,
  attendeeIds: [M1.id, M2.id, M3.id, M4.id],
  attendees: [M1, M2, M3, M4],
  agenda: 'Scope for sprint 14, carry-over items from sprint 13, and release milestones.',
  notes: 'Agreed to prioritize audit trail and real-time syncing over secondary formats.',
  tags: ['sprint', 'planning'],
  stats: {
    decisions: 2,
    pendingDecisions: 1,
    actions: 3,
    doneActions: 1,
    overdueActions: 1,
  },
};

const MT2: MeetingDTO = {
  id: '000000000000000000000012',
  title: 'Onboarding flow review',
  date: '2026-10-31',
  startTime: '15:30',
  durationMin: 60,
  attendeeIds: [M1.id, M3.id, M2.id, M5.id],
  attendees: [M1, M3, M2, M5],
  agenda: 'Review conversion hurdles on initial signup and role assignment.',
  notes: 'Direct 1-click team accounts approved.',
  tags: ['design', 'onboarding'],
  stats: {
    decisions: 2,
    pendingDecisions: 0,
    actions: 2,
    doneActions: 0,
    overdueActions: 1,
  },
};

const MT3: MeetingDTO = {
  id: '000000000000000000000013',
  title: 'Weekly ops sync',
  date: '2026-11-04',
  startTime: '11:00',
  durationMin: 30,
  attendeeIds: [M2.id, M4.id, M5.id],
  attendees: [M2, M4, M5],
  agenda: 'Incidents, certificates, on-call rotation and status verification.',
  notes: 'SSL certificate verification challenge completed.',
  tags: ['ops', 'infra'],
  stats: {
    decisions: 1,
    pendingDecisions: 0,
    actions: 2,
    doneActions: 0,
    overdueActions: 1,
  },
};

const MT4: MeetingDTO = {
  id: '000000000000000000000014',
  title: 'Q4 launch go / no-go',
  date: '2026-11-09',
  startTime: '16:00',
  durationMin: 45,
  attendeeIds: [M1.id, M2.id, M3.id, M4.id, M5.id],
  attendees: [M1, M2, M3, M4, M5],
  agenda: 'Final readiness check against the production checklist.',
  notes: 'All core features verified; performance benchmark passed.',
  tags: ['launch', 'q4'],
  stats: {
    decisions: 1,
    pendingDecisions: 1,
    actions: 1,
    doneActions: 0,
    overdueActions: 0,
  },
};

export const MEETINGS: MeetingDTO[] = [MT1, MT2, MT3, MT4];

const A1: ActionDTO = {
  id: 'act-001',
  meetingId: MT1.id,
  meetingTitle: MT1.title,
  decisionId: 'dec-001',
  title: 'Re-plan export tickets into sprint 15',
  description: 'Move stories and update milestone labels in tracker.',
  ownerId: M1.id,
  owner: M1,
  dueDate: '2026-11-02',
  priority: 'high',
  status: 'open',
  completedAt: null,
  isOverdue: true,
  daysOverdue: 4,
  dueState: { kind: 'overdue', days: 4 },
};

const A2: ActionDTO = {
  id: 'act-002',
  meetingId: MT1.id,
  meetingTitle: MT1.title,
  decisionId: null,
  title: 'Fix flaky login test in CI pipeline',
  description: 'Investigate session cookie race condition under parallel test workers.',
  ownerId: M4.id,
  owner: M4,
  dueDate: '2026-11-04',
  priority: 'critical',
  status: 'in-progress',
  completedAt: null,
  isOverdue: true,
  daysOverdue: 2,
  dueState: { kind: 'overdue', days: 2 },
};

const A3: ActionDTO = {
  id: 'act-003',
  meetingId: MT2.id,
  meetingTitle: MT2.title,
  decisionId: 'dec-002',
  title: 'Redesign signup form with three fields',
  description: 'Keep name, work email, and password only for minimum friction.',
  ownerId: M3.id,
  owner: M3,
  dueDate: '2026-11-08',
  priority: 'high',
  status: 'in-progress',
  completedAt: null,
  isOverdue: false,
  daysOverdue: 0,
  dueState: { kind: 'soon', days: 2 },
};

const A4: ActionDTO = {
  id: 'act-004',
  meetingId: MT2.id,
  meetingTitle: MT2.title,
  decisionId: 'dec-002',
  title: 'Update signup API validation rules',
  description: 'Make company and phone optional in v1 payload.',
  ownerId: M2.id,
  owner: M2,
  dueDate: '2026-11-05',
  priority: 'medium',
  status: 'open',
  completedAt: null,
  isOverdue: true,
  daysOverdue: 1,
  dueState: { kind: 'overdue', days: 1 },
};

const A5: ActionDTO = {
  id: 'act-005',
  meetingId: MT3.id,
  meetingTitle: MT3.title,
  decisionId: null,
  title: 'Renew SSL certificate for API gateway',
  description: 'Verify DNS challenge and deploy updated cert.',
  ownerId: M2.id,
  owner: M2,
  dueDate: '2026-10-31',
  priority: 'critical',
  status: 'open',
  completedAt: null,
  isOverdue: true,
  daysOverdue: 6,
  dueState: { kind: 'overdue', days: 6 },
};

const A6: ActionDTO = {
  id: 'act-006',
  meetingId: MT4.id,
  meetingTitle: MT4.title,
  decisionId: null,
  title: 'Prepare launch sign-off documentation',
  description: 'Compile QA, ops, and marketing sign-off items.',
  ownerId: M3.id,
  owner: M3,
  dueDate: '2026-11-06',
  priority: 'high',
  status: 'open',
  completedAt: null,
  isOverdue: false,
  daysOverdue: 0,
  dueState: { kind: 'today', days: 0 },
};

const A7: ActionDTO = {
  id: 'act-007',
  meetingId: MT1.id,
  meetingTitle: MT1.title,
  decisionId: null,
  title: 'Stakeholder demo scheduling',
  description: 'Send calendar invite for Friday sprint review.',
  ownerId: M1.id,
  owner: M1,
  dueDate: '2026-11-05',
  priority: 'medium',
  status: 'done',
  completedAt: '2026-11-05T14:00:00Z',
  isOverdue: false,
  daysOverdue: 0,
  dueState: { kind: 'done', days: 0 },
};

export const ACTIONS: ActionDTO[] = [A1, A2, A3, A4, A5, A6, A7];

export const DECISIONS: DecisionDTO[] = [
  {
    id: 'dec-001',
    meetingId: MT1.id,
    meetingTitle: MT1.title,
    text: 'Move the export feature to sprint 15',
    rationale: 'Allows engineering to stabilize real-time SSE updates before format expansion.',
    decidedById: M1.id,
    decidedBy: M1,
    decidedAt: '2026-10-28',
    ageDays: 9,
    status: 'converted',
    noActionReason: '',
    actionIds: ['act-001'],
  },
  {
    id: 'dec-002',
    meetingId: MT2.id,
    meetingTitle: MT2.title,
    text: 'Adopt single-tier onboarding flow',
    rationale: 'Reduces time-to-first-action from 4 minutes to under 30 seconds.',
    decidedById: M3.id,
    decidedBy: M3,
    decidedAt: '2026-10-31',
    ageDays: 6,
    status: 'converted',
    noActionReason: '',
    actionIds: ['act-003', 'act-004'],
  },
  {
    id: 'dec-003',
    meetingId: MT4.id,
    meetingTitle: MT4.title,
    text: 'Freeze public API contract v1 for external partners',
    rationale: 'Ensure semantic versioning guarantees are respected for semester evaluations.',
    decidedById: M2.id,
    decidedBy: M2,
    decidedAt: '2026-11-04',
    ageDays: 2,
    status: 'pending',
    noActionReason: '',
    actionIds: [],
  },
  {
    id: 'dec-004',
    meetingId: MT1.id,
    meetingTitle: MT1.title,
    text: 'Enforce strict 0 emoji quality check across all client views',
    rationale: 'Maintains professional editorial typography and passes automated AST inspections.',
    decidedById: M1.id,
    decidedBy: M1,
    decidedAt: '2026-10-28',
    ageDays: 9,
    status: 'pending',
    noActionReason: '',
    actionIds: [],
  },
];

export function getDemoFallback<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): T | null {
  const norm = path.startsWith('/api') ? path.slice(4) : path;
  const method = options.method?.toUpperCase() ?? 'GET';

  if (norm.startsWith('/auth/login')) {
    const input = options.body as { email?: string; password?: string } | undefined;
    const email = input?.email ?? 'demo@meetingactionlog.dev';
    const matched = MEMBERS.find((m) => m.email.toLowerCase() === email.toLowerCase());
    return {
      user: {
        id: matched?.id ?? '000000000000000000000003',
        name: matched?.name ?? (email.split('@')[0] || 'User'),
        email,
        role: matched?.role ?? 'Member',
        avatarHue: matched?.avatarHue ?? 200,
        memberId: matched?.id ?? '000000000000000000000003',
        createdAt: new Date().toISOString(),
      },
      token: 'ghpages-demo-jwt-token',
    } as T;
  }

  if (norm.startsWith('/auth/register')) {
    const input = options.body as { name?: string; email?: string; role?: string } | undefined;
    const name = input?.name ?? 'Customer';
    const email = input?.email ?? 'customer@meetingactionlog.dev';
    return {
      user: {
        id: 'user-' + Date.now(),
        name,
        email,
        role: input?.role || 'Customer',
        avatarHue: 200,
        memberId: '000000000000000000000001',
        createdAt: new Date().toISOString(),
      },
      token: 'ghpages-demo-jwt-token',
    } as T;
  }

  if (norm.startsWith('/auth/me')) {
    return {
      id: M3.id,
      name: M3.name,
      email: M3.email,
      role: M3.role,
      avatarHue: M3.avatarHue,
      memberId: M3.id,
      createdAt: '2026-10-15T00:00:00Z',
    } as T;
  }

  if (norm.startsWith('/auth/demo-users')) {
    return [
      {
        id: M3.id,
        email: M3.email,
        name: M3.name,
        role: M3.role,
        avatarHue: M3.avatarHue,
        memberId: M3.id,
      },
      {
        id: M5.id,
        email: M5.email,
        name: M5.name,
        role: M5.role,
        avatarHue: M5.avatarHue,
        memberId: M5.id,
      },
      {
        id: M4.id,
        email: M4.email,
        name: M4.name,
        role: M4.role,
        avatarHue: M4.avatarHue,
        memberId: M4.id,
      },
    ] as T;
  }

  if (norm.startsWith('/insights/summary')) {
    const summary: InsightsSummaryDTO = {
      openActions: 6,
      overdueActions: 4,
      doneActions: 1,
      totalActions: 7,
      completionRate: 14.3,
      pendingDecisions: 2,
      upcomingMeetings: 1,
      oldestOverdueDays: 6,
      totalMeetings: 4,
    };
    return summary as T;
  }

  if (norm.startsWith('/insights/overdue')) {
    const groups: OverdueOwnerGroupDTO[] = [
      {
        owner: M2,
        count: 2,
        oldestDaysOverdue: 6,
        actions: [A5, A4],
      },
      {
        owner: M1,
        count: 1,
        oldestDaysOverdue: 4,
        actions: [A1],
      },
      {
        owner: M4,
        count: 1,
        oldestDaysOverdue: 2,
        actions: [A2],
      },
    ];
    return groups as T;
  }

  if (norm.startsWith('/insights/unconverted-decisions') || norm.startsWith('/decisions/pending')) {
    const pending = DECISIONS.filter((d) => d.status === 'pending');
    return pending as T;
  }

  if (norm.startsWith('/insights/weekly-completion')) {
    const buckets: WeeklyCompletionBucketDTO[] = [
      { week: 'W39', completed: 2 },
      { week: 'W40', completed: 4 },
      { week: 'W41', completed: 3 },
      { week: 'W42', completed: 5 },
      { week: 'W43', completed: 6 },
      { week: 'W44', completed: 1 },
    ];
    return buckets as T;
  }

  if (norm.startsWith('/meetings')) {
    if (norm === '/meetings') {
      return MEETINGS as T;
    }
    const id = norm.split('/')[2];
    const mt = MEETINGS.find((m) => m.id === id) ?? MT1;
    const meetingActions = ACTIONS.filter((a) => a.meetingId === mt.id);
    const meetingDecisions = DECISIONS.filter((d) => d.meetingId === mt.id);
    return {
      ...mt,
      attendees: mt.attendees ?? [],
      decisions: meetingDecisions,
      actions: meetingActions,
    } as T;
  }

  if (norm.startsWith('/actions')) {
    if (method === 'PATCH' && norm.includes('/status')) {
      const parts = norm.split('/');
      const id = parts[2];
      const act = ACTIONS.find((a) => a.id === id);
      const newStatus = (options.body as { status?: string } | undefined)?.status ?? 'done';
      if (act) {
        act.status = newStatus as ActionDTO['status'];
        if (newStatus === 'done') {
          act.completedAt = new Date().toISOString();
          act.isOverdue = false;
        }
        return act as T;
      }
    }
    return {
      data: ACTIONS,
      meta: { page: 1, limit: 50, total: ACTIONS.length, totalPages: 1 },
    } as T;
  }

  if (norm.startsWith('/members')) {
    return MEMBERS as T;
  }

  if (norm.startsWith('/auth/profile')) {
    return {
      user: {
        id: M3.id,
        name: M3.name,
        email: M3.email,
        role: M3.role,
        avatarHue: M3.avatarHue,
        memberId: M3.id,
        createdAt: '2026-10-15T00:00:00Z',
      },
      stats: {
        actionsCount: 3,
        openActionsCount: 2,
        overdueActionsCount: 0,
        completedActionsCount: 1,
        meetingsCount: 2,
        decisionsCount: 1,
      },
    } as T;
  }

  return null;
}
