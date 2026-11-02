import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import {
  ActionRow,
  Button,
  DecisionRow,
  EmptyState,
  ErrorState,
  Masthead,
  MeetingRow,
  Odometer,
  Ruler,
  Section,
  SkeletonRows,
  Tag,
  dateEyebrow,
  type ActionItemView,
  type DecisionItemView,
} from '../../components/ui/primitives';
import { BarList, Sparkline } from '../../components/charts/charts';
import { toast } from '../../components/feedback/toast-store';
import { useShellStore } from '../../components/layout/app-shell';
import { collapseElement } from '../../lib/motion';
import { toActionView, toDecisionView, toMeetingView, toMemberView } from '../../lib/mappers';
import { useMembersQuery } from '../members/hooks';
import { useMeetingsQuery } from '../meetings/hooks';
import { useToggleActionStatusMutation } from '../actions/hooks';
import { useDismissDecisionMutation, useReopenDecisionMutation } from '../decisions/hooks';
import {
  useInsightsOverviewQuery,
  useOverdueByOwnerQuery,
  useUnconvertedDecisionsQuery,
  useWeeklyVelocityQuery,
} from './hooks';

export interface TodayPageProps {
  onConvertDecision?: (decision: DecisionItemView, cardEl: HTMLElement | null) => void;
}

