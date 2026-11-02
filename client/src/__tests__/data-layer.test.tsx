import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { ApiError, apiFetch, applyServerErrorsToForm } from '../lib/api';
import { createQueryClient, queryKeys } from '../lib/queryClient';
import { useMembersQuery, useCreateMemberMutation, useDeleteMemberMutation } from '../features/members/hooks';
import { useMeetingsQuery, useMeetingDetailQuery } from '../features/meetings/hooks';
import { useDecisionsQuery, useConvertDecisionMutation } from '../features/decisions/hooks';
import { useActionsQuery, useToggleActionStatusMutation } from '../features/actions/hooks';
import {
  useInsightsOverviewQuery,
  useOverdueByOwnerQuery,
  useUnconvertedDecisionsQuery,
  useWeeklyVelocityQuery,
} from '../features/dashboard/hooks';

const server = setupServer(
  http.get('*/api/members', () =>
    HttpResponse.json({
      data: [
        { id: 'm1', name: 'Ananya Rao', email: 'ananya@example.com', role: 'Lead', avatarHue: 176 },
      ],
    })
  ),
  http.post('*/api/members', async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string; role?: string };
    if (!body.name) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [{ path: 'name', message: 'Name is required' }],
            requestId: 'req-400',
          },
        },
        { status: 400 }
      );
    }
    return HttpResponse.json(
      {
        data: {
          id: 'm2',
          name: body.name,
          email: body.email ?? 'k@example.com',
          role: body.role ?? 'Dev',
          avatarHue: 40,
        },
      },
      { status: 201 }
    );
  }),
  http.delete('*/api/members/:id', ({ params }) => {
    if (params.id === 'conflict') {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Member still owns open actions',
            details: [],
          },
        },
        { status: 409 }
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('*/api/meetings', () =>
    HttpResponse.json({
      data: [
        {
          id: 'mt1',
          title: 'Sprint 14 planning',
          date: '2026-11-01',
          startTime: '10:00',
          durationMin: 45,
          attendeeIds: ['m1'],
          agenda: 'Scope',
          notes: '',
          tags: [],
          stats: { decisions: 2, pendingDecisions: 1, actions: 3, doneActions: 1, overdueActions: 1 },
        },
      ],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    })
  ),
  http.get('*/api/meetings/:id', ({ params }) => {
    if (params.id === 'missing') {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Meeting not found', details: [] } },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      data: {
        id: String(params.id),
        title: 'Sprint 14 planning',
        date: '2026-11-01',
        startTime: '10:00',
        durationMin: 45,
        attendeeIds: ['m1'],
        attendees: [
          { id: 'm1', name: 'Ananya Rao', email: 'ananya@example.com', role: 'Lead', avatarHue: 176 },
        ],
        agenda: 'Scope',
        notes: '',
        tags: [],
        stats: { decisions: 1, pendingDecisions: 1, actions: 1, doneActions: 0, overdueActions: 0 },
        decisions: [],
        actions: [],
      },
    });
  }),
  http.get('*/api/decisions', () =>
    HttpResponse.json({
      data: [],
      meta: { page: 1, limit: 50, total: 0, totalPages: 1 },
    })
  ),
  http.post('*/api/decisions/:id/convert', ({ params }) =>
    HttpResponse.json(
      {
        data: {
          decision: {
            id: String(params.id),
            meetingId: 'mt1',
            text: 'Cut signup form',
            rationale: '',
            decidedById: 'm1',
            decidedAt: '2026-11-01',
            ageDays: 2,
            status: 'converted',
            noActionReason: '',
            actionIds: ['a99'],
          },
          actions: [
            {
              id: 'a99',
              meetingId: 'mt1',
              decisionId: String(params.id),
              title: 'Cut signup form',
              description: '',
              ownerId: 'm1',
              dueDate: '2026-11-10',
              priority: 'high',
              status: 'open',
              completedAt: null,
              isOverdue: false,
              daysOverdue: 0,
              dueState: { kind: 'later', days: 8 },
            },
          ],
        },
      },
      { status: 201 }
    )
  ),
  http.get('*/api/actions', () =>
    HttpResponse.json({
      data: [],
      meta: { page: 1, limit: 50, total: 0, totalPages: 1 },
    })
  ),
  http.patch('*/api/actions/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { status: 'open' | 'done' };
    return HttpResponse.json({
      data: {
        id: String(params.id),
        meetingId: 'mt1',
        decisionId: null,
        title: 'Task',
        description: '',
        ownerId: 'm1',
        dueDate: '2026-11-10',
        priority: 'medium',
        status: body.status,
        completedAt: body.status === 'done' ? '2026-11-02T00:00:00Z' : null,
        isOverdue: false,
        daysOverdue: 0,
        dueState: { kind: body.status === 'done' ? 'done' : 'later', days: 0 },
      },
    });
  }),
  http.get('*/api/insights/summary', () =>
    HttpResponse.json({
      data: {
        openActions: 7,
        overdueActions: 4,
        doneActions: 3,
        totalActions: 10,
        completionRate: 30,
        pendingDecisions: 3,
        upcomingMeetings: 1,
        oldestOverdueDays: 6,
        totalMeetings: 5,
      },
    })
  ),
  http.get('*/api/insights/overdue', () => HttpResponse.json({ data: [] })),
  http.get('*/api/insights/unconverted-decisions', () => HttpResponse.json({ data: [] })),
  http.get('*/api/insights/weekly-completion', () =>
    HttpResponse.json({
      data: [
        { week: '2026-W43', completed: 4 },
        { week: '2026-W44', completed: 6 },
      ],
    })
  ),
  http.get('*/api/fail-500', () =>
    HttpResponse.json(
      { error: { code: 'INTERNAL', message: 'Database unavailable', details: [] } },
      { status: 500 }
    )
  ),
  http.get('*/api/fail-net', () => HttpResponse.error())
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Step 10: Client Data Layer & React Query Hooks (100x)', () => {
  test('apiFetch handles 200, 204, 400 with field details, 404, 409, 500, and network error', { repeats: 100 }, async () => {
    const members = await apiFetch<Array<{ id: string }>>('/members');
    expect(members[0]?.id).toBe('m1');

    const delOk = await apiFetch<void>('/members/m1', { method: 'DELETE' });
    expect(delOk).toBeUndefined();

    const mapped: Record<string, string> = {};
    try {
      await apiFetch('/members', { method: 'POST', body: {} });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.code).toBe('VALIDATION_ERROR');
      expect(apiErr.requestId).toBe('req-400');
      const applied = applyServerErrorsToForm(err, (field, e) => {
        mapped[field] = e.message ?? '';
      });
      expect(applied).toBe(true);
    }
    expect(mapped.name).toBe('Name is required');

    await expect(apiFetch('/meetings/missing')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });

    await expect(apiFetch('/members/conflict', { method: 'DELETE' })).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
    });

    await expect(apiFetch('/fail-500')).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL',
    });

    await expect(apiFetch('/fail-net')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  test('queryKeys and TanStack Query hooks fetch, mutate, and optimistically update', { repeats: 100 }, async () => {
    expect(queryKeys.members()).toEqual(['members']);
    expect(queryKeys.meeting('mt1')).toEqual(['meeting', 'mt1']);
    expect(queryKeys.insightsOverview()).toEqual(['insights', 'overview']);
    expect(queryKeys.insightsByOwner()).toEqual(['insights', 'by-owner']);
    expect(queryKeys.insightsVelocity(8)).toEqual(['insights', 'velocity', 8]);

    const qc = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result: overviewRes, unmount: u1 } = renderHook(() => useInsightsOverviewQuery(), {
      wrapper,
    });
    await waitFor(() => expect(overviewRes.current.isSuccess).toBe(true));
    expect(overviewRes.current.data?.openActions).toBe(7);

    const { result: membersRes, unmount: u2 } = renderHook(() => useMembersQuery(), { wrapper });
    await waitFor(() => expect(membersRes.current.isSuccess).toBe(true));
    expect(membersRes.current.data?.length).toBe(1);

    const { result: meetingsRes, unmount: u3 } = renderHook(
      () => useMeetingsQuery({ filter: 'all' }),
      { wrapper }
    );
    await waitFor(() => expect(meetingsRes.current.isSuccess).toBe(true));
    expect(meetingsRes.current.data?.data[0]?.id).toBe('mt1');

    const { result: detailRes, unmount: u4 } = renderHook(
      () => useMeetingDetailQuery('mt1'),
      { wrapper }
    );
    await waitFor(() => expect(detailRes.current.isSuccess).toBe(true));
    expect(detailRes.current.data?.title).toBe('Sprint 14 planning');

    const { result: decRes, unmount: u5 } = renderHook(
      () => useDecisionsQuery({ status: 'pending' }),
      { wrapper }
    );
    const { result: actRes, unmount: u6 } = renderHook(() => useActionsQuery({}), { wrapper });
    const { result: overRes, unmount: u7 } = renderHook(() => useOverdueByOwnerQuery(), {
      wrapper,
    });
    const { result: unconvRes, unmount: u8 } = renderHook(
      () => useUnconvertedDecisionsQuery(10),
      { wrapper }
    );
    const { result: velRes, unmount: u9 } = renderHook(() => useWeeklyVelocityQuery(8), {
      wrapper,
    });
    await waitFor(() =>
      expect(
        decRes.current.isSuccess &&
          actRes.current.isSuccess &&
          overRes.current.isSuccess &&
          unconvRes.current.isSuccess &&
          velRes.current.isSuccess
      ).toBe(true)
    );

    const { result: toggleMut, unmount: u10 } = renderHook(
      () => useToggleActionStatusMutation(),
      { wrapper }
    );
    const toggled = await toggleMut.current.mutateAsync({
      id: 'a1',
      status: 'done',
      meetingId: 'mt1',
    });
    expect(toggled.status).toBe('done');

    const { result: convertMut, unmount: u11 } = renderHook(
      () => useConvertDecisionMutation(),
      { wrapper }
    );
    const converted = await convertMut.current.mutateAsync({
      id: 'dc1',
      input: {
        actions: [
          {
            title: 'Cut signup form',
            ownerId: 'm1',
            dueDate: '2026-11-10',
            priority: 'high',
          },
        ],
      },
    });
    expect(converted.decision.status).toBe('converted');
    expect(converted.actions[0]?.id).toBe('a99');

    const { result: createMemberMut, unmount: u12 } = renderHook(
      () => useCreateMemberMutation(),
      { wrapper }
    );
    const createdMember = await createMemberMut.current.mutateAsync({
      name: 'Karthik Shetty',
      email: 'karthik@example.com',
      role: 'Backend',
    });
    expect(createdMember.id).toBe('m2');

    const { result: delMemberMut, unmount: u13 } = renderHook(
      () => useDeleteMemberMutation(),
      { wrapper }
    );
    await expect(delMemberMut.current.mutateAsync('conflict')).rejects.toMatchObject({
      status: 409,
    });

    u1();
    u2();
    u3();
    u4();
    u5();
    u6();
    u7();
    u8();
    u9();
    u10();
    u11();
    u12();
    u13();
    qc.clear();
  });
});
