import { useMemo, useState } from 'react';
import type { DecisionStatus } from '@mal/shared';
import {
  DecisionRow,
  EmptyState,
  ErrorState,
  Masthead,
  SkeletonRows,
  Tabs,
  dateEyebrow,
  type DecisionItemView,
} from '../../components/ui/primitives';
import { toast } from '../../components/feedback/toast-store';
import { collapseElement } from '../../lib/motion';
import { toDecisionView } from '../../lib/mappers';
import { useMembersQuery } from '../members/hooks';
import {
  useDecisionsQuery,
  useDismissDecisionMutation,
  useReopenDecisionMutation,
} from './hooks';

export interface DecisionsInboxPageProps {
  onConvertDecision?: (
    decision: DecisionItemView,
    cardEl: HTMLElement | null
  ) => void;
}

export function DecisionsInboxPage({
  onConvertDecision,
}: DecisionsInboxPageProps) {
  const [tab, setTab] = useState<DecisionStatus>('pending');
  const decisionsQuery = useDecisionsQuery({ limit: 100 });
  const membersQuery = useMembersQuery();

  const dismissMutation = useDismissDecisionMutation();
  const reopenMutation = useReopenDecisionMutation();

  const membersMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof membersQuery.data>[number]>();
    for (const m of membersQuery.data ?? []) {
      map.set(m.id, m);
    }
    return map;
  }, [membersQuery.data]);

  const allDecisions = useMemo(() => {
    return (decisionsQuery.data?.data ?? []).map((d) =>
      toDecisionView(d, membersMap)
    );
  }, [decisionsQuery.data, membersMap]);

  const counts = useMemo(() => {
    return {
      pending: allDecisions.filter((d) => d.status === 'pending').length,
      converted: allDecisions.filter((d) => d.status === 'converted').length,
      'no-action': allDecisions.filter(
        (d) => d.status === 'no-action' || d.status === 'dismissed'
      ).length,
    };
  }, [allDecisions]);

  const list = useMemo(() => {
    return allDecisions
      .filter((d) => {
        if (tab === 'no-action') {
          return d.status === 'no-action' || d.status === 'dismissed';
        }
        return d.status === tab;
      })
      .sort(
        (a, b) =>
          new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime()
      );
  }, [allDecisions, tab]);

  const handleDismiss = (
    decision: DecisionItemView,
    cardEl: HTMLElement | null
  ) => {
    collapseElement(cardEl, () => {
      dismissMutation.mutate(
        { id: decision.id, input: { reason: 'No action needed' } },
        {
          onSuccess: () => {
            toast({
              title: 'Marked as no action needed',
              body: decision.summary,
              tone: 'info',
              undo: () => {
                reopenMutation.mutate(decision.id);
              },
            });
          },
        }
      );
    });
  };

  const handleReopen = (decision: DecisionItemView) => {
    reopenMutation.mutate(decision.id, {
      onSuccess: () => {
        toast({
          title: 'Decision reopened',
          body: decision.summary,
          tone: 'info',
        });
      },
    });
  };

  return (
    <div>
      <Masthead
        eyebrow={dateEyebrow()}
        title={
          <>
            Decision <em>inbox</em>
          </>
        }
        dek="Decisions that left the meeting without a task. Give each one an owner and a date, or mark it as needing no action."
      />

      <div className="toolbar">
        <Tabs<DecisionStatus>
          ariaLabel="Decision status"
          value={tab}
          onChange={setTab}
          options={[
            { key: 'pending', label: 'Without tasks', count: counts.pending },
            { key: 'converted', label: 'Converted', count: counts.converted },
            { key: 'no-action', label: 'No action', count: counts['no-action'] },
          ]}
        />
      </div>

      <section
        className={`sec ${tab === 'pending' ? 'dec' : ''}`}
        style={{ borderTop: 0, paddingTop: 0 }}
      >
        <div id="dList">
          {decisionsQuery.isLoading ? (
            <SkeletonRows count={4} />
          ) : decisionsQuery.isError ? (
            <ErrorState
              message={
                decisionsQuery.error instanceof Error
                  ? decisionsQuery.error.message
                  : 'Could not load decisions.'
              }
              onRetry={() => void decisionsQuery.refetch()}
            />
          ) : list.length > 0 ? (
            list.map((d, i) => (
              <DecisionRow
                key={d.id}
                decision={d}
                index={i}
                onConvert={(dec, cardEl) => onConvertDecision?.(dec, cardEl)}
                onDismiss={handleDismiss}
                onReopen={handleReopen}
              />
            ))
          ) : (
            <EmptyState
              title={
                tab === 'pending'
                  ? 'Every decision has an owner'
                  : 'Nothing here yet'
              }
              description={
                tab === 'pending'
                  ? 'When a meeting logs a decision without a task, it lands here.'
                  : 'Decisions move here as you work through the inbox.'
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
