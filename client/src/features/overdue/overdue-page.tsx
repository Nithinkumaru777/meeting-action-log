import { useMemo, type CSSProperties } from 'react';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import {
  ActionRow,
  Avatar,
  EmptyState,
  ErrorState,
  Masthead,
  Odometer,
  SkeletonRows,
  dateEyebrow,
  fmtShort,
  toISODate,
  type ActionItemView,
} from '../../components/ui/primitives';
import { toast } from '../../components/feedback/toast-store';
import { collapseElement } from '../../lib/motion';
import { toActionView, toMemberView } from '../../lib/mappers';
import { useMembersQuery } from '../members/hooks';
import {
  useExtendActionMutation,
  useToggleActionStatusMutation,
  useUpdateActionMutation,
} from '../actions/hooks';
import { useInsightsOverviewQuery } from '../dashboard/hooks';
import { useOverdueByOwnerQuery } from './hooks';

export function OverduePage() {
  const overdueQuery = useOverdueByOwnerQuery();
  const overviewQuery = useInsightsOverviewQuery();
  const membersQuery = useMembersQuery();

  const toggleStatusMutation = useToggleActionStatusMutation();
  const extendActionMutation = useExtendActionMutation();
  const updateActionMutation = useUpdateActionMutation();

  const membersMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof membersQuery.data>[number]>();
    for (const m of membersQuery.data ?? []) {
      map.set(m.id, m);
    }
    return map;
  }, [membersQuery.data]);

  const groups = useMemo(() => {
    return (overdueQuery.data ?? [])
      .map((g) => ({
        member: toMemberView(g.owner, g.owner.id),
        oldestDaysOverdue: g.oldestDaysOverdue,
        actions: g.actions.map((a) => toActionView(a, membersMap)),
      }))
      .filter((g) => g.actions.length > 0)
      .sort((a, b) => b.actions.length - a.actions.length);
  }, [overdueQuery.data, membersMap]);

  const totalOverdue = groups.reduce((acc, g) => acc + g.actions.length, 0);
  const oldestDays = groups.reduce(
    (max, g) => Math.max(max, g.oldestDaysOverdue),
    0
  );
  const openActions = overviewQuery.data?.openActions ?? totalOverdue;
  const stillOnTime = Math.max(0, openActions - totalOverdue);

  const handleToggle = (action: ActionItemView) => {
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
      }
    );
  };

  const handleExtend = (action: ActionItemView, rowEl: HTMLDivElement | null) => {
    const prevDue = toISODate(action.dueDate);
    collapseElement(rowEl, () => {
      extendActionMutation.mutate(
        { id: action.id, input: { days: 3 } },
        {
          onSuccess: (updated) => {
            toast({
              title: 'Due date moved',
              body: `${action.title} → ${fmtShort(updated.dueDate)}`,
              tone: 'warn',
              undo: () => {
                updateActionMutation.mutate({
                  id: action.id,
                  input: { dueDate: prevDue },
                });
              },
            });
          },
        }
      );
    });
  };

  return (
    <div>
      <Masthead
        eyebrow={dateEyebrow()}
        title={<em>Overdue</em>}
        dek="Open actions past their due date, grouped by owner. Tick it off or give it three more days."
      />

      <section className="figs st" style={{ '--i': 0 } as CSSProperties}>
        <div className="fig late">
          <span className="flab eyebrow">
            <AnimatedIcon name="flame" loop={totalOverdue > 0} />
            Overdue actions
          </span>
          <span className="fnum">
            <Odometer value={totalOverdue} />
          </span>
        </div>
        <div className="fig late">
          <span className="flab eyebrow">
            <AnimatedIcon name="clock" />
            Oldest, days late
          </span>
          <span className="fnum">
            <Odometer value={oldestDays} />
          </span>
        </div>
        <div className="fig">
          <span className="flab eyebrow">
            <AnimatedIcon name="users" />
            Owners affected
          </span>
          <span className="fnum">
            <Odometer value={groups.length} />
          </span>
        </div>
        <div className="fig">
          <span className="flab eyebrow">
            <AnimatedIcon name="listcheck" />
            Still on time
          </span>
          <span className="fnum">
            <Odometer value={stillOnTime} />
          </span>
        </div>
      </section>

      {overdueQuery.isLoading ? (
        <SkeletonRows count={4} />
      ) : overdueQuery.isError ? (
        <ErrorState
          message={
            overdueQuery.error instanceof Error
              ? overdueQuery.error.message
              : 'Could not load overdue items.'
          }
          onRetry={() => void overdueQuery.refetch()}
        />
      ) : groups.length > 0 ? (
        groups.map((g, gi) => (
          <section
            key={g.member.id}
            className="sec late st"
            style={{ '--i': gi + 1 } as CSSProperties}
          >
            <div className="ogh">
              <Avatar member={g.member} size="lg" />
              <div>
                <h3>{g.member.name}</h3>
                <div className="eyebrow">
                  {g.member.role} · {g.actions.length} overdue
                </div>
              </div>
            </div>
            {g.actions.map((a, i) => (
              <ActionRow
                key={a.id}
                action={a}
                index={i + gi + 2}
                showQuickExtend
                loopOverdue
                onToggle={handleToggle}
                onExtend={handleExtend}
              />
            ))}
          </section>
        ))
      ) : (
        <EmptyState
          title="Nothing overdue"
          description="Every open action is inside its due date."
        />
      )}
    </div>
  );
}
