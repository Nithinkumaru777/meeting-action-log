import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { meetingCreateSchema, todayISO } from '@mal/shared';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import { Avatar, Button, DrawerSheet, fmtShort } from '../../components/ui/primitives';
import { toast } from '../../components/feedback/toast-store';
import { applyServerErrorsToForm, type MeetingDTO } from '../../lib/api';
import { useMembersQuery } from '../members/hooks';
import { useCreateMeetingMutation, useUpdateMeetingMutation } from './hooks';

export interface MeetingFormSheetProps {
  open: boolean;
  onClose: () => void;
  editingMeeting?: MeetingDTO | null;
}

export function MeetingFormSheet({ open, onClose, editingMeeting = null }: MeetingFormSheetProps) {
  const navigate = useNavigate();
  const { data: members = [] } = useMembersQuery();
  const createMutation = useCreateMeetingMutation();
  const updateMutation = useUpdateMeetingMutation();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => todayISO());
  const [startTime, setStartTime] = useState('10:00');
  const [durationMin, setDurationMin] = useState('30');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [agenda, setAgenda] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [btnState, setBtnState] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setBtnState('idle');
    if (editingMeeting) {
      setTitle(editingMeeting.title);
      setDate(editingMeeting.date);
      setStartTime(editingMeeting.startTime);
      setDurationMin(String(editingMeeting.durationMin));
      setAttendeeIds(editingMeeting.attendeeIds);
      setAgenda(editingMeeting.agenda);
    } else {
      setTitle('');
      setDate(todayISO());
      setStartTime('10:00');
      setDurationMin('30');
      setAttendeeIds([]);
      setAgenda('');
    }
  }, [open, editingMeeting]);

  const toggleAttendee = (id: string) => {
    setAttendeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setErrors((prev) => {
      if (!prev.attendeeIds) return prev;
      const copy = { ...prev };
      delete copy.attendeeIds;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const trimmedTitle = title.trim();
    const durNum = Number(durationMin);

    if (trimmedTitle.length < 3 || trimmedTitle.length > 100) {
      nextErrors.title = 'Give the meeting a title of 3 to 100 characters.';
    }
    if (!date) {
      nextErrors.date = 'Pick a date.';
    }
    if (!startTime) {
      nextErrors.startTime = 'Pick a start time.';
    }
    if (!Number.isFinite(durNum) || durNum < 5 || durNum > 480) {
      nextErrors.durationMin = 'Use a duration between 5 and 480 minutes.';
    }
    if (attendeeIds.length === 0) {
      nextErrors.attendeeIds = 'Add at least one attendee.';
    }

    const parsed = meetingCreateSchema.safeParse({
      title: trimmedTitle,
      date,
      startTime,
      durationMin: durNum,
      attendeeIds,
      agenda: agenda.trim() || 'No agenda yet.',
    });

    if (!parsed.success && Object.keys(nextErrors).length === 0) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'title');
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast({ title: 'Check the highlighted fields', tone: 'err' });
      return;
    }

    try {
      setBtnState('loading');
      const payload = {
        title: trimmedTitle,
        date,
        startTime,
        durationMin: durNum,
        attendeeIds,
        agenda: agenda.trim() || 'No agenda yet.',
      };

      if (editingMeeting) {
        const updated = await updateMutation.mutateAsync({
          id: editingMeeting.id,
          input: payload,
        });
        setBtnState('success');
        onClose();
        toast({
          title: 'Meeting updated',
          body: `${updated.title} · ${fmtShort(updated.date)} ${updated.startTime}`,
          tone: 'ok',
        });
      } else {
        const created = await createMutation.mutateAsync(payload);
        setBtnState('success');
        onClose();
        toast({
          title: 'Meeting logged',
          body: `${created.title} · ${fmtShort(created.date)} ${created.startTime}`,
          tone: 'ok',
        });
        navigate(`/meetings/${created.id}`);
      }
    } catch (err) {
      setBtnState('idle');
      const serverFieldErrors: Record<string, string> = {};
      const mapped = applyServerErrorsToForm(err, (field, fieldErr) => {
        serverFieldErrors[field] = fieldErr.message ?? 'Invalid value';
      });
      if (mapped) {
        setErrors(serverFieldErrors);
        toast({ title: 'Check the highlighted fields', tone: 'err' });
      } else {
        toast({
          title: 'Could not save the meeting',
          body: err instanceof Error ? err.message : 'Unexpected error',
          tone: 'err',
        });
      }
    }
  };

  return (
    <DrawerSheet
      open={open}
      onClose={onClose}
      eyebrow={editingMeeting ? 'Edit entry' : 'New entry'}
      title={editingMeeting ? 'Edit meeting' : 'Log a meeting'}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="mtForm"
            icon={editingMeeting ? 'check' : 'plus'}
            state={btnState}
          >
            {editingMeeting ? 'Save changes' : 'Create meeting'}
          </Button>
        </>
      }
    >
      <form
        id="mtForm"
        onSubmit={handleSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
      >
        <div className={`field ${errors.title ? 'err' : ''}`} id="f-mtitle">
          <label htmlFor="mTitle">Title</label>
          <input
            className="input"
            id="mTitle"
            maxLength={100}
            placeholder="e.g. Sprint 15 planning"
            value={title}
            aria-invalid={errors.title ? 'true' : undefined}
            aria-describedby={errors.title ? 'e-mtitle' : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((p) => ({ ...p, title: '' }));
            }}
          />
          <p className="ferr" id="e-mtitle">
            {errors.title && (
              <>
                <AnimatedIcon name="alert" />
                {errors.title}
              </>
            )}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className={`field ${errors.date ? 'err' : ''}`} id="f-mdate">
            <label htmlFor="mDate">Date</label>
            <input
              className="input"
              type="date"
              id="mDate"
              value={date}
              aria-invalid={errors.date ? 'true' : undefined}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors((p) => ({ ...p, date: '' }));
              }}
            />
            <p className="ferr" id="e-mdate">
              {errors.date && (
                <>
                  <AnimatedIcon name="alert" />
                  {errors.date}
                </>
              )}
            </p>
          </div>

          <div className={`field ${errors.startTime ? 'err' : ''}`} id="f-mtime">
            <label htmlFor="mTime">Start</label>
            <input
              className="input"
              type="time"
              id="mTime"
              value={startTime}
              aria-invalid={errors.startTime ? 'true' : undefined}
              onChange={(e) => {
                setStartTime(e.target.value);
                if (errors.startTime) setErrors((p) => ({ ...p, startTime: '' }));
              }}
            />
            <p className="ferr" id="e-mtime">
              {errors.startTime && (
                <>
                  <AnimatedIcon name="alert" />
                  {errors.startTime}
                </>
              )}
            </p>
          </div>
        </div>

        <div className={`field ${errors.durationMin ? 'err' : ''}`} id="f-mdur">
          <label htmlFor="mDur">Duration, minutes</label>
          <input
            className="input"
            type="number"
            id="mDur"
            value={durationMin}
            min={5}
            max={480}
            step={5}
            aria-invalid={errors.durationMin ? 'true' : undefined}
            onChange={(e) => {
              setDurationMin(e.target.value);
              if (errors.durationMin) setErrors((p) => ({ ...p, durationMin: '' }));
            }}
          />
          <p className="ferr" id="e-mdur">
            {errors.durationMin && (
              <>
                <AnimatedIcon name="alert" />
                {errors.durationMin}
              </>
            )}
          </p>
        </div>

        <div className={`field ${errors.attendeeIds ? 'err' : ''}`} id="f-matt">
          <span className="flabel" id="attL">
            Attendees
          </span>
          <div className="chips" role="group" aria-labelledby="attL">
            {members.map((m) => {
              const checked = attendeeIds.includes(m.id);
              return (
                <span className="chip" key={m.id}>
                  <input
                    type="checkbox"
                    id={`att-${m.id}`}
                    value={m.id}
                    checked={checked}
                    onChange={() => toggleAttendee(m.id)}
                  />
                  <label htmlFor={`att-${m.id}`}>
                    <Avatar member={m} />
                    {m.name}
                  </label>
                </span>
              );
            })}
          </div>
          <p className="ferr" id="e-matt">
            {errors.attendeeIds && (
              <>
                <AnimatedIcon name="alert" />
                {errors.attendeeIds}
              </>
            )}
          </p>
        </div>

        <div className="field">
          <label htmlFor="mAgenda">Agenda (optional)</label>
          <textarea
            className="textarea"
            id="mAgenda"
            maxLength={500}
            placeholder="What should this meeting decide?"
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
          />
        </div>
      </form>
    </DrawerSheet>
  );
}
