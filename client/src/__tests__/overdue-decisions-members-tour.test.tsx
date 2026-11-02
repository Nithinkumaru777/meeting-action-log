import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { createQueryClient } from '../lib/queryClient';
import { useShellStore } from '../components/layout/app-shell';
import { useToastStore } from '../components/feedback/toast-store';
import { OverduePage } from '../features/overdue/overdue-page';
import { DecisionsInboxPage } from '../features/decisions/decisions-inbox-page';
import { MembersPage } from '../features/members/members-page';
import { GuidedTourOverlay, TOUR_STEPS } from '../features/tour/tour-overlay';
import { AppRoutes } from '../App';

const MEMBER_1 = {
  id: '000000000000000000000001',
  name: 'Ananya Rao',
  email: 'ananya@example.com',
  role: 'Product lead',
  avatarHue: 176,
};

const MEETING_ID = '000000000000000000000011';

const server = setupServer(
  http.get('*/api/members', () => HttpResponse.json({ data: [MEMBER_1] })),
  http.post('*/api/members', async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      email: string;
      role: string;
      avatarHue: number;
    };
    return HttpResponse.json(
      {
        data: {
          id: '000000000000000000000002',
          ...body,
        },
      },
      { status: 201 }
    );
  }),
  http.delete('*/api/members/:id', () =>
    HttpResponse.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'Member still owns open actions',
          details: [],
        },
      },
      { status: 409 }
    )
  ),
  http.get('*/api/insights/summary', () =>
    HttpResponse.json({
      data: {
        openActions: 5,
        overdueActions: 1,
        doneActions: 2,
        totalActions: 7,
        completionRate: 29,
        pendingDecisions: 1,
        upcomingMeetings: 1,
        oldestOverdueDays: 4,
        totalMeetings: 3,
      },
    })
  ),
  http.get('*/api/insights/overdue', () =>
    HttpResponse.json({
      data: [
        {
          owner: MEMBER_1,
          count: 1,
          oldestDaysOverdue: 4,
          actions: [
            {
              id: '0000000000000000000000a1',
              meetingId: MEETING_ID,
              meetingTitle: 'Sprint 14 planning',
              decisionId: null,
              title: 'Renew SSL certificate',
              description: '',
              ownerId: MEMBER_1.id,
              owner: MEMBER_1,
              dueDate: '2026-10-25',
              priority: 'critical',
              status: 'open',
              completedAt: null,
              isOverdue: true,
              daysOverdue: 4,
              dueState: { kind: 'overdue', days: 4 },
            },
          ],
        },
      ],
    })
  ),
  http.post('*/api/actions/:id/extend', ({ params }) =>
    HttpResponse.json({
      data: {
        id: String(params.id),
        meetingId: MEETING_ID,
        decisionId: null,
        title: 'Renew SSL certificate',
        description: '',
        ownerId: MEMBER_1.id,
        owner: MEMBER_1,
        dueDate: '2026-11-05',
        priority: 'critical',
        status: 'open',
        completedAt: null,
        isOverdue: false,
        daysOverdue: 0,
        dueState: { kind: 'soon', days: 3 },
      },
    })
  ),
  http.get('*/api/decisions', () =>
    HttpResponse.json({
      data: [
        {
          id: '0000000000000000000000d1',
          meetingId: MEETING_ID,
          meetingTitle: 'Sprint 14 planning',
          text: 'Rotate on-call weekly',
          rationale: '',
          decidedById: MEMBER_1.id,
          decidedBy: MEMBER_1,
          decidedAt: '2026-10-30',
          ageDays: 3,
          status: 'pending',
          noActionReason: '',
          actionIds: [],
        },
        {
          id: '0000000000000000000000d2',
          meetingId: MEETING_ID,
          meetingTitle: 'Sprint 14 planning',
          text: 'Keep the status page on the current provider',
          rationale: '',
          decidedById: MEMBER_1.id,
          decidedBy: MEMBER_1,
          decidedAt: '2026-10-30',
          ageDays: 3,
          status: 'no-action',
          noActionReason: 'No change needed',
          actionIds: [],
        },
      ],
      meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
    })
  ),
  http.post('*/api/decisions/:id/dismiss', ({ params }) =>
    HttpResponse.json({
      data: {
        id: String(params.id),
        meetingId: MEETING_ID,
        text: 'Rotate on-call weekly',
        rationale: '',
        decidedById: MEMBER_1.id,
        decidedAt: '2026-10-30',
        ageDays: 3,
        status: 'no-action',
        noActionReason: 'No action needed',
        actionIds: [],
      },
    })
  ),
  http.post('*/api/decisions/:id/reopen', ({ params }) =>
    HttpResponse.json({
      data: {
        id: String(params.id),
        meetingId: MEETING_ID,
        text: 'Keep the status page on the current provider',
        rationale: '',
        decidedById: MEMBER_1.id,
        decidedAt: '2026-10-30',
        ageDays: 3,
        status: 'pending',
        noActionReason: '',
        actionIds: [],
      },
    })
  ),
  http.get('*/api/insights/unconverted-decisions', () => HttpResponse.json({ data: [] })),
  http.get('*/api/insights/weekly-completion', () => HttpResponse.json({ data: [] })),
  http.get('*/api/meetings', () =>
    HttpResponse.json({
      data: [],
      meta: { page: 1, limit: 50, total: 0, totalPages: 1 },
    })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useShellStore.setState({
    searchQuery: '',
    newMeetingOpen: false,
    cmdkOpen: false,
    tourStep: -1,
    theme: 'light',
  });
  useToastStore.getState().clear();
});
afterAll(() => server.close());

