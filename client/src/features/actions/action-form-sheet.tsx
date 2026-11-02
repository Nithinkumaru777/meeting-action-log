import { useEffect, useState } from 'react';
import { addDaysISO, todayISO, type Priority } from '@mal/shared';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import {
  Button,
  DrawerSheet,
  PriorityPicker,
  Who,
  fmtShort,
  type DecisionItemView,
} from '../../components/ui/primitives';
import { toast } from '../../components/feedback/toast-store';
import { applyServerErrorsToForm } from '../../lib/api';
import { collapseElement, flyToCounter } from '../../lib/motion';
import { useMembersQuery } from '../members/hooks';
import {
  useConvertDecisionMutation,
  useReopenDecisionMutation,
} from '../decisions/hooks';
import {
  useCreateActionMutation,
  useDeleteActionMutation,
} from './hooks';

export interface ActionFormSheetProps {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  meetingTitle?: string;
  meetingDate?: string | Date;
  decision?: DecisionItemView | null;
  sourceCardEl?: HTMLElement | null;
  collapseSourceOnConvert?: boolean;
  onCreatedActionId?: (actionId: string) => void;
}

export function ActionFormSheet({
  open,
  onClose,
  meetingId,
  meetingTitle = 'Meeting',
  meetingDate,
  decision = null,
  sourceCardEl = null,
  collapseSourceOnConvert = false,
  onCreatedActionId,
}: ActionFormSheetProps) {
  const { data: members = [] } = useMembersQuery();
  const createActionMutation = useCreateActionMutation();
  const convertDecisionMutation = useConvertDecisionMutation();
  const deleteActionMutation = useDeleteActionMutation();
  const reopenDecisionMutation = useReopenDecisionMutation();

  const today = todayISO();
  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueDate, setDueDate] = useState(() => addDaysISO(today, 7));
  const [priority, setPriority] = useState<Priority>('medium');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [btnState, setBtnState] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setBtnState('idle');
    setTitle(decision ? decision.summary : '');
    setOwnerId('');
    setDueDate(addDaysISO(todayISO(), 7));
    setPriority('medium');
    setNotes('');
  }, [open, decision]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      nextErrors.title = 'Add a title so people know what to do.';
    } else if (trimmedTitle.length < 3) {
      nextErrors.title = 'Use at least 3 characters.';
    }
    if (!ownerId) {
      nextErrors.ownerId = 'Pick who owns this task.';
    }
    if (!dueDate) {
      nextErrors.dueDate = 'Pick a due date.';
    } else if (dueDate < today) {
      nextErrors.dueDate = 'The due date cannot be in the past.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast({ title: 'Check the highlighted fields', tone: 'err' });
      return;
    }

    const activeMeetingId = decision ? decision.meetingId : meetingId;
    const ownerMember = members.find((m) => m.id === ownerId);

    try {
      setBtnState('loading');

      if (decision) {
        const res = await convertDecisionMutation.mutateAsync({
          id: decision.id,
          input: {
            actions: [
              {
                title: trimmedTitle,
                ownerId,
                dueDate,
                priority,
                description: notes.trim() || undefined,
              },
            ],
          },
        });
        const createdAction = res.actions[0];
        setBtnState('success');
        onClose();

        const targetCounter =
          document.querySelector<HTMLElement>('.view [data-sink="open"] .fnum') ??
          document.getElementById('sideOpen');

        if (collapseSourceOnConvert && sourceCardEl) {
          collapseElement(sourceCardEl);
        }
        flyToCounter(sourceCardEl, targetCounter, 'New task');

        if (createdAction) {
          onCreatedActionId?.(createdAction.id);
        }

        toast({
          title: 'Decision turned into a task',
          body: `${ownerMember?.name ?? 'Assigned'} · due ${fmtShort(dueDate)}`,
          tone: 'ok',
          undo: () => {
            if (createdAction) {
              deleteActionMutation.mutate(createdAction.id);
            }
            reopenDecisionMutation.mutate(decision.id);
          },
        });
      } else {
        const created = await createActionMutation.mutateAsync({
          meetingId: activeMeetingId,
          input: {
            title: trimmedTitle,
            ownerId,
            dueDate,
            priority,
            status: 'open',
            description: notes.trim() || undefined,
          },
        });
        setBtnState('success');
        onClose();
        onCreatedActionId?.(created.id);

        toast({
          title: 'Action added',
          body: `${ownerMember?.name ?? 'Assigned'} · due ${fmtShort(dueDate)}`,
          tone: 'ok',
          undo: () => {
            deleteActionMutation.mutate(created.id);
          },
        });
      }
    } catch (err) {
      setBtnState('idle');
      const serverErrors: Record<string, string> = {};
      const mapped = applyServerErrorsToForm(err, (field, fErr) => {
        const cleanField = field.replace(/^actions\.\d+\./, '');
        serverErrors[cleanField] = fErr.message ?? 'Invalid value';
      });
      if (mapped) {
        setErrors(serverErrors);
        toast({ title: 'Check the highlighted fields', tone: 'err' });
      } else {
        toast({
          title: 'Could not save the task',
          body: err instanceof Error ? err.message : 'Unexpected error',
          tone: 'err',
        });
      }
    }
  };

  const eyebrowText = meetingDate
    ? `${meetingTitle} · ${fmtShort(meetingDate)}`
    : meetingTitle;

  return (
    <DrawerSheet
      open={open}
      onClose={onClose}
      eyebrow={eyebrowText}
      title={
        decision ? (
          <>
            Give this decision
            <br />
            an <em style={{ color: 'var(--fuchsia)' }}>owner</em>
          </>
        ) : (
          'New action item'
        )
      }
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="actForm"
            icon={decision ? 'sparkles' : 'plus'}
            state={btnState}
          >
            {decision ? 'Create task' : 'Add action'}
          </Button>
        </>
      }
    >
      <form
        id="actForm"
        onSubmit={handleSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
      >
        {decision && (
          <div className="quote">
            <p>{decision.summary}</p>
            <div className="ameta">
              <Who member={decision.decidedByMember} />
              <span className="mono" style={{ fontSize: '11.5px' }}>
                DECIDED {fmtShort(decision.decidedAt).toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className={`field ${errors.title ? 'err' : ''}`} id="f-title">
          <label htmlFor="aTitle">Task title</label>
          <input
            className="input"
            id="aTitle"
            maxLength={120}
            value={title}
            placeholder="What needs to happen?"
            aria-invalid={errors.title ? 'true' : undefined}
            aria-describedby={errors.title ? 'e-title' : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((p) => ({ ...p, title: '' }));
            }}
          />
          <p className="ferr" id="e-title">
            {errors.title && (
              <>
                <AnimatedIcon name="alert" />
                {errors.title}
              </>
            )}
          </p>
        </div>

        <div className={`field ${errors.ownerId ? 'err' : ''}`} id="f-owner">
          <label htmlFor="aOwner">Owner</label>
          <select
            className="select"
            id="aOwner"
            value={ownerId}
            aria-invalid={errors.ownerId ? 'true' : undefined}
            aria-describedby={errors.ownerId ? 'e-owner' : undefined}
            onChange={(e) => {
              setOwnerId(e.target.value);
              if (errors.ownerId) setErrors((p) => ({ ...p, ownerId: '' }));
            }}
          >
            <option value="">Choose an owner</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.role}
              </option>
            ))}
          </select>
          <p className="ferr" id="e-owner">
            {errors.ownerId && (
              <>
                <AnimatedIcon name="alert" />
                {errors.ownerId}
              </>
            )}
          </p>
        </div>

        <div className={`field ${errors.dueDate ? 'err' : ''}`} id="f-due">
          <label htmlFor="aDue">Due date</label>
          <input
            className="input"
            type="date"
            id="aDue"
            value={dueDate}
            min={today}
            aria-invalid={errors.dueDate ? 'true' : undefined}
            aria-describedby={errors.dueDate ? 'e-due' : undefined}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (errors.dueDate) setErrors((p) => ({ ...p, dueDate: '' }));
            }}
          />
          <span className="hint">Today or later.</span>
          <p className="ferr" id="e-due">
            {errors.dueDate && (
              <>
                <AnimatedIcon name="alert" />
                {errors.dueDate}
              </>
            )}
          </p>
        </div>

        <div className="field">
          <span className="flabel">Priority</span>
          <PriorityPicker value={priority} onChange={setPriority} name="act-pri" />
        </div>

        <div className="field">
          <label htmlFor="aNotes">Notes (optional)</label>
          <textarea
            className="textarea"
            id="aNotes"
            maxLength={500}
            placeholder="Context, links, what done looks like"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </DrawerSheet>
  );
}
