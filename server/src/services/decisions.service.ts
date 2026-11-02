import type { Types } from 'mongoose';
import {
  diffDaysISO,
  enrichActionDerived,
  todayISO,
  validateActionDueDate,
  type DecisionConvert,
  type DecisionCreate,
  type DecisionDismiss,
  type DecisionStatus,
  type DecisionUpdate,
  type DueState,
  type ListQueryDecisions,
  type ListQueryMeetingDecisions,
} from '@mal/shared';
import { env } from '../config/env';
import { ActionModel, type ActionDoc } from '../models/Action';
import { DecisionModel, type IDecision } from '../models/Decision';
import { MeetingModel } from '../models/Meeting';
import { MemberModel } from '../models/Member';
import { ApiError, type ErrorDetail } from '../utils/ApiError';
import { buildPaginationMeta, skipFor } from '../utils/pagination';
import { serializeDoc } from '../utils/serialize';
import type { AttendeeSummary } from './meetings.service';

export interface DecisionMeetingSummary {
  id: string;
  title: string;
  date: string;
}

export interface DecisionDTO {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  meeting?: DecisionMeetingSummary;
  text: string;
  rationale: string;
  decidedById: string;
  decidedBy?: AttendeeSummary;
  decidedAt: string;
  ageDays: number;
  status: DecisionStatus;
  noActionReason: string;
  actionIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ConvertedActionDTO {
  id: string;
  meetingId: string;
  decisionId: string | null;
  title: string;
  description: string;
  ownerId: string;
  owner?: AttendeeSummary;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'blocked' | 'done';
  completedAt: Date | null;
  isOverdue: boolean;
  daysOverdue: number;
  dueState: DueState;
  createdAt?: Date;
  updatedAt?: Date;
}

async function fetchMembersMap(ids: string[]): Promise<Map<string, AttendeeSummary>> {
  const unique = [...new Set(ids)];
  const map = new Map<string, AttendeeSummary>();
  if (unique.length === 0) return map;
  const docs = await MemberModel.find({ _id: { $in: unique } });
  for (const m of docs) {
    const plain = serializeDoc(m);
    map.set(String(plain.id), {
      id: String(plain.id),
      name: String(plain.name),
      email: String(plain.email),
      role: String(plain.role ?? ''),
      avatarHue: Number(plain.avatarHue),
    });
  }
  return map;
}

async function fetchMeetingsMap(ids: string[]): Promise<Map<string, DecisionMeetingSummary>> {
  const unique = [...new Set(ids)];
  const map = new Map<string, DecisionMeetingSummary>();
  if (unique.length === 0) return map;
  const docs = await MeetingModel.find({ _id: { $in: unique } }).select('title date');
  for (const m of docs) {
    const plain = serializeDoc(m);
    map.set(String(plain.id), {
      id: String(plain.id),
      title: String(plain.title),
      date: String(plain.date),
    });
  }
  return map;
}

function toDecisionDTO(
  doc: IDecision & { _id?: unknown },
  today: string,
  decidedBy?: AttendeeSummary,
  meeting?: DecisionMeetingSummary,
): DecisionDTO {
  const plain = serializeDoc(doc);
  const decidedAt = String(plain.decidedAt);
  const ageDays = Math.max(0, diffDaysISO(today, decidedAt));
  return {
    id: String(plain.id),
    meetingId: String(plain.meetingId),
    ...(meeting ? { meetingTitle: meeting.title, meeting } : {}),
    text: String(plain.text),
    rationale: String(plain.rationale ?? ''),
    decidedById: String(plain.decidedById),
    ...(decidedBy ? { decidedBy } : {}),
    decidedAt,
    ageDays,
    status: plain.status as DecisionStatus,
    noActionReason: String(plain.noActionReason ?? ''),
    actionIds: ((plain.actionIds as unknown[]) ?? []).map(String),
    createdAt: plain.createdAt as Date | undefined,
    updatedAt: plain.updatedAt as Date | undefined,
  };
}

export async function create(
  meetingId: string,
  input: DecisionCreate,
  now = new Date(),
): Promise<DecisionDTO> {
  const meeting = await MeetingModel.findById(meetingId);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found.');
  }

  const decider = await MemberModel.findById(input.decidedById);
  if (!decider) {
    throw ApiError.validation('Check the highlighted fields.', [
      { path: 'decidedById', message: 'Pick who made this decision.' },
    ]);
  }

  const created = await DecisionModel.create({
    meetingId: meeting._id,
    text: input.text.trim(),
    rationale: input.rationale?.trim() ?? '',
    decidedById: decider._id,
    decidedAt: input.decidedAt ?? meeting.date,
    status: 'pending',
    noActionReason: '',
    actionIds: [],
  });