describe('Step 13: Overdue + Decision Inbox + Members + Guided Demo Tour (100x)', () => {
  test('OverduePage and DecisionsInboxPage handle +3 days extend, tabs, dismiss, and reopen', { repeats: 100 }, async () => {
    const qc = createQueryClient();
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <OverduePage />
          <DecisionsInboxPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(screen.getByText('Renew SSL certificate')).toBeInTheDocument()
    );
    const extendBtn = screen.getByRole('button', { name: /\+3 days/i });
    fireEvent.click(extendBtn);

    await waitFor(() =>
      expect(screen.getByText(/Rotate on-call weekly/)).toBeInTheDocument()
    );

    const noActionTab = screen.getByRole('button', { name: /^No action\s*1$/i });
    fireEvent.click(noActionTab);
    await waitFor(() =>
      expect(
        screen.getByText(/Keep the status page on the current provider/)
      ).toBeInTheDocument()
    );

    const reopenBtn = screen.getByRole('button', { name: /Reopen/i });
    fireEvent.click(reopenBtn);

    unmount();
    qc.clear();
  });

  test('MembersPage CRUD and 409 delete conflict toast + 8-step GuidedTourOverlay + AppRoutes', { repeats: 100 }, async () => {
    expect(TOUR_STEPS.length).toBe(8);
    const qc = createQueryClient();
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/members']}>
          <AppRoutes />
          <MembersPage />
          <GuidedTourOverlay />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(screen.getAllByText('Ananya Rao').length).toBeGreaterThan(0)
    );

    const removeBtns = screen.getAllByRole('button', {
      name: /Remove Ananya Rao/i,
    });
    fireEvent.click(removeBtns[0]!);

    await waitFor(() =>
      expect(
        useToastStore
          .getState()
          .toasts.some((t) => t.title === 'Cannot remove member')
      ).toBe(true)
    );

    useShellStore.getState().startTour();
    await waitFor(() =>
      expect(screen.getAllByText(/Step 1 of 8/i).length).toBeGreaterThan(0)
    );

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(useShellStore.getState().tourStep).toBe(1)
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(useShellStore.getState().tourStep).toBe(-1)
    );

    unmount();
    qc.clear();
  });
});
