import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient as defaultQueryClient } from './lib/queryClient';
import { ErrorBoundary } from './components/feedback/error-boundary';
import { AppShell, useShellStore } from './components/layout/app-shell';
import type { DecisionItemView } from './components/ui/primitives';
import { useInsightsOverviewQuery } from './features/dashboard/hooks';
import { TodayPage } from './features/dashboard/today-page';
import { MeetingsPage } from './features/meetings/meetings-page';
import { MeetingDetailPage } from './features/meetings/meeting-detail-page';
import { MeetingFormSheet } from './features/meetings/meeting-form-sheet';
import { OverduePage } from './features/overdue/overdue-page';
import { DecisionsInboxPage } from './features/decisions/decisions-inbox-page';
import { MembersPage } from './features/members/members-page';
import { TutorialsPage } from './features/tutorials/tutorials-page';
import { AboutPage } from './features/about/about-page';
import { NotFoundPage } from './features/not-found/not-found-page';
import { ActionFormSheet } from './features/actions/action-form-sheet';
import { GuidedTourOverlay } from './features/tour/tour-overlay';
import { useLiveUpdates } from './lib/live';

export function AppRoutes() {
  const location = useLocation();
  const { newMeetingOpen, setNewMeetingOpen } = useShellStore();
  const overviewQuery = useInsightsOverviewQuery();
  useLiveUpdates();

  const [convertingState, setConvertingState] = useState<{
    decision: DecisionItemView;
    cardEl: HTMLElement | null;
  } | null>(null);

  useEffect(() => {
    const p = location.pathname;
    const label =
      p === '/'
        ? 'Today'
        : p === '/meetings'
          ? 'Meetings'
          : p.startsWith('/meetings/')
            ? 'Meeting'
            : p === '/overdue'
              ? 'Overdue'
              : p === '/decisions'
                ? 'Decision inbox'
                : p === '/members'
                  ? 'Members'
                  : p === '/tutorials'
                    ? 'Tutorials'
                    : p === '/about'
                      ? 'About'
                      : 'Not found';
    document.title = `${label} · MeetingActionLog`;
  }, [location.pathname]);

  const summary = overviewQuery.data;

  return (
    <ErrorBoundary>
      <AppShell
        openActionsCount={summary?.openActions ?? 0}
        overdueCount={summary?.overdueActions ?? 0}
        pendingDecisionsCount={summary?.pendingDecisions ?? 0}
        onNewMeetingClick={() => setNewMeetingOpen(true)}
      >
        <Routes>
          <Route
            path="/"
            element={
              <TodayPage
                onConvertDecision={(decision, cardEl) => setConvertingState({ decision, cardEl })}
              />
            }
          />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
          <Route path="/overdue" element={<OverduePage />} />
          <Route
            path="/decisions"
            element={
              <DecisionsInboxPage
                onConvertDecision={(decision, cardEl) => setConvertingState({ decision, cardEl })}
              />
            }
          />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/tutorials" element={<TutorialsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>

      <MeetingFormSheet open={newMeetingOpen} onClose={() => setNewMeetingOpen(false)} />

      <ActionFormSheet
        open={Boolean(convertingState)}
        onClose={() => setConvertingState(null)}
        meetingId={convertingState?.decision.meetingId ?? ''}
        meetingTitle={convertingState?.decision.meetingTitle ?? 'Meeting'}
        meetingDate={convertingState?.decision.decidedAt}
        decision={convertingState?.decision ?? null}
        sourceCardEl={convertingState?.cardEl ?? null}
        collapseSourceOnConvert
      />

      <GuidedTourOverlay />
    </ErrorBoundary>
  );
}

export function App({ client = defaultQueryClient }: { client?: QueryClient }) {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