  const today = todayISO(env.APP_TIMEZONE, now);
  const deciderPlain = serializeDoc(decider);
  const meetingSummary: DecisionMeetingSummary = {
    id: String(meeting._id),
    title: meeting.title,
    date: meeting.date,
  };

  return toDecisionDTO(
    created,
    today,
    {
      id: String(deciderPlain.id),
      name: String(deciderPlain.name),
      email: String(deciderPlain.email),
      role: String(deciderPlain.role ?? ''),
      avatarHue: Number(deciderPlain.avatarHue),
    },
    meetingSummary,
  );
}

export async function listByMeeting(
  meetingId: string,
  query: ListQueryMeetingDecisions = {},
  now = new Date(),
): Promise<DecisionDTO[]> {
  const meeting = await MeetingModel.findById(meetingId);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found.');
  }

  const filter: Record<string, unknown> = { meetingId: meeting._id };
  if (query.status) {
    filter.status = query.status;
  }

  const docs = await DecisionModel.find(filter).sort({ decidedAt: 1, createdAt: 1, _id: 1 });
  const membersMap = await fetchMembersMap(docs.map((d) => String(d.decidedById)));
  const today = todayISO(env.APP_TIMEZONE, now);
  const meetingSummary: DecisionMeetingSummary = {
    id: String(meeting._id),
    title: meeting.title,
    date: meeting.date,
  };

  return docs.map((d) =>
    toDecisionDTO(d, today, membersMap.get(String(d.decidedById)), meetingSummary),
  );
}

export async function list(
  query: ListQueryDecisions,
  now = new Date(),
): Promise<{
  data: DecisionDTO[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.meetingId) filter.meetingId = query.meetingId;

  const sortDir = query.sort === 'decidedAt' ? 1 : -1;
  const sortSpec: Record<string, 1 | -1> = {
    decidedAt: sortDir,
    createdAt: sortDir,
    _id: sortDir,
  };

  const [total, docs] = await Promise.all([
    DecisionModel.countDocuments(filter),
    DecisionModel.find(filter).sort(sortSpec).skip(skipFor(query)).limit(query.limit),
  ]);

  const [membersMap, meetingsMap] = await Promise.all([
    fetchMembersMap(docs.map((d) => String(d.decidedById))),
    fetchMeetingsMap(docs.map((d) => String(d.meetingId))),
  ]);

  const today = todayISO(env.APP_TIMEZONE, now);
  const data = docs.map((d) =>
    toDecisionDTO(
      d,
      today,
      membersMap.get(String(d.decidedById)),
      meetingsMap.get(String(d.meetingId)),
    ),
  );

  return {
    data,
    meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
}

export async function get(id: string, now = new Date()): Promise<DecisionDTO> {
  const doc = await DecisionModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Decision not found.');
  }
  const [membersMap, meetingsMap] = await Promise.all([
    fetchMembersMap([String(doc.decidedById)]),
    fetchMeetingsMap([String(doc.meetingId)]),
  ]);
  const today = todayISO(env.APP_TIMEZONE, now);
  return toDecisionDTO(
    doc,
    today,
    membersMap.get(String(doc.decidedById)),
    meetingsMap.get(String(doc.meetingId)),
  );
}

export async function update(
  id: string,
  patch: DecisionUpdate,
  now = new Date(),
): Promise<DecisionDTO> {
  const doc = await DecisionModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Decision not found.');
  }

  if (patch.decidedById !== undefined) {
    const memberExists = await MemberModel.exists({ _id: patch.decidedById });
    if (!memberExists) {
      throw ApiError.validation('Check the highlighted fields.', [
        { path: 'decidedById', message: 'Pick who made this decision.' },
      ]);
    }
    doc.decidedById = patch.decidedById as unknown as Types.ObjectId;
  }

  if (patch.text !== undefined) doc.text = patch.text.trim();
  if (patch.rationale !== undefined) doc.rationale = patch.rationale.trim();

  await doc.save();
  return get(id, now);
}

export async function remove(id: string): Promise<void> {
  const doc = await DecisionModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Decision not found.');
  }

  await ActionModel.updateMany({ decisionId: doc._id }, { $set: { decisionId: null } });
  await DecisionModel.deleteOne({ _id: doc._id });
}

