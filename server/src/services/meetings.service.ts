import type { Types } from 'mongoose';
import {
  diffDaysISO,
  enrichActionDerived,
  todayISO,
  type DueState,
  type ListQueryMeetings,
  type MeetingCreate,
  type MeetingUpdate,
} from '@mal/shared';
import { env } from '../config/env';
import { ActionModel } from '../models/Action';
import { DecisionModel } from '../models/Decision';
import { MeetingModel, type IMeeting } from '../models/Meeting';
import { MemberModel } from '../models/Member';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, skipFor } from '../utils/pagination';
import { serializeDoc } from '../utils/serialize';

export interface MeetingStats {
  decisions: number;
  pendingDecisions: number;
  actions: number;
  doneActions: number;
  overdueActions: number;
}

export interface AttendeeSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarHue: number;
}

export interface MeetingDTO {
  id: string;
  title: string;
  date: string;
  startTime: string;
  durationMin: number;
  attendeeIds: string[];
  attendees?: AttendeeSummary[];
  agenda: string;
  notes: string;
  tags: string[];
  stats: MeetingStats;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MeetingDetailDecisionDTO {
  id: string;
  meetingId: string;
  text: string;
  rationale: string;
  decidedById: string;
  decidedBy?: AttendeeSummary;
  decidedAt: string;
  ageDays: number;
  status: 'pending' | 'converted' | 'no-action';
  noActionReason: string;
  actionIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MeetingDetailActionDTO {
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

export interface MeetingDetailDTO extends MeetingDTO {
  attendees: AttendeeSummary[];
  decisions: MeetingDetailDecisionDTO[];
  actions: MeetingDetailActionDTO[];
}

const ZERO_STATS: MeetingStats = {
  decisions: 0,
  pendingDecisions: 0,
  actions: 0,
  doneActions: 0,
  overdueActions: 0,
};

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function ensureAttendeesExist(attendeeIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(attendeeIds.map((id) => id.toLowerCase()))];
  const foundCount = await MemberModel.countDocuments({ _id: { $in: uniqueIds } });
  if (foundCount !== uniqueIds.length) {
    throw ApiError.validation('Check the highlighted fields.', [
      {
        path: 'attendeeIds',
        message: 'One or more selected attendees do not exist.',
      },
    ]);
  }
}

async function computeStatsByMeetingIds(
  meetingIds: Types.ObjectId[],
  today: string,
): Promise<Map<string, MeetingStats>> {
  const map = new Map<string, MeetingStats>();
  if (meetingIds.length === 0) return map;

  for (const id of meetingIds) {
    map.set(String(id), { ...ZERO_STATS });
  }

  const [decisionRows, actionRows] = await Promise.all([
    DecisionModel.aggregate<{
      _id: Types.ObjectId;
      decisions: number;
      pendingDecisions: number;
    }>([
      { $match: { meetingId: { $in: meetingIds } } },
      {
        $group: {
          _id: '$meetingId',
          decisions: { $sum: 1 },
          pendingDecisions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
        },
      },
    ]),
    ActionModel.aggregate<{
      _id: Types.ObjectId;
      actions: number;
      doneActions: number;
      overdueActions: number;
    }>([
      { $match: { meetingId: { $in: meetingIds } } },
      {
        $group: {
          _id: '$meetingId',
          actions: { $sum: 1 },
          doneActions: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] },
          },
          overdueActions: {
            $sum: {
              $cond: [
                {
                  $and: [{ $ne: ['$status', 'done'] }, { $lt: ['$dueDate', today] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  for (const d of decisionRows) {
    const cur = map.get(String(d._id)) ?? { ...ZERO_STATS };
    cur.decisions = d.decisions;
    cur.pendingDecisions = d.pendingDecisions;
    map.set(String(d._id), cur);
  }

  for (const a of actionRows) {
    const cur = map.get(String(a._id)) ?? { ...ZERO_STATS };
    cur.actions = a.actions;
    cur.doneActions = a.doneActions;
    cur.overdueActions = a.overdueActions;
    map.set(String(a._id), cur);
  }

  return map;
}

async function fetchMembersMap(ids: string[]): Promise<Map<string, AttendeeSummary>> {
  const uniqueIds = [...new Set(ids)];
  const map = new Map<string, AttendeeSummary>();
  if (uniqueIds.length === 0) return map;
  const members = await MemberModel.find({ _id: { $in: uniqueIds } });
  for (const m of members) {
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

function toMeetingDTO(
  doc: IMeeting & { _id?: unknown },
  stats: MeetingStats = { ...ZERO_STATS },
  attendees?: AttendeeSummary[],
): MeetingDTO {
  const plain = serializeDoc(doc);
  const attendeeIds = ((plain.attendeeIds as unknown[]) ?? []).map(String);
  return {
    id: String(plain.id),
    title: String(plain.title),
    date: String(plain.date),
    startTime: String(plain.startTime),
    durationMin: Number(plain.durationMin),
    attendeeIds,
    ...(attendees ? { attendees } : {}),
    agenda: String(plain.agenda ?? ''),
    notes: String(plain.notes ?? ''),
    tags: ((plain.tags as unknown[]) ?? []).map(String),
    stats,
    createdAt: plain.createdAt as Date | undefined,
    updatedAt: plain.updatedAt as Date | undefined,
  };
}

export async function create(input: MeetingCreate, now = new Date()): Promise<MeetingDTO> {
  await ensureAttendeesExist(input.attendeeIds);

  const created = await MeetingModel.create({
    title: input.title.trim(),
    date: input.date,
    startTime: input.startTime,
    durationMin: input.durationMin,
    attendeeIds: input.attendeeIds,
    agenda: input.agenda?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    tags: input.tags ?? [],
  });

  const membersMap = await fetchMembersMap(input.attendeeIds);
  const attendees = input.attendeeIds
    .map((id) => membersMap.get(id))
    .filter((m): m is AttendeeSummary => Boolean(m));

  void now;
  return toMeetingDTO(created, { ...ZERO_STATS }, attendees);
}

export async function list(
  query: ListQueryMeetings,
  now = new Date(),
): Promise<{
  data: MeetingDTO[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const today = todayISO(env.APP_TIMEZONE, now);
  const conditions: Record<string, unknown>[] = [];

  if (query.status === 'upcoming') {
    conditions.push({ date: { $gte: today } });
  } else if (query.status === 'past') {
    conditions.push({ date: { $lt: today } });
  }

  if (query.from) {
    conditions.push({ date: { $gte: query.from } });
  }
  if (query.to) {
    conditions.push({ date: { $lte: query.to } });
  }

  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    conditions.push({
      $or: [{ title: rx }, { agenda: rx }, { notes: rx }, { tags: rx }],
    });
  }

  const filter = conditions.length > 0 ? { $and: conditions } : {};

  let sortSpec: Record<string, 1 | -1> = { date: -1, startTime: -1, _id: -1 };
  if (query.sort === 'date') {
    sortSpec = { date: 1, startTime: 1, _id: 1 };
  } else if (query.sort === 'title') {
    sortSpec = { title: 1, _id: 1 };
  }

  const [total, docs] = await Promise.all([
    MeetingModel.countDocuments(filter),
    MeetingModel.find(filter).sort(sortSpec).skip(skipFor(query)).limit(query.limit),
  ]);

  const statsMap = await computeStatsByMeetingIds(
    docs.map((d) => d._id),
    today,
  );

  const allAttendeeIds = docs.flatMap((d) => d.attendeeIds.map(String));
  const membersMap = await fetchMembersMap(allAttendeeIds);

  const data = docs.map((d) => {
    const attendeeIds = d.attendeeIds.map(String);
    const attendees = attendeeIds
      .map((id) => membersMap.get(id))
      .filter((m): m is AttendeeSummary => Boolean(m));
    return toMeetingDTO(d, statsMap.get(String(d._id)) ?? { ...ZERO_STATS }, attendees);
  });

  return {
    data,
    meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
}

export async function getWithDetails(id: string, now = new Date()): Promise<MeetingDetailDTO> {
  const doc = await MeetingModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Meeting not found.');
  }

  const today = todayISO(env.APP_TIMEZONE, now);
  const [decisionDocs, actionDocs, statsMap] = await Promise.all([
    DecisionModel.find({ meetingId: doc._id }).sort({ decidedAt: 1, createdAt: 1, _id: 1 }),
    ActionModel.find({ meetingId: doc._id }).sort({ dueDate: 1, createdAt: 1, _id: 1 }),
    computeStatsByMeetingIds([doc._id], today),
  ]);

  const memberIds = [
    ...doc.attendeeIds.map(String),
    ...decisionDocs.map((d) => String(d.decidedById)),
    ...actionDocs.map((a) => String(a.ownerId)),
  ];
  const membersMap = await fetchMembersMap(memberIds);

  const attendees = doc.attendeeIds
    .map((aid) => membersMap.get(String(aid)))
    .filter((m): m is AttendeeSummary => Boolean(m));

  const decisions: MeetingDetailDecisionDTO[] = decisionDocs.map((d) => {
    const plain = serializeDoc(d);
    const decidedAt = String(plain.decidedAt);
    const ageDays = Math.max(0, diffDaysISO(today, decidedAt));
    const decidedById = String(plain.decidedById);
    return {
      id: String(plain.id),
      meetingId: String(plain.meetingId),
      text: String(plain.text),
      rationale: String(plain.rationale ?? ''),
      decidedById,
      decidedBy: membersMap.get(decidedById),
      decidedAt,
      ageDays,
      status: plain.status as 'pending' | 'converted' | 'no-action',
      noActionReason: String(plain.noActionReason ?? ''),
      actionIds: ((plain.actionIds as unknown[]) ?? []).map(String),
      createdAt: plain.createdAt as Date | undefined,
      updatedAt: plain.updatedAt as Date | undefined,
    };
  });

  const actions: MeetingDetailActionDTO[] = actionDocs.map((a) => {
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

  const baseMeeting = toMeetingDTO(
    doc,
    statsMap.get(String(doc._id)) ?? { ...ZERO_STATS },
    attendees,
  );

  return {
    ...baseMeeting,
    attendees,
    decisions,
    actions,
  };
}

export async function update(
  id: string,
  patch: MeetingUpdate,
  now = new Date(),
): Promise<MeetingDTO> {
  const doc = await MeetingModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Meeting not found.');
  }

  if (patch.attendeeIds !== undefined) {
    await ensureAttendeesExist(patch.attendeeIds);
    const nextSet = new Set(patch.attendeeIds.map((x) => x.toLowerCase()));
    const removedIds = doc.attendeeIds
      .map((x) => String(x).toLowerCase())
      .filter((oldId) => !nextSet.has(oldId));

    if (removedIds.length > 0) {
      const openOwnedByRemoved = await ActionModel.countDocuments({
        meetingId: doc._id,
        ownerId: { $in: removedIds },
        status: { $ne: 'done' },
      });
      if (openOwnedByRemoved > 0) {
        throw ApiError.conflict(
          'Cannot remove an attendee who still owns open actions in this meeting.',
        );
      }
    }

    doc.attendeeIds = patch.attendeeIds as unknown as Types.ObjectId[];
  }

  if (patch.title !== undefined) doc.title = patch.title.trim();
  if (patch.date !== undefined) doc.date = patch.date;
  if (patch.startTime !== undefined) doc.startTime = patch.startTime;
  if (patch.durationMin !== undefined) doc.durationMin = patch.durationMin;
  if (patch.agenda !== undefined) doc.agenda = patch.agenda.trim();
  if (patch.notes !== undefined) doc.notes = patch.notes.trim();
  if (patch.tags !== undefined) doc.tags = patch.tags;

  await doc.save();

  const today = todayISO(env.APP_TIMEZONE, now);
  const [statsMap, membersMap] = await Promise.all([
    computeStatsByMeetingIds([doc._id], today),
    fetchMembersMap(doc.attendeeIds.map(String)),
  ]);
  const attendees = doc.attendeeIds
    .map((aid) => membersMap.get(String(aid)))
    .filter((m): m is AttendeeSummary => Boolean(m));

  return toMeetingDTO(doc, statsMap.get(String(doc._id)) ?? { ...ZERO_STATS }, attendees);
}

export async function remove(id: string): Promise<void> {
  const doc = await MeetingModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Meeting not found.');
  }

  await Promise.all([
    ActionModel.deleteMany({ meetingId: doc._id }),
    DecisionModel.deleteMany({ meetingId: doc._id }),
  ]);
  await MeetingModel.deleteOne({ _id: doc._id });
}

export const meetingsService = {
  create,
  list,
  getWithDetails,
  update,
  remove,
};
