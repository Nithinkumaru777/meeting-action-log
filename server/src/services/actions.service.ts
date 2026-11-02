import type { Types } from 'mongoose';
import {
  addDaysISO,
  enrichActionDerived,
  todayISO,
  validateActionDueDate,
  type ActionCreate,
  type ActionExtend,
  type ActionStatus,
  type ActionStatusBody,
  type ActionUpdate,
  type DueState,
  type ListQueryActions,
  type ListQueryMeetingActions,
  type Priority,
} from '@mal/shared';
import { env } from '../config/env';
import { ActionModel, type IAction } from '../models/Action';
import { DecisionModel } from '../models/Decision';
import { MeetingModel } from '../models/Meeting';
import { MemberModel } from '../models/Member';
import { ApiError, type ErrorDetail } from '../utils/ApiError';
import { buildPaginationMeta, skipFor } from '../utils/pagination';
import { serializeDoc } from '../utils/serialize';
import type { DecisionMeetingSummary } from './decisions.service';
import type { AttendeeSummary } from './meetings.service';

export interface ActionDTO {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  meeting?: DecisionMeetingSummary;
  decisionId: string | null;
  title: string;
  description: string;
  ownerId: string;
  owner?: AttendeeSummary;
  dueDate: string;
  priority: Priority;
  status: ActionStatus;
  completedAt: Date | null;
  isOverdue: boolean;
  daysOverdue: number;
  dueState: DueState;
  createdAt?: Date;
  updatedAt?: Date;
}

const PRIORITY_RANK: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

export function toActionDTO(
  doc: IAction & { _id?: unknown },
  today: string,
  owner?: AttendeeSummary,
  meeting?: DecisionMeetingSummary,
): ActionDTO {
  const plain = serializeDoc(doc);
  const base = {
    id: String(plain.id),
    meetingId: String(plain.meetingId),
    ...(meeting ? { meetingTitle: meeting.title, meeting } : {}),
    decisionId: plain.decisionId ? String(plain.decisionId) : null,
    title: String(plain.title),
    description: String(plain.description ?? ''),
    ownerId: String(plain.ownerId),
    ...(owner ? { owner } : {}),
    dueDate: String(plain.dueDate),
    priority: plain.priority as Priority,
    status: plain.status as ActionStatus,
    completedAt: (plain.completedAt as Date | null) ?? null,
    createdAt: plain.createdAt as Date | undefined,
    updatedAt: plain.updatedAt as Date | undefined,
  };
  return enrichActionDerived(base, today);
}

export async function create(
  meetingId: string,
  input: ActionCreate,
  now = new Date(),
): Promise<ActionDTO> {
  const meeting = await MeetingModel.findById(meetingId);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found.');
  }

  const today = todayISO(env.APP_TIMEZONE, now);
  const details: ErrorDetail[] = [];

  const owner = await MemberModel.findById(input.ownerId);
  if (!owner) {
    details.push({ path: 'ownerId', message: 'Pick who owns this task.' });
  }

  const dueErr = validateActionDueDate(input.dueDate, today, meeting.date);
  if (dueErr) {
    details.push({ path: 'dueDate', message: dueErr });
  }

  if (details.length > 0) {
    throw ApiError.validation('Check the highlighted fields.', details);
  }

  let decisionDoc = null;
  if (input.decisionId) {
    decisionDoc = await DecisionModel.findById(input.decisionId);
    if (!decisionDoc || String(decisionDoc.meetingId) !== String(meeting._id)) {
      throw ApiError.notFound('Decision not found in this meeting.');
    }
    if (decisionDoc.status === 'no-action') {
      throw ApiError.conflict('This decision was marked as no action needed. Reopen it first.');
    }
  }

  const status = input.status ?? 'open';
  const created = await ActionModel.create({
    meetingId: meeting._id,
    decisionId: decisionDoc ? decisionDoc._id : null,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    ownerId: owner!._id,
    dueDate: input.dueDate,
    priority: input.priority ?? 'medium',
    status,
    completedAt: status === 'done' ? now : null,
  });

  if (decisionDoc) {
    if (!decisionDoc.actionIds.some((id) => String(id) === String(created._id))) {
      decisionDoc.actionIds.push(created._id);
    }
    decisionDoc.status = 'converted';
    await decisionDoc.save();
  }

  const ownerPlain = serializeDoc(owner!);
  return toActionDTO(
    created,
    today,
    {
      id: String(ownerPlain.id),
      name: String(ownerPlain.name),
      email: String(ownerPlain.email),
      role: String(ownerPlain.role ?? ''),
      avatarHue: Number(ownerPlain.avatarHue),
    },
    {
      id: String(meeting._id),
      title: meeting.title,
      date: meeting.date,
    },
  );
}

