import type { ActionDTO, DecisionDTO, MeetingDTO, MemberDTO } from './api';
import type {
  ActionItemView,
  DecisionItemView,
  MeetingItemView,
  MemberView,
} from '../components/ui/primitives';

export function toMemberView(m: MemberDTO | undefined, fallbackId = 'unknown'): MemberView {
  if (!m) {
    return {
      id: fallbackId,
      name: 'Unknown',
      role: 'Team member',
      avatarHue: 180,
    };
  }
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    avatarHue: m.avatarHue,
  };
}

export function toActionView(a: ActionDTO, membersMap?: Map<string, MemberDTO>): ActionItemView {
  const ownerDto = a.owner ?? membersMap?.get(a.ownerId);
  return {
    id: a.id,
    meetingId: a.meetingId,
    meetingTitle: a.meetingTitle ?? a.meeting?.title,
    decisionId: a.decisionId,
    title: a.title,
    ownerId: a.ownerId,
    owner: toMemberView(ownerDto, a.ownerId),
    dueDate: a.dueDate,
    priority: a.priority,
    status: a.status,
    completedAt: a.completedAt,
    notes: a.description,
  };
}

export function toDecisionView(
  d: DecisionDTO,
  membersMap?: Map<string, MemberDTO>,
): DecisionItemView {
  const byDto = d.decidedBy ?? membersMap?.get(d.decidedById);
  return {
    id: d.id,
    meetingId: d.meetingId,
    meetingTitle: d.meetingTitle ?? d.meeting?.title,
    summary: d.text,
    decidedBy: d.decidedById,
    decidedByMember: toMemberView(byDto, d.decidedById),
    decidedAt: d.decidedAt,
    status: d.status,
    dismissReason: d.noActionReason,
    linkedActionCount: d.actionIds?.length ?? 0,
  };
}

export function toMeetingView(m: MeetingDTO, membersMap?: Map<string, MemberDTO>): MeetingItemView {
  const attendees: MemberView[] =
    m.attendees && m.attendees.length > 0
      ? m.attendees.map((att) => toMemberView(att, att.id))
      : m.attendeeIds.map((id) => toMemberView(membersMap?.get(id), id));

  return {
    id: m.id,
    title: m.title,
    date: m.date,
    startTime: m.startTime,
    durationMin: m.durationMin,
    attendeeIds: m.attendeeIds,
    attendees,
    agenda: m.agenda,
    totalActions: m.stats?.actions ?? 0,
    doneActions: m.stats?.doneActions ?? 0,
    overdueActions: m.stats?.overdueActions ?? 0,
    pendingDecisions: m.stats?.pendingDecisions ?? 0,
  };
}
