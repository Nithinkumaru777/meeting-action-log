import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
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
import { IntroPage } from './features/intro/intro-page';
import { LoginPage } from './features/auth/login-page';
import { ProfilePage } from './features/auth/profile-page';
import { NotFoundPage } from './features/not-found/not-found-page';
import { ActionFormSheet } from './features/actions/action-form-sheet';
import { GuidedTourOverlay } from './features/tour/tour-overlay';
import { useLiveUpdates } from './lib/live';
import { useAuthStore } from './lib/auth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}

export function AppRoutes() {
  const location = useLocation();
  const { newMeetingOpen, setNewMeetingOpen } = useShellStore();
  const { user, init: initAuth } = useAuthStore();
  const overviewQuery = useInsightsOverviewQuery();
  useLiveUpdates();

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  const [convertingState, setConvertingState] = useState<{
    decision: DecisionItemView;
    cardEl: HTMLElement | null;
  } | null>(null);

  useEffect(() => {
    const p = location.pathname;
    const label =
      p === '/intro'
        ? 'Intro'
        : p === '/'
          ? user
            ? 'Today'
            : 'Intro'
          : p === '/today'
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
                        : p === '/login'
                          ? 'Sign in'
                          : p === '/profile'
                            ? 'Profile'
                            : p === '/about'
                              ? 'About'
                              : 'Not found';
    document.title = `${label} · MeetingActionLog`;
  }, [location.pathname, user]);

  const isIntroView =
    location.pathname === '/intro' ||
    (!user && (location.pathname === '/' || location.pathname === '/about'));

  if (isIntroView) {
    return (
      <ErrorBoundary>
        <IntroPage initialView={location.pathname === '/about' ? 'about' : 'showcase'} />
      </ErrorBoundary>
    );
  }

  if (!user && location.pathname === '/login') {
    return (
      <ErrorBoundary>
        <LoginPage />
      </ErrorBoundary>
    );
  }

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
              <RequireAuth>
                <TodayPage
                  onConvertDecision={(decision, cardEl) => setConvertingState({ decision, cardEl })}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/today"
            element={
              <RequireAuth>
                <TodayPage
                  onConvertDecision={(decision, cardEl) => setConvertingState({ decision, cardEl })}
                />
              </RequireAuth>
            }
          />
          <Route path="/intro" element={<IntroPage />} />
          <Route
            path="/meetings"
            element={
              <RequireAuth>
                <MeetingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/meetings/:id"
            element={
              <RequireAuth>
                <MeetingDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/overdue"
            element={
              <RequireAuth>
                <OverduePage />
              </RequireAuth>
            }
          />
          <Route
            path="/decisions"
            element={
              <RequireAuth>
                <DecisionsInboxPage
                  onConvertDecision={(decision, cardEl) => setConvertingState({ decision, cardEl })}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/members"
            element={
              <RequireAuth>
                <MembersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/tutorials"
            element={
              <RequireAuth>
                <TutorialsPage />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
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
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