export async function listByMeeting(
  meetingId: string,
  query: ListQueryMeetingActions = {},
  now = new Date(),
): Promise<ActionDTO[]> {
  const meeting = await MeetingModel.findById(meetingId);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found.');
  }

  const filter: Record<string, unknown> = { meetingId: meeting._id };
  if (query.status && query.status.length > 0) {
    filter.status = { $in: query.status };
  }

  const docs = await ActionModel.find(filter).sort({ dueDate: 1, createdAt: 1, _id: 1 });
  const membersMap = await fetchMembersMap(docs.map((a) => String(a.ownerId)));
  const today = todayISO(env.APP_TIMEZONE, now);
  const meetingSummary: DecisionMeetingSummary = {
    id: String(meeting._id),
    title: meeting.title,
    date: meeting.date,
  };

  return docs.map((a) => toActionDTO(a, today, membersMap.get(String(a.ownerId)), meetingSummary));
}

export async function list(
  query: ListQueryActions,
  now = new Date(),
): Promise<{
  data: ActionDTO[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const today = todayISO(env.APP_TIMEZONE, now);
  const conditions: Record<string, unknown>[] = [];

  if (query.status && query.status.length > 0) {
    conditions.push({ status: { $in: query.status } });
  }
  if (query.ownerId) {
    conditions.push({ ownerId: query.ownerId });
  }
  if (query.meetingId) {
    conditions.push({ meetingId: query.meetingId });
  }
  if (query.decisionId) {
    conditions.push({ decisionId: query.decisionId });
  }

  if (query.overdue === true) {
    conditions.push({ status: { $ne: 'done' }, dueDate: { $lt: today } });
  } else if (query.overdue === false) {
    conditions.push({
      $or: [{ status: 'done' }, { dueDate: { $gte: today } }],
    });
  }

  if (query.dueFrom) {
    conditions.push({ dueDate: { $gte: query.dueFrom } });
  }
  if (query.dueTo) {
    conditions.push({ dueDate: { $lte: query.dueTo } });
  }

  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    conditions.push({
      $or: [{ title: rx }, { description: rx }],
    });
  }

  const filter = conditions.length > 0 ? { $and: conditions } : {};

  const total = await ActionModel.countDocuments(filter);

  let docs: IAction[];
  if (query.sort === 'priority') {
    const allMatching = await ActionModel.find(filter).sort({ dueDate: 1, _id: 1 });
    allMatching.sort((a, b) => {
      const diff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (diff !== 0) return diff;
      return a.dueDate.localeCompare(b.dueDate);
    });
    const start = skipFor(query);
    docs = allMatching.slice(start, start + query.limit);
  } else {
    let sortSpec: Record<string, 1 | -1> = { dueDate: 1, _id: 1 };
    if (query.sort === '-dueDate') {
      sortSpec = { dueDate: -1, _id: -1 };
    } else if (query.sort === '-createdAt') {
      sortSpec = { createdAt: -1, _id: -1 };
    }
    docs = await ActionModel.find(filter).sort(sortSpec).skip(skipFor(query)).limit(query.limit);
  }

  const [membersMap, meetingsMap] = await Promise.all([
    fetchMembersMap(docs.map((d) => String(d.ownerId))),
    fetchMeetingsMap(docs.map((d) => String(d.meetingId))),
  ]);

  const data = docs.map((d) =>
    toActionDTO(d, today, membersMap.get(String(d.ownerId)), meetingsMap.get(String(d.meetingId))),
  );

  return {
    data,
    meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
}

export async function get(id: string, now = new Date()): Promise<ActionDTO> {
  const doc = await ActionModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Action not found.');
  }
  const [membersMap, meetingsMap] = await Promise.all([
    fetchMembersMap([String(doc.ownerId)]),
    fetchMeetingsMap([String(doc.meetingId)]),
  ]);
  const today = todayISO(env.APP_TIMEZONE, now);
  return toActionDTO(
    doc,
    today,
    membersMap.get(String(doc.ownerId)),
    meetingsMap.get(String(doc.meetingId)),
  );
}

