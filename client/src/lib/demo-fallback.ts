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
  {
    id: 'dec-005',
    meetingId: MT3.id,
    meetingTitle: MT3.title,
    text: 'Postpone legacy calendar protocol sync',
    rationale: 'CalDAV sync deferred until Phase 3 to prioritize core ledger functionality.',
    decidedById: M3.id,
    decidedBy: M3,
    decidedAt: '2026-11-02',
    ageDays: 4,
    status: 'no-action',
    noActionReason: 'Deferred to roadmap Phase 3',
    actionIds: [],
  },
];

export function getDemoFallback<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): T | null {
  const norm = path.startsWith('/api') ? path.slice(4) : path;
  const clean = norm.split('?')[0] || norm;
  const method = options.method?.toUpperCase() ?? 'GET';

  // Auth endpoints
  if (clean.startsWith('/auth/login')) {
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

  if (clean.startsWith('/auth/register')) {
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

  if (clean.startsWith('/auth/me')) {
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

  if (clean.startsWith('/auth/demo-users')) {
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

  if (clean.startsWith('/auth/profile')) {
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

  // Insights / Dashboard endpoints
  if (clean.startsWith('/insights/summary')) {
    const summary: InsightsSummaryDTO = {
      openActions: ACTIONS.filter((a) => a.status !== 'done').length,
      overdueActions: ACTIONS.filter((a) => a.isOverdue).length,
      doneActions: ACTIONS.filter((a) => a.status === 'done').length,
      totalActions: ACTIONS.length,
      completionRate: Math.round(
        (ACTIONS.filter((a) => a.status === 'done').length / Math.max(1, ACTIONS.length)) * 100,
      ),
      pendingDecisions: DECISIONS.filter((d) => d.status === 'pending').length,
      upcomingMeetings: 1,
      oldestOverdueDays: 6,
      totalMeetings: MEETINGS.length,
    };
    return summary as T;
  }

  if (clean.startsWith('/insights/overdue')) {
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

  if (clean.startsWith('/insights/unconverted-decisions') || clean === '/decisions/pending') {
    const pending = DECISIONS.filter((d) => d.status === 'pending');
    return pending as T;
  }

  if (clean.startsWith('/insights/weekly-completion')) {
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

  // Decisions endpoints
  if (clean.startsWith('/decisions')) {
    if (clean === '/decisions') {
      return {
        data: DECISIONS,
        meta: { page: 1, limit: 50, total: DECISIONS.length, totalPages: 1 },
      } as T;
    }

    if (clean.endsWith('/dismiss') && method === 'POST') {
      const parts = clean.split('/');
      const id = parts[2];
      const dec = DECISIONS.find((d) => d.id === id);
      if (dec) {
        dec.status = 'no-action';
        dec.noActionReason = (options.body as { reason?: string })?.reason || 'No action needed';
        return dec as T;
      }
    }

    if (clean.endsWith('/reopen') && method === 'POST') {
      const parts = clean.split('/');
      const id = parts[2];
      const dec = DECISIONS.find((d) => d.id === id);
      if (dec) {
        dec.status = 'pending';
        return dec as T;
      }
    }

    if (clean.endsWith('/convert') && method === 'POST') {
      const parts = clean.split('/');
      const id = parts[2];
      const dec = DECISIONS.find((d) => d.id === id);
      const input = options.body as
        | { title?: string; ownerId?: string; dueDate?: string; priority?: ActionDTO['priority'] }
        | undefined;
      const newAction: ActionDTO = {
        id: 'act-' + Date.now(),
        meetingId: dec?.meetingId ?? MT1.id,
        meetingTitle: dec?.meetingTitle ?? MT1.title,
        decisionId: id ?? null,
        title: input?.title || dec?.text || 'Converted action',
        description: '',
        ownerId: input?.ownerId || M1.id,
        owner: MEMBERS.find((m) => m.id === input?.ownerId) ?? M1,
        dueDate: input?.dueDate || '2026-11-12',
        priority: input?.priority || 'high',
        status: 'open',
        completedAt: null,
        isOverdue: false,
        daysOverdue: 0,
        dueState: { kind: 'soon', days: 6 },
      };
      ACTIONS.unshift(newAction);
      if (dec) {
        dec.status = 'converted';
        dec.actionIds = [...dec.actionIds, newAction.id];
      }
      return {
        decision: dec ?? DECISIONS[0],
        actions: [newAction],
      } as T;
    }

    if (method === 'PATCH') {
      const parts = clean.split('/');
      const id = parts[2];
      const dec = DECISIONS.find((d) => d.id === id);
      if (dec) {
        Object.assign(dec, options.body);
        return dec as T;
      }
    }

    if (method === 'DELETE') {
      const parts = clean.split('/');
      const id = parts[2];
      const idx = DECISIONS.findIndex((d) => d.id === id);
      if (idx !== -1) DECISIONS.splice(idx, 1);
      return undefined as T;
    }

    const parts = clean.split('/');
    const id = parts[2];
    const dec = DECISIONS.find((d) => d.id === id) ?? DECISIONS[0];
    return dec as T;
  }

  // Meetings endpoints
  if (clean.startsWith('/meetings')) {
    if (clean === '/meetings') {
      if (method === 'POST') {
        const input = options.body as Partial<MeetingDTO> | undefined;
        const newMeeting: MeetingDTO = {
          id: 'mt-' + Date.now(),
          title: input?.title ?? 'New meeting',
          date: input?.date ?? '2026-11-10',
          startTime: input?.startTime ?? '10:00',
          durationMin: input?.durationMin ?? 45,
          attendeeIds: input?.attendeeIds ?? [M1.id],
          attendees: (input?.attendeeIds ?? [M1.id]).map(
            (id) => MEMBERS.find((m) => m.id === id) ?? M1,
          ),
          agenda: input?.agenda ?? '',
          notes: input?.notes ?? '',
          tags: input?.tags ?? ['planning'],
          stats: {
            decisions: 0,
            pendingDecisions: 0,
            actions: 0,
            doneActions: 0,
            overdueActions: 0,
          },
        };
        MEETINGS.unshift(newMeeting);
        return newMeeting as T;
      }
      return {
        data: MEETINGS,
        meta: { page: 1, limit: 50, total: MEETINGS.length, totalPages: 1 },
      } as T;
    }

    if (clean.includes('/actions') && method === 'POST') {
      const parts = clean.split('/');
      const meetingId = parts[2] ?? MT1.id;
      const mt = MEETINGS.find((m) => m.id === meetingId) ?? MT1;
      const input = options.body as Partial<ActionDTO> | undefined;
      const newAction: ActionDTO = {
        id: 'act-' + Date.now(),
        meetingId,
        meetingTitle: mt.title,
        decisionId: (options.body as { decisionId?: string | null })?.decisionId ?? null,
        title: input?.title ?? 'New action',
        description: input?.description ?? '',
        ownerId: input?.ownerId ?? M1.id,
        owner: MEMBERS.find((m) => m.id === input?.ownerId) ?? M1,
        dueDate: input?.dueDate ?? '2026-11-10',
        priority: input?.priority ?? 'medium',
        status: 'open',
        completedAt: null,
        isOverdue: false,
        daysOverdue: 0,
        dueState: { kind: 'soon', days: 4 },
      };
      ACTIONS.unshift(newAction);
      mt.stats.actions += 1;
      return newAction as T;
    }

    if (clean.includes('/decisions') && method === 'POST') {
      const parts = clean.split('/');
      const meetingId = parts[2] ?? MT1.id;
      const mt = MEETINGS.find((m) => m.id === meetingId) ?? MT1;
      const input = options.body as Partial<DecisionDTO> | undefined;
      const newDec: DecisionDTO = {
        id: 'dec-' + Date.now(),
        meetingId,
        meetingTitle: mt.title,
        text: input?.text ?? 'New decision',
        rationale: input?.rationale ?? '',
        decidedById: input?.decidedById ?? M1.id,
        decidedBy: MEMBERS.find((m) => m.id === input?.decidedById) ?? M1,
        decidedAt: new Date().toISOString().slice(0, 10),
        ageDays: 0,
        status: 'pending',
        noActionReason: '',
        actionIds: [],
      };
      DECISIONS.unshift(newDec);
      mt.stats.decisions += 1;
      mt.stats.pendingDecisions += 1;
      return newDec as T;
    }

    const parts = clean.split('/');
    const id = parts[2];
    const mt = MEETINGS.find((m) => m.id === id) ?? MT1;
    if (method === 'PATCH') {
      Object.assign(mt, options.body);
      return mt as T;
    }
    if (method === 'DELETE') {
      const idx = MEETINGS.findIndex((m) => m.id === id);
      if (idx !== -1) MEETINGS.splice(idx, 1);
      return undefined as T;
    }
    const meetingActions = ACTIONS.filter((a) => a.meetingId === mt.id);
    const meetingDecisions = DECISIONS.filter((d) => d.meetingId === mt.id);
    return {
      ...mt,
      attendees: mt.attendees ?? [],
      decisions: meetingDecisions,
      actions: meetingActions,
    } as T;
  }

  // Actions endpoints
  if (clean.startsWith('/actions')) {
    if (method === 'PATCH' && clean.includes('/status')) {
      const parts = clean.split('/');
      const id = parts[2];
      const act = ACTIONS.find((a) => a.id === id);
      const newStatus = (options.body as { status?: string } | undefined)?.status ?? 'done';
      if (act) {
        act.status = newStatus as ActionDTO['status'];
        if (newStatus === 'done') {
          act.completedAt = new Date().toISOString();
          act.isOverdue = false;
          act.dueState = { kind: 'done', days: 0 };
        } else {
          act.completedAt = null;
        }
        return act as T;
      }
    }

    if (method === 'POST' && clean.includes('/extend')) {
      const parts = clean.split('/');
      const id = parts[2];
      const act = ACTIONS.find((a) => a.id === id);
      if (act) {
        act.daysOverdue = Math.max(0, act.daysOverdue - 3);
        if (act.daysOverdue === 0) {
          act.isOverdue = false;
          act.dueState = { kind: 'today', days: 0 };
        }
        return act as T;
      }
    }

    if (method === 'PATCH') {
      const parts = clean.split('/');
      const id = parts[2];
      const act = ACTIONS.find((a) => a.id === id);
      if (act) {
        Object.assign(act, options.body);
        return act as T;
      }
    }

    if (method === 'DELETE') {
      const parts = clean.split('/');
      const id = parts[2];
      const idx = ACTIONS.findIndex((a) => a.id === id);
      if (idx !== -1) ACTIONS.splice(idx, 1);
      return undefined as T;
    }

    return {
      data: ACTIONS,
      meta: { page: 1, limit: 50, total: ACTIONS.length, totalPages: 1 },
    } as T;
  }

  // Members endpoints
  if (clean.startsWith('/members')) {
    if (method === 'DELETE') {
      const parts = clean.split('/');
      const id = parts[2];
      const idx = MEMBERS.findIndex((m) => m.id === id);
      if (idx !== -1) MEMBERS.splice(idx, 1);
      return undefined as T;
    }

    if (method === 'PATCH') {
      const parts = clean.split('/');
      const id = parts[2];
      const m = MEMBERS.find((member) => member.id === id);
      if (m) {
        Object.assign(m, options.body);
        return m as T;
      }
    }

    if (method === 'POST') {
      const input = options.body as Partial<MemberDTO> | undefined;
      const newMember: MemberDTO = {
        id: '00000000000000000000000' + (MEMBERS.length + 1),
        name: input?.name ?? 'New Member',
        email: input?.email ?? 'member@meetingactionlog.dev',
        role: input?.role ?? 'Contributor',
        avatarHue: input?.avatarHue ?? 180,
        openActions: 0,
        overdueActions: 0,
      };
      MEMBERS.push(newMember);
      return newMember as T;
    }

    return {
      data: MEMBERS,
      meta: { page: 1, limit: 50, total: MEMBERS.length, totalPages: 1 },
    } as T;
  }

  return null;
}
