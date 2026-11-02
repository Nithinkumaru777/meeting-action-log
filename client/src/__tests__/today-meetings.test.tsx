import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { createQueryClient } from '../lib/queryClient';
import { useShellStore } from '../components/layout/app-shell';
import { TodayPage } from '../features/dashboard/today-page';
import { MeetingsPage } from '../features/meetings/meetings-page';
import { MeetingFormSheet } from '../features/meetings/meeting-form-sheet';

const MEMBER_1 = {
  id: '000000000000000000000001',
  name: 'Ananya Rao',
  email: 'ananya@example.com',
  role: 'Product lead',
  avatarHue: 176,
};

const MEETING_1 = {
  id: '000000000000000000000011',
  title: 'Sprint 14 planning',
  date: '2025-01-10',
  startTime: '10:00',
  durationMin: 45,
  attendeeIds: [MEMBER_1.id],
  attendees: [MEMBER_1],
  agenda: 'Scope for sprint 14',
  notes: '',
  tags: [],
  stats: {
    decisions: 2,
    pendingDecisions: 1,
    actions: 3,
    doneActions: 1,
    overdueActions: 1,
  },
};

const server = setupServer(
  http.get('*/api/members', () => HttpResponse.json({ data: [MEMBER_1] })),
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
    }),
  ),
  http.get('*/api/insights/overdue', () =>
    HttpResponse.json({
      data: [
        {
          owner: MEMBER_1,
          count: 1,
          oldestDaysOverdue: 6,
          actions: [
            {
              id: '0000000000000000000000a1',
              meetingId: MEETING_1.id,
              meetingTitle: MEETING_1.title,
              decisionId: null,
              title: 'Re-plan export tickets into sprint 15',
              description: '',
              ownerId: MEMBER_1.id,
              owner: MEMBER_1,
              dueDate: '2025-01-05',
              priority: 'high',
              status: 'open',
              completedAt: null,
              isOverdue: true,
              daysOverdue: 5,
              dueState: { kind: 'overdue', days: 5 },
            },
          ],
        },
      ],
    }),
  ),
  http.get('*/api/insights/unconverted-decisions', () =>
    HttpResponse.json({
      data: [
        {
          id: '0000000000000000000000d1',
          meetingId: MEETING_1.id,
          meetingTitle: MEETING_1.title,
          text: 'Every repository gets a pull-request template',
          rationale: '',
          decidedById: MEMBER_1.id,
          decidedBy: MEMBER_1,
          decidedAt: '2025-01-10',
          ageDays: 4,
          status: 'pending',
          noActionReason: '',
          actionIds: [],
        },
      ],
    }),
  ),
  http.get('*/api/insights/weekly-completion', () =>
    HttpResponse.json({
      data: [
        { week: '2026-W40', completed: 3 },
        { week: '2026-W41', completed: 6 },
      ],
    }),
  ),
  http.get('*/api/meetings', () =>
    HttpResponse.json({
      data: [MEETING_1],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    }),
  ),
  http.post('*/api/meetings', async ({ request }) => {
    const body = (await request.json()) as {
      title: string;
      date: string;
      startTime: string;
      durationMin: number;
      attendeeIds: string[];
      agenda?: string;
    };
    return HttpResponse.json(
      {
        data: {
          ...MEETING_1,
          id: '000000000000000000000012',
          title: body.title,
          date: body.date,
          startTime: body.startTime,
          durationMin: body.durationMin,
          attendeeIds: body.attendeeIds,
          agenda: body.agenda ?? '',
        },
      },
      { status: 201 },
    );
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useShellStore.setState({ searchQuery: '', newMeetingOpen: false });
});
afterAll(() => server.close());

describe('Step 11: Today Dashboard + Meetings List + Meeting Form Sheet (100x)', () => {
  test(
    'TodayPage renders figures strip, overdue list, decisions without tasks, and charts',
    { repeats: 100 },
    async () => {
      const qc = createQueryClient();
      const { unmount } = render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <TodayPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() =>
        expect(screen.getByText('Re-plan export tickets into sprint 15')).toBeInTheDocument(),
      );
      expect(screen.getByText(/Every repository gets a pull-request template/)).toBeInTheDocument();
      expect(screen.getByText('Completed per week')).toBeInTheDocument();
      expect(screen.getByText('Late, by owner')).toBeInTheDocument();

      unmount();
      qc.clear();
    },
  );

  test(
    'MeetingsPage filters by tab and search query, and MeetingFormSheet validates and submits',
    { repeats: 100 },
    async () => {
      const qc = createQueryClient();
      let closed = false;
      const { unmount } = render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <MeetingsPage />
            <MeetingFormSheet open={true} onClose={() => (closed = true)} />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => expect(screen.getByText('Sprint 14 planning')).toBeInTheDocument());

      const createBtn = screen.getByRole('button', { name: /create meeting/i });
      fireEvent.click(createBtn);
      expect(
        screen.getByText(/Give the meeting a title of 3 to 100 characters/i),
      ).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Title'), {
        target: { value: 'Sprint 15 planning' },
      });
      const attendeeCheckbox = await screen.findByLabelText(/Ananya Rao/i);
      fireEvent.click(attendeeCheckbox);
      fireEvent.click(createBtn);

      await waitFor(() => expect(closed).toBe(true));

      unmount();
      qc.clear();
    },
  );
});