export async function update(
  id: string,
  patch: ActionUpdate,
  now = new Date(),
): Promise<ActionDTO> {
  const doc = await ActionModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Action not found.');
  }

  const meeting = await MeetingModel.findById(doc.meetingId);
  const today = todayISO(env.APP_TIMEZONE, now);
  const details: ErrorDetail[] = [];

  if (patch.ownerId !== undefined) {
    const ownerExists = await MemberModel.exists({ _id: patch.ownerId });
    if (!ownerExists) {
      details.push({ path: 'ownerId', message: 'Pick who owns this task.' });
    }
  }

  if (patch.dueDate !== undefined) {
    const dueErr = validateActionDueDate(patch.dueDate, today, meeting?.date);
    if (dueErr) {
      details.push({ path: 'dueDate', message: dueErr });
    }
  }

  if (details.length > 0) {
    throw ApiError.validation('Check the highlighted fields.', details);
  }

  if (patch.title !== undefined) doc.title = patch.title.trim();
  if (patch.description !== undefined) doc.description = patch.description.trim();
  if (patch.ownerId !== undefined) {
    doc.ownerId = patch.ownerId as unknown as Types.ObjectId;
  }
  if (patch.dueDate !== undefined) doc.dueDate = patch.dueDate;
  if (patch.priority !== undefined) doc.priority = patch.priority;
  if (patch.status !== undefined) {
    if (patch.status === 'done' && doc.status !== 'done') {
      doc.completedAt = now;
    } else if (patch.status !== 'done') {
      doc.completedAt = null;
    }
    doc.status = patch.status;
  }

  await doc.save();
  return get(id, now);
}

export async function setStatus(
  id: string,
  body: ActionStatusBody,
  now = new Date(),
): Promise<ActionDTO> {
  const doc = await ActionModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Action not found.');
  }

  if (body.status === 'done') {
    if (doc.status !== 'done' || !doc.completedAt) {
      doc.completedAt = now;
    }
  } else {
    doc.completedAt = null;
  }
  doc.status = body.status;

  await doc.save();
  return get(id, now);
}

export async function extend(id: string, body: ActionExtend, now = new Date()): Promise<ActionDTO> {
  const doc = await ActionModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Action not found.');
  }

  if (doc.status === 'done') {
    throw ApiError.conflict('Completed actions cannot be extended.');
  }

  const today = todayISO(env.APP_TIMEZONE, now);
  const base = doc.dueDate > today ? doc.dueDate : today;
  doc.dueDate = addDaysISO(base, body.days);

  await doc.save();
  return get(id, now);
}

export async function remove(id: string): Promise<void> {
  const doc = await ActionModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Action not found.');
  }

  const decisionId = doc.decisionId;
  await ActionModel.deleteOne({ _id: doc._id });

  if (decisionId) {
    const decision = await DecisionModel.findById(decisionId);
    if (decision) {
      decision.actionIds = decision.actionIds.filter((aid) => String(aid) !== String(doc._id));
      const remaining = await ActionModel.countDocuments({ decisionId: decision._id });
      if (decision.actionIds.length === 0 && remaining === 0 && decision.status === 'converted') {
        decision.status = 'pending';
      }
      await decision.save();
    }
  }
}

export const actionsService = {
  create,
  listByMeeting,
  list,
  get,
  update,
  setStatus,
  extend,
  remove,
};
