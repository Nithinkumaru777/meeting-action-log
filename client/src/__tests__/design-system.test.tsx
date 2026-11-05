import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { AnimatedIcon, ICON_DEFS, type IconName } from '../components/ui/animated-icon';
import {
  ActionRow,
  Avatar,
  AvatarStack,
  Button,
  DecisionRow,
  DrawerSheet,
  EmptyState,
  ErrorState,
  Masthead,
  MeetingRow,
  Odometer,
  PriorityBars,
  PriorityPicker,
  Ruler,
  Section,
  SkeletonRows,
  Tabs,
  Tag,
  Who,
  dateEyebrow,
  fmtLong,
  fmtShort,
  initials,
  pad2,
} from '../components/ui/primitives';
import { BarList, Sparkline } from '../components/charts/charts';
import { ToastViewport, toast, useToastStore } from '../components/feedback/toast-store';
import { ErrorBoundary } from '../components/feedback/error-boundary';
import { AppShell, useShellStore } from '../components/layout/app-shell';
import { NotFoundPage } from '../features/not-found/not-found-page';
import { cn } from '../lib/cn';
import { burst, collapseElement, ease, flyToCounter, stagger, t } from '../lib/motion';

describe('Step 09: Client Foundation & Signal Ledger v2 Design System (100x)', () => {
  test('utilities and motion tokens behave deterministically', { repeats: 100 }, () => {
    const off = Math.random() < 0;
    expect(cn('btn', off && 'x', 'ah')).toBe('btn ah');
    expect(t.feedback).toBe(0.1);
    expect(t.state).toBe(0.22);
    expect(t.layout).toBe(0.36);
    expect(ease.out).toEqual([0.22, 1, 0.36, 1]);
    expect(stagger.list).toBe(0.035);
    expect(pad2(4)).toBe('04');
    expect(initials('Ananya Rao')).toBe('AR');
    expect(fmtShort('2026-11-04')).toMatch(/Nov/);
    expect(fmtLong('2026-11-04')).toMatch(/2026/);
    expect(dateEyebrow(new Date('2026-11-04T00:00:00'))).toContain('NOV');

    const div = document.createElement('div');
    burst(div);
    let arrived = false;
    flyToCounter(div, div, '<span>Task</span>', () => {
      arrived = true;
    });
    expect(arrived).toBe(true);
    let collapsed = false;
    collapseElement(div, () => {
      collapsed = true;
    });
    expect(collapsed).toBe(true);
  });

  test('all 29 animated SVG icons render with expected data-a animation', { repeats: 100 }, () => {
    const names = Object.keys(ICON_DEFS) as IconName[];
    expect(names.length).toBeGreaterThanOrEqual(25);
    const { container, unmount } = render(
      <div>
        {names.map((n) => (
          <AnimatedIcon key={n} name={n} loop={n === 'flame'} play={n === 'check'} />
        ))}
      </div>,
    );
    const svgs = container.querySelectorAll('svg.ico');
    expect(svgs.length).toBe(names.length);
    unmount();
  });

  test(
    'primitives, rows, charts, shell, toast, and design system page render and interact',
    { repeats: 100 },
    () => {
      useToastStore.getState().clear();
      useShellStore.setState({
        searchQuery: '',
        newMeetingOpen: false,
        cmdkOpen: false,
        tourStep: -1,
        theme: 'light',
      });

      let pickedPriority = 'medium' as const;
      let currentTab: 'all' | 'upcoming' = 'all';

      const { unmount } = render(
        <MemoryRouter initialEntries={['/design-system']}>
          <ErrorBoundary>
            <AppShell openActionsCount={6} overdueCount={3} pendingDecisionsCount={2}>
              <Masthead
                eyebrow="TEST"
                title="Heading"
                dek="Subtitle"
                side={<Tag tone="teal">Live</Tag>}
              />
              <Section tone="late" title="Overdue" count={3} hotDot note="Past due">
                <Button variant="primary" icon="plus" state="idle">
                  Action
                </Button>
                <Button variant="line" state="loading">
                  Saving
                </Button>
                <Button variant="dec" state="success">
                  Done
                </Button>
                <PriorityBars priority="critical" />
                <PriorityPicker
                  value={pickedPriority}
                  onChange={(v) => {
                    pickedPriority = v as 'medium';
                  }}
                />
                <Avatar member={{ name: 'Ananya Rao', avatarHue: 176 }} size="lg" />
                <AvatarStack
                  members={[
                    { id: 'm1', name: 'Ananya Rao', avatarHue: 176 },
                    { id: 'm2', name: 'Karthik Shetty', avatarHue: 28 },
                  ]}
                />
                <Who member={{ name: 'Meera Iyer', avatarHue: 320 }} firstNameOnly />
                <Odometer value={42} suffix="%" />
                <Ruler rate={65} />
                <Tabs
                  ariaLabel="Filter"
                  value={currentTab}
                  onChange={(v) => {
                    currentTab = v;
                  }}
                  options={[
                    { key: 'all', label: 'All', count: 5 },
                    { key: 'upcoming', label: 'Upcoming', count: 2 },
                  ]}
                />
                <ActionRow
                  action={{
                    id: 'a1',
                    meetingId: 'mt1',
                    meetingTitle: 'Sprint 14',
                    decisionId: 'dc1',
                    title: 'Renew SSL cert',
                    ownerId: 'm1',
                    owner: { id: 'm1', name: 'Ananya Rao', role: 'Lead', avatarHue: 176 },
                    dueDate: new Date(Date.now() - 86400000 * 3),
                    priority: 'critical',
                    status: 'open',
                  }}
                  showQuickExtend
                  onToggle={() => {}}
                  onExtend={() => {}}
                />
                <DecisionRow
                  decision={{
                    id: 'dc1',
                    meetingId: 'mt1',
                    meetingTitle: 'Sprint 14',
                    summary: 'Ship without dark mode',
                    decidedBy: 'm1',
                    decidedByMember: { id: 'm1', name: 'Ananya Rao', role: 'Lead', avatarHue: 176 },
                    decidedAt: new Date(),
                    status: 'pending',
                  }}
                  onConvert={() => {}}
                  onDismiss={() => {}}
                />
                <MeetingRow
                  meeting={{
                    id: 'mt1',
                    title: 'Sprint 14 planning',
                    date: new Date(),
                    startTime: '10:00',
                    durationMin: 45,
                    attendeeIds: ['m1'],
                    attendees: [{ id: 'm1', name: 'Ananya Rao', role: 'Lead', avatarHue: 176 }],
                    agenda: 'Scope review',
                    totalActions: 4,
                    doneActions: 2,
                    overdueActions: 1,
                    pendingDecisions: 1,
                  }}
                />
                <Sparkline values={[2, 4, 6, 5, 8, 7, 9, 10]} />
                <BarList
                  items={[
                    {
                      member: { id: 'm1', name: 'Ananya Rao', role: 'Lead', avatarHue: 176 },
                      count: 3,
                    },
                  ]}
                />
                <EmptyState title="Clean" description="Nothing left" />
                <SkeletonRows count={2} />
                <ErrorState onRetry={() => {}} />
              </Section>
              <NotFoundPage />
            </AppShell>
            <DrawerSheet open={false} onClose={() => {}} eyebrow="Sheet" title="Test Drawer">
              <p>Body</p>
            </DrawerSheet>
            <ToastViewport />
          </ErrorBoundary>
        </MemoryRouter>,
      );

      expect(screen.getByText('Heading')).toBeInTheDocument();
      expect(screen.getByText('Past due')).toBeInTheDocument();
      expect(screen.getByText(/Renew SSL cert/i)).toBeInTheDocument();
      expect(screen.getByText(/Ship without dark mode/i)).toBeInTheDocument();
      expect(screen.getByText(/Sprint 14 planning/i)).toBeInTheDocument();

      toast({ title: 'Test notification', tone: 'ok' });
      expect(useToastStore.getState().toasts.length).toBeGreaterThan(0);

      unmount();
    },
  );
});