export function TodayPage({ onConvertDecision }: TodayPageProps) {
  const { setNewMeetingOpen } = useShellStore();
  const overviewQuery = useInsightsOverviewQuery();
  const overdueQuery = useOverdueByOwnerQuery();
  const unconvertedQuery = useUnconvertedDecisionsQuery(10);
  const velocityQuery = useWeeklyVelocityQuery(8);
  const upcomingQuery = useMeetingsQuery({ filter: 'upcoming' });
  const membersQuery = useMembersQuery();

  const toggleStatusMutation = useToggleActionStatusMutation();
  const dismissDecisionMutation = useDismissDecisionMutation();
  const reopenDecisionMutation = useReopenDecisionMutation();

  const membersMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof membersQuery.data>[number]>();
    for (const m of membersQuery.data ?? []) {
      map.set(m.id, m);
    }
    return map;
  }, [membersQuery.data]);

  const overdueList = useMemo(() => {
    const groups = overdueQuery.data ?? [];
    const flat = groups.flatMap((g) => g.actions.map((a) => toActionView(a, membersMap)));
    return flat.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [overdueQuery.data, membersMap]);

  const ownerBars = useMemo(() => {
    return (overdueQuery.data ?? []).map((g) => ({
      member: toMemberView(g.owner, g.owner.id),
      count: g.count,
    }));
  }, [overdueQuery.data]);

  const pendingDecisions = useMemo(() => {
    return (unconvertedQuery.data ?? []).map((d) => toDecisionView(d, membersMap));
  }, [unconvertedQuery.data, membersMap]);

  const upcomingMeetings = useMemo(() => {
    return (upcomingQuery.data?.data ?? []).map((m) => toMeetingView(m, membersMap));
  }, [upcomingQuery.data, membersMap]);

  const velocityValues = useMemo(() => {
    const buckets = velocityQuery.data ?? [];
    if (buckets.length < 2) return [3, 5, 4, 7, 6, 8, 5, 9];
    return buckets.map((b) => b.completed);
  }, [velocityQuery.data]);

  const summary = overviewQuery.data ?? {
    openActions: 0,
    overdueActions: overdueList.length,
    doneActions: 0,
    totalActions: 0,
    completionRate: 0,
    pendingDecisions: pendingDecisions.length,
    upcomingMeetings: upcomingMeetings.length,
    oldestOverdueDays: 0,
    totalMeetings: 0,
  };

  const handleToggleAction = (action: ActionItemView) => {
    const prevStatus = action.status;
    const nextStatus = action.status === 'done' ? 'open' : 'done';
    toggleStatusMutation.mutate(
      { id: action.id, status: nextStatus, meetingId: action.meetingId },
      {
        onSuccess: () => {
          toast({
            title: nextStatus === 'done' ? 'Marked done' : 'Reopened',
            body: action.title,
            tone: nextStatus === 'done' ? 'ok' : 'info',
            undo: () => {
              toggleStatusMutation.mutate({
                id: action.id,
                status: prevStatus,
                meetingId: action.meetingId,
              });
            },
          });
        },
      },
    );
  };

  const handleDismissDecision = (decision: DecisionItemView, cardEl: HTMLElement | null) => {
    collapseElement(cardEl, () => {
      dismissDecisionMutation.mutate(
        { id: decision.id, input: { reason: 'Marked no action from dashboard' } },
        {
          onSuccess: () => {
            toast({
              title: 'Marked as no action needed',
              body: decision.summary,
              tone: 'info',
              undo: () => {
                reopenDecisionMutation.mutate(decision.id);
              },
            });
          },
        },
      );
    });
  };

  if (overviewQuery.isError) {
    return (
      <div>
        <Masthead
          eyebrow={dateEyebrow()}
          title={
            <>
              Who owns <em>what</em>, and what is slipping
            </>
          }
          dek="Every decision should leave the room with an owner and a date. This page shows the ones that did not, and the ones that are late."
        />
        <ErrorState
          message={
            overviewQuery.error instanceof Error
              ? overviewQuery.error.message
              : 'Could not load dashboard metrics.'
          }
          onRetry={() => {
            void overviewQuery.refetch();
            void overdueQuery.refetch();
            void unconvertedQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <Masthead
        eyebrow={dateEyebrow()}
        title={
          <>
            Who owns <em>what</em>, and what is slipping
          </>
        }
        dek="Every decision should leave the room with an owner and a date. This page shows the ones that did not, and the ones that are late."
      />

      <section className="figs st" style={{ '--i': 0 } as CSSProperties}>
        <Link to="/meetings" className="fig ah" data-sink="open">
          <span className="flab eyebrow">
            <AnimatedIcon name="listcheck" />
            Open actions
          </span>
          <span className="fnum">
            <Odometer value={summary.openActions} />
          </span>
          <span className="fsub">
            across <b>{summary.totalMeetings}</b> meetings
          </span>
        </Link>

        <Link to="/overdue" className="fig late ah">
          <span className="flab eyebrow">
            <AnimatedIcon name="flame" loop={summary.overdueActions > 0} />
            Overdue
          </span>
          <span className="fnum">
            <Odometer value={summary.overdueActions} />
          </span>
          <span className="fsub">
            {summary.overdueActions > 0 ? (
              <>
                oldest is <b>{summary.oldestOverdueDays} days</b> late
              </>
            ) : (
              'nothing is late'
            )}
          </span>
        </Link>

        <div className="fig">
          <span className="flab eyebrow">
            <AnimatedIcon name="check" />
            Completion
          </span>
          <span className="fnum">
            <Odometer value={summary.completionRate} suffix="%" />
          </span>
          <Ruler rate={summary.completionRate} />
        </div>

        <Link to="/decisions" className="fig dec ah">
          <span className="flab eyebrow">
            <AnimatedIcon name="bulb" />
            Decisions without tasks
          </span>
          <span className="fnum">
            <Odometer value={summary.pendingDecisions} />
          </span>
          <span className="fsub">waiting for an owner</span>
        </Link>
      </section>

      <div className="cols">
        <Section
          tone="late"
          index={1}
          title="Overdue"
          count={overdueList.length}
          hotDot={overdueList.length > 0}
          note="Open actions past their due date, oldest first."
          right={
            <Link to="/overdue" className="link ah">
              <span>All overdue</span>
              <AnimatedIcon name="arrow" />
            </Link>
          }
        >
          {overdueQuery.isLoading ? (
            <SkeletonRows count={3} />
          ) : overdueList.length > 0 ? (
            overdueList
              .slice(0, 4)
              .map((a, i) => (
                <ActionRow key={a.id} action={a} index={i + 2} onToggle={handleToggleAction} />
              ))
          ) : (
            <EmptyState
              title="Nothing overdue"
              description="Every open action is inside its due date."
            />
          )}
        </Section>

        <Section
          tone="dec"
          index={2}
          title="No owner yet"
          count={pendingDecisions.length}
          note="Decisions logged in a meeting that never became a task."
          right={
            <Link to="/decisions" className="link ah">
              <span>Inbox</span>
              <AnimatedIcon name="arrow" />
            </Link>
          }
        >
          {unconvertedQuery.isLoading ? (
            <SkeletonRows count={3} />
          ) : pendingDecisions.length > 0 ? (
            pendingDecisions
              .slice(0, 3)
              .map((d, i) => (
                <DecisionRow
                  key={d.id}
                  decision={d}
                  index={i + 3}
                  onConvert={(dec, cardEl) => onConvertDecision?.(dec, cardEl)}
                  onDismiss={handleDismissDecision}
                />
              ))
          ) : (
            <EmptyState
              title="Every decision has an owner"
              description="New decisions that need follow-up land here."
            />
          )}
        </Section>
      </div>

      <div className="cols even">
        <Section index={6} title="Completed per week" right={<Tag>8 weeks</Tag>}>
          <Sparkline values={velocityValues} />
          <div className="caption">Last 8 weeks · dot marks this week</div>
        </Section>

        <Section index={7} title="Late, by owner">
          <BarList items={ownerBars} />
        </Section>
      </div>

      <Section
        index={8}
        title="Coming up"
        right={
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setNewMeetingOpen(true)}>
            Schedule
          </Button>
        }
      >
        {upcomingQuery.isLoading ? (
          <SkeletonRows count={2} />
        ) : upcomingMeetings.length > 0 ? (
          upcomingMeetings.map((m, i) => <MeetingRow key={m.id} meeting={m} index={i + 9} />)
        ) : (
          <p className="muted">Nothing scheduled.</p>
        )}
      </Section>
    </div>
  );
}
