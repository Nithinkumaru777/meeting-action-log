import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { createQueryClient } from '../lib/queryClient';
import { MeetingDetailPage } from '../features/meetings/meeting-detail-page';

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
  http.get(`*/api/meetings/${MEETING_ID}`, () =>
    HttpResponse.json({
      data: {
        id: MEETING_ID,
        title: 'Sprint 14 planning',
        date: '2026-11-01',
        startTime: '10:00',
        durationMin: 45,
        attendeeIds: [MEMBER_1.id],
        attendees: [MEMBER_1],
        agenda: 'Scope for sprint 14',
        notes: '',
        tags: [],
        stats: {
          decisions: 1,
          pendingDecisions: 1,
          actions: 1,
          doneActions: 0,
          overdueActions: 0,
        },
        decisions: [
          {
            id: '0000000000000000000000d1',
            meetingId: MEETING_ID,
            text: 'Every repository gets a pull-request template',
            rationale: '',
            decidedById: MEMBER_1.id,
            decidedBy: MEMBER_1,
            decidedAt: '2026-11-01',
            ageDays: 2,
            status: 'pending',
            noActionReason: '',
            actionIds: [],
          },
        ],
        actions: [
          {
            id: '0000000000000000000000a1',
            meetingId: MEETING_ID,
            decisionId: null,
            title: 'Fix the flaky login test in CI',
            description: '',
            ownerId: MEMBER_1.id,
            owner: MEMBER_1,
            dueDate: '2026-11-10',
            priority: 'critical',
            status: 'open',
            completedAt: null,
            isOverdue: false,
            daysOverdue: 0,
            dueState: { kind: 'later', days: 8 },
          },
        ],
      },
    })
  ),
  http.post(`*/api/meetings/${MEETING_ID}/decisions`, async ({ request }) => {
    const body = (await request.json()) as { text: string; decidedById: string };
    return HttpResponse.json(
      {
        data: {
          id: '0000000000000000000000d2',
          meetingId: MEETING_ID,
          text: body.text,
          rationale: '',
          decidedById: body.decidedById,
          decidedBy: MEMBER_1,
          decidedAt: '2026-11-02',
          ageDays: 0,
          status: 'pending',
          noActionReason: '',
          actionIds: [],
        },
      },
      { status: 201 }
    );
  }),
  http.post('*/api/decisions/:id/convert', async ({ params, request }) => {
    const body = (await request.json()) as {
      actions: Array<{ title: string; ownerId: string; dueDate: string; priority: string }>;
    };
    const first = body.actions[0]!;
    return HttpResponse.json(
      {
        data: {
          decision: {
            id: String(params.id),
            meetingId: MEETING_ID,
            text: first.title,
            rationale: '',
            decidedById: MEMBER_1.id,
            decidedAt: '2026-11-01',
            ageDays: 2,
            status: 'converted',
            noActionReason: '',
            actionIds: ['0000000000000000000000a9'],
          },
          actions: [
            {
              id: '0000000000000000000000a9',
              meetingId: MEETING_ID,
              decisionId: String(params.id),
              title: first.title,
              description: '',
              ownerId: first.ownerId,
              owner: MEMBER_1,
              dueDate: first.dueDate,
              priority: first.priority,
              status: 'open',
              completedAt: null,
              isOverdue: false,
              daysOverdue: 0,
              dueState: { kind: 'later', days: 7 },
            },
          ],
        },
      },
      { status: 201 }
    );
  }),
  http.patch('*/api/actions/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { status: 'open' | 'done' };
    return HttpResponse.json({
      data: {
        id: String(params.id),
        meetingId: MEETING_ID,
        decisionId: null,
        title: 'Fix the flaky login test in CI',
        description: '',
        ownerId: MEMBER_1.id,
        owner: MEMBER_1,
        dueDate: '2026-11-10',
        priority: 'critical',
        status: body.status,
        completedAt: body.status === 'done' ? '2026-11-02T00:00:00Z' : null,
        isOverdue: false,
        daysOverdue: 0,
        dueState: { kind: body.status === 'done' ? 'done' : 'later', days: 0 },
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Step 12: Meeting Detail + Convert Decision Sheet + Action Sheet (100x)', () => {
  test('MeetingDetailPage logs decisions, toggles actions, and converts decisions to tasks', { repeats: 100 }, async () => {
    const qc = createQueryClient();
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/meetings/${MEETING_ID}`]}>
          <Routes>
            <Route path="/meetings/:id" element={<MeetingDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(screen.getByText('Sprint 14 planning')).toBeInTheDocument()
    );
    expect(screen.getByText('Fix the flaky login test in CI')).toBeInTheDocument();

    const logBtn = screen.getByRole('button', { name: /^log$/i });
    fireEvent.click(logBtn);
    expect(
      screen.getByText(/Write the decision in at least 5 characters/i)
    ).toBeInTheDocument();

    const decInput = screen.getByPlaceholderText(/Log a decision/i);
    fireEvent.change(decInput, {
      target: { value: 'Ship v1 without dark mode' },
    });
    fireEvent.click(logBtn);

    const convertBtn = screen.getByRole('button', { name: /Convert to task/i });
    fireEvent.click(convertBtn);

    await waitFor(() =>
      expect(screen.getByLabelText('Owner')).toBeInTheDocument()
    );
    fireEvent.change(screen.getByLabelText('Owner'), {
      target: { value: MEMBER_1.id },
    });
    const submitConvertBtn = screen.getByRole('button', { name: /Create task/i });
    fireEvent.click(submitConvertBtn);

    const chk = screen.getByRole('checkbox', {
      name: /Mark "Fix the flaky login test in CI" done/i,
    });
    fireEvent.click(chk);

    unmount();
    qc.clear();
  });
});
