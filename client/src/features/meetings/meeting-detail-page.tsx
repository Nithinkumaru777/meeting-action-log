import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { todayISO } from '@mal/shared';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import {
  ActionRow,
  AvatarStack,
  Button,
  DecisionRow,
  EmptyState,
  Masthead,
  Odometer,
  Section,
  SkeletonRows,
  fmtLong,
  type ActionItemView,
  type DecisionItemView,
} from '../../components/ui/primitives';
import { toast } from '../../components/feedback/toast-store';
import { toActionView, toDecisionView, toMemberView } from '../../lib/mappers';
import { useMembersQuery } from '../members/hooks';
import { useToggleActionStatusMutation } from '../actions/hooks';
import { ActionFormSheet } from '../actions/action-form-sheet';
import {
  useCreateDecisionMutation,
  useDismissDecisionMutation,
  useReopenDecisionMutation,
} from '../decisions/hooks';
import { useDeleteMeetingMutation, useMeetingDetailQuery } from './hooks';
import { MeetingFormSheet } from './meeting-form-sheet';

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detailQuery = useMeetingDetailQuery(id);
  const membersQuery = useMembersQuery();

  const createDecisionMutation = useCreateDecisionMutation();
  const dismissDecisionMutation = useDismissDecisionMutation();
  const reopenDecisionMutation = useReopenDecisionMutation();
  const toggleActionMutation = useToggleActionStatusMutation();
  const deleteMeetingMutation = useDeleteMeetingMutation();

  const [decisionText, setDecisionText] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [flashDecisionId, setFlashDecisionId] = useState<string | null>(null);
  const [flashActionId, setFlashActionId] = useState<string | null>(null);

  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [convertingDecision, setConvertingDecision] = useState<{
    decision: DecisionItemView;
    cardEl: HTMLElement | null;
  } | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const membersMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof membersQuery.data>[number]>();
    for (const m of membersQuery.data ?? []) {
      map.set(m.id, m);
    }
    return map;
  }, [membersQuery.data]);

  if (detailQuery.isLoading) {
    return (
      <div>
        <Link to="/meetings" className="back ah">
          <AnimatedIcon name="back" />
          All meetings
        </Link>
        <SkeletonRows count={5} />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div>
        <Masthead eyebrow="Not found" title="Meeting not found" dek="It may have been deleted." />
        <Link to="/meetings" className="back ah">
          <AnimatedIcon name="back" />
          All meetings
        </Link>
      </div>
    );
  }

  const meeting = detailQuery.data;
  const today = todayISO();
  const isUpcoming = meeting.date >= today;

  const attendees = (meeting.attendees ?? []).map((a) => toMemberView(a, a.id));
  const decisions = (meeting.decisions ?? []).map((d) => toDecisionView(d, membersMap));
  const actions = (meeting.actions ?? [])
    .map((a) => toActionView(a, membersMap))
    .sort((a, b) => {
      const doneDiff = Number(a.status === 'done') - Number(b.status === 'done');
      if (doneDiff !== 0) return doneDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const doneCount = actions.filter((a) => a.status === 'done').length;
  const overdueCount = actions.filter(
    (a) => a.status !== 'done' && String(a.dueDate) < today,
  ).length;
  const pendingCount = decisions.filter((d) => d.status === 'pending').length;

  const eyebrow = `${fmtLong(meeting.date).replace(/,/g, '').toUpperCase()} · ${meeting.startTime} · ${meeting.durationMin} MIN · ${isUpcoming ? 'UPCOMING' : 'HELD'}`;

  const handleLogDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = decisionText.trim();
    if (v.length < 5) {
      setDecisionError('Write the decision in at least 5 characters.');
      return;
    }
    setDecisionError(null);
    const defaultDecidedBy = meeting.attendeeIds[0] ?? membersQuery.data?.[0]?.id ?? '';
    try {
      const created = await createDecisionMutation.mutateAsync({
        meetingId: meeting.id,
        input: {
          text: v,
          decidedById: defaultDecidedBy,
        },
      });
      setDecisionText('');
      setFlashDecisionId(created.id);
      toast({
        title: 'Decision logged',
        body: 'It has no task yet, so it is in the decision inbox.',
        tone: 'info',
      });
    } catch (err) {
      toast({
        title: 'Could not log decision',
        body: err instanceof Error ? err.message : 'Unexpected error',
        tone: 'err',
      });
    }
  };

  const handleToggleAction = (action: ActionItemView) => {
    const prevStatus = action.status;
    const nextStatus = action.status === 'done' ? 'open' : 'done';
    toggleActionMutation.mutate(
      { id: action.id, status: nextStatus, meetingId: meeting.id },
      {
        onSuccess: () => {
          toast({
            title: nextStatus === 'done' ? 'Marked done' : 'Reopened',
            body: action.title,
            tone: nextStatus === 'done' ? 'ok' : 'info',
            undo: () => {
              toggleActionMutation.mutate({
                id: action.id,
                status: prevStatus,
                meetingId: meeting.id,
              });
            },
          });
        },
      },
    );
  };

  const handleDismissDecision = (decision: DecisionItemView) => {
    dismissDecisionMutation.mutate(
      { id: decision.id, input: { reason: 'No action needed' } },
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
  };

  const handleDeleteMeeting = async () => {
    try {
      await deleteMeetingMutation.mutateAsync(meeting.id);
      toast({
        title: 'Meeting deleted',
        body: meeting.title,
        tone: 'info',
      });
      navigate('/meetings');
    } catch (err) {
      toast({
        title: 'Could not delete meeting',
        body: err instanceof Error ? err.message : 'Unexpected error',
        tone: 'err',
      });
    }
  };

  return (
    <div>
      <Link to="/meetings" className="back ah">
        <AnimatedIcon name="back" />
        All meetings
      </Link>

      <Masthead
        eyebrow={eyebrow}
        title={meeting.title}
        side={
          <>
            <AvatarStack members={attendees} size="lg" />
            <span className="muted" style={{ fontSize: '13px' }}>
              {attendees.length} attendees
            </span>
            <Button variant="line" size="sm" icon="doc" onClick={() => setEditSheetOpen(true)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon="trash"
              aria-label="Delete meeting"
              onClick={() => void handleDeleteMeeting()}
            />
          </>
        }
      >
        <p className="agenda">{meeting.agenda}</p>
      </Masthead>

      <section className="figs st" style={{ '--i': 0 } as CSSProperties}>
        <div className="fig">
          <span className="eyebrow">Decisions</span>
          <span className="fnum">
            <Odometer value={decisions.length} />
          </span>
        </div>
        <div className="fig">
          <span className="eyebrow">Actions done</span>
          <span className="fnum">
            <Odometer value={doneCount} />
            <span className="osuf">/{actions.length}</span>
          </span>
        </div>
        <div className="fig late">
          <span className="eyebrow">Overdue</span>
          <span className="fnum">
            <Odometer value={overdueCount} />
          </span>
        </div>
        <div className="fig dec">
          <span className="eyebrow">Without tasks</span>
          <span className="fnum">
            <Odometer value={pendingCount} />
          </span>
        </div>
      </section>

      <div className="cols even">
        <Section tone="dec" index={1} title="Decisions">
          {decisions.length > 0 ? (
            decisions.map((d, i) => (
              <DecisionRow
                key={d.id}
                decision={d}
                index={i + 2}
                hideMeeting
                flash={d.id === flashDecisionId}
                onConvert={(dec, cardEl) => setConvertingDecision({ decision: dec, cardEl })}
                onDismiss={handleDismissDecision}
                onReopen={(dec) => reopenDecisionMutation.mutate(dec.id)}
              />
            ))
          ) : (
            <p className="muted">No decisions logged yet.</p>
          )}

          <form className="addline" id="addDecision" onSubmit={handleLogDecision} noValidate>
            <div className={`field ${decisionError ? 'err' : ''}`} id="f-dtext">
              <label htmlFor="dtext" className="sr">
                New decision
              </label>
              <input
                className="input"
                id="dtext"
                placeholder="Log a decision, e.g. Ship v1 without dark mode"
                maxLength={200}
                value={decisionText}
                aria-invalid={decisionError ? 'true' : undefined}
                aria-describedby={decisionError ? 'e-dtext' : undefined}
                onChange={(e) => {
                  setDecisionText(e.target.value);
                  if (decisionError) setDecisionError(null);
                }}
              />
              <p className="ferr" id="e-dtext">
                {decisionError && (
                  <>
                    <AnimatedIcon name="alert" />
                    {decisionError}
                  </>
                )}
              </p>
            </div>
            <Button variant="line" type="submit" icon="plus">
              Log
            </Button>
          </form>
        </Section>

        <Section
          index={2}
          title="Action items"
          right={
            <Button
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() => setActionSheetOpen(true)}
            >
              Add action
            </Button>
          }
        >
          {actions.length > 0 ? (
            actions.map((a, i) => (
              <ActionRow
                key={a.id}
                action={a}
                index={i + 3}
                hideMeeting
                flash={a.id === flashActionId}
                onToggle={handleToggleAction}
              />
            ))
          ) : (
            <EmptyState
              title="No action items yet"
              description="Add one, or convert a decision into a task."
            />
          )}
        </Section>
      </div>

      <ActionFormSheet
        open={actionSheetOpen || Boolean(convertingDecision)}
        onClose={() => {
          setActionSheetOpen(false);
          setConvertingDecision(null);
        }}
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        meetingDate={meeting.date}
        decision={convertingDecision?.decision ?? null}
        sourceCardEl={convertingDecision?.cardEl ?? null}
        collapseSourceOnConvert={false}
        onCreatedActionId={(newId) => setFlashActionId(newId)}
      />

      <MeetingFormSheet
        open={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        editingMeeting={meeting}
      />
    </div>
  );
}