export async function convert(
  decisionId: string,
  input: DecisionConvert,
  now = new Date(),
): Promise<{
  decision: DecisionDTO;
  actions: ConvertedActionDTO[];
}> {
  const decision = await DecisionModel.findById(decisionId);
  if (!decision) {
    throw ApiError.notFound('Decision not found.');
  }

  if (decision.status === 'no-action') {
    throw ApiError.conflict('This decision was marked as no action needed. Reopen it first.');
  }

  const meeting = await MeetingModel.findById(decision.meetingId);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found.');
  }

  const today = todayISO(env.APP_TIMEZONE, now);
  const ownerIds = input.actions.map((a) => a.ownerId);
  const membersMap = await fetchMembersMap(ownerIds);

  const details: ErrorDetail[] = [];
  input.actions.forEach((item, idx) => {
    if (!membersMap.has(item.ownerId)) {
      details.push({
        path: `actions.${idx}.ownerId`,
        message: 'Pick who owns this task.',
      });
    }
    const dueErr = validateActionDueDate(item.dueDate, today, meeting.date);
    if (dueErr) {
      details.push({
        path: `actions.${idx}.dueDate`,
        message: dueErr,
      });
    }
  });

  if (details.length > 0) {
    throw ApiError.validation('Check the highlighted fields.', details);
  }

  const createdActions: ActionDoc[] = [];
  try {
    for (const item of input.actions) {
      const created = await ActionModel.create({
        meetingId: decision.meetingId,
        decisionId: decision._id,
        title: item.title.trim(),
        description: item.description?.trim() ?? '',
        ownerId: item.ownerId,
        dueDate: item.dueDate,
        priority: item.priority ?? 'medium',
        status: 'open',
        completedAt: null,
      });
      createdActions.push(created);
    }

    const existingIds = new Set(decision.actionIds.map(String));
    for (const a of createdActions) {
      if (!existingIds.has(String(a._id))) {
        decision.actionIds.push(a._id);
      }
    }
    decision.status = 'converted';
    decision.noActionReason = '';
    await decision.save();
  } catch (err) {
    if (createdActions.length > 0) {
      await ActionModel.deleteMany({ _id: { $in: createdActions.map((a) => a._id) } });
    }
    throw err;
  }

  const decisionDTO = await get(String(decision._id), now);
  const actionsDTO: ConvertedActionDTO[] = createdActions.map((a) => {
    const plain = serializeDoc(a);
    const ownerId = String(plain.ownerId);
    const base = {
      id: String(plain.id),
      meetingId: String(plain.meetingId),
      decisionId: plain.decisionId ? String(plain.decisionId) : null,
      title: String(plain.title),
      description: String(plain.description ?? ''),
      ownerId,
      owner: membersMap.get(ownerId),
      dueDate: String(plain.dueDate),
      priority: plain.priority as 'low' | 'medium' | 'high' | 'critical',
      status: plain.status as 'open' | 'in-progress' | 'blocked' | 'done',
      completedAt: (plain.completedAt as Date | null) ?? null,
      createdAt: plain.createdAt as Date | undefined,
      updatedAt: plain.updatedAt as Date | undefined,
    };
    return enrichActionDerived(base, today);
  });

  return {
    decision: decisionDTO,
    actions: actionsDTO,
  };
}

export async function dismiss(
  decisionId: string,
  input: DecisionDismiss = {},
  now = new Date(),
): Promise<DecisionDTO> {
  const decision = await DecisionModel.findById(decisionId);
  if (!decision) {
    throw ApiError.notFound('Decision not found.');
  }

  if (decision.status === 'converted') {
    throw ApiError.conflict('This decision already has tasks and cannot be marked as no action.');
  }

  decision.status = 'no-action';
  decision.noActionReason = input.reason?.trim() ?? '';
  await decision.save();

  return get(String(decision._id), now);
}

export async function reopen(decisionId: string, now = new Date()): Promise<DecisionDTO> {
  const decision = await DecisionModel.findById(decisionId);
  if (!decision) {
    throw ApiError.notFound('Decision not found.');
  }

  if (decision.status === 'pending') {
    throw ApiError.conflict('Decision is already open in the inbox.');
  }

  if (decision.status === 'converted') {
    const remainingActions = await ActionModel.countDocuments({ decisionId: decision._id });
    if (remainingActions > 0 || decision.actionIds.length > 0) {
      throw ApiError.conflict('Delete all linked tasks before reopening this decision.');
    }
  }

  decision.status = 'pending';
  decision.noActionReason = '';
  decision.actionIds = [];
  await decision.save();

  return get(String(decision._id), now);
}

export const decisionsService = {
  create,
  listByMeeting,
  list,
  get,
  update,
  remove,
  convert,
  dismiss,
  reopen,
};
