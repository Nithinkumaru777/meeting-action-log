import {
  addDaysISO,
  completionRate,
  diffDaysISO,
  isoWeekKey,
  todayISO,
  type ListQueryUnconverted,
  type ListQueryWeekly,
} from '@mal/shared';
import { env } from '../config/env';
import { ActionModel } from '../models/Action';
import { DecisionModel } from '../models/Decision';
import { MeetingModel } from '../models/Meeting';
import { MemberModel } from '../models/Member';
import { serializeDoc } from '../utils/serialize';
import { toActionDTO, type ActionDTO } from './actions.service';
import type { DecisionDTO, DecisionMeetingSummary } from './decisions.service';
import type { AttendeeSummary } from './meetings.service';

export interface InsightsSummaryDTO {
  openActions: number;
  overdueActions: number;
  doneActions: number;
  totalActions: number;
  completionRate: number;
  pendingDecisions: number;
  upcomingMeetings: number;
  oldestOverdueDays: number;
  totalMeetings: number;
}

export interface OverdueOwnerGroupDTO {
  owner: AttendeeSummary;
  count: number;
  oldestDaysOverdue: number;
  actions: ActionDTO[];
}

export interface WeeklyCompletionBucketDTO {
  week: string;
  completed: number;
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

export async function getSummary(now = new Date()): Promise<InsightsSummaryDTO> {
  const today = todayISO(env.APP_TIMEZONE, now);

  const [
    totalActions,
    doneActions,
    overdueActions,
    oldestOverdueDoc,
    pendingDecisions,
    upcomingMeetings,
    totalMeetings,
  ] = await Promise.all([
    ActionModel.countDocuments({}),
    ActionModel.countDocuments({ status: 'done' }),
    ActionModel.countDocuments({ status: { $ne: 'done' }, dueDate: { $lt: today } }),
    ActionModel.findOne({ status: { $ne: 'done' }, dueDate: { $lt: today } })
      .sort({ dueDate: 1 })
      .select('dueDate'),
    DecisionModel.countDocuments({ status: 'pending' }),
    MeetingModel.countDocuments({ date: { $gte: today } }),
    MeetingModel.countDocuments({}),
  ]);

  const openActions = totalActions - doneActions;
  const oldestOverdueDays = oldestOverdueDoc
    ? Math.max(0, diffDaysISO(today, oldestOverdueDoc.dueDate))
    : 0;

  return {
    openActions,
    overdueActions,
    doneActions,
    totalActions,
    completionRate: completionRate(doneActions, totalActions),
    pendingDecisions,
    upcomingMeetings,
    oldestOverdueDays,
    totalMeetings,
  };
}

export async function getOverdueByOwner(now = new Date()): Promise<OverdueOwnerGroupDTO[]> {
  const today = todayISO(env.APP_TIMEZONE, now);
  const docs = await ActionModel.find({
    status: { $ne: 'done' },
    dueDate: { $lt: today },
  }).sort({ dueDate: 1, _id: 1 });

  if (docs.length === 0) return [];

  const [membersMap, meetingsMap] = await Promise.all([
    fetchMembersMap(docs.map((d) => String(d.ownerId))),
    fetchMeetingsMap(docs.map((d) => String(d.meetingId))),
  ]);

  const groupsMap = new Map<string, OverdueOwnerGroupDTO>();

  for (const doc of docs) {
    const ownerId = String(doc.ownerId);
    const owner = membersMap.get(ownerId) ?? {
      id: ownerId,
      name: 'Unknown Member',
      email: '',
      role: '',
      avatarHue: 200,
    };
    const meeting = meetingsMap.get(String(doc.meetingId));
    const dto = toActionDTO(doc, today, owner, meeting);

    const existing = groupsMap.get(ownerId);
    if (!existing) {
      groupsMap.set(ownerId, {
        owner,
        count: 1,
        oldestDaysOverdue: dto.daysOverdue,
        actions: [dto],
      });
    } else {
      existing.count += 1;
      if (dto.daysOverdue > existing.oldestDaysOverdue) {
        existing.oldestDaysOverdue = dto.daysOverdue;
      }
      existing.actions.push(dto);
    }
  }

  const groups = [...groupsMap.values()];
  groups.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.oldestDaysOverdue !== a.oldestDaysOverdue) {
      return b.oldestDaysOverdue - a.oldestDaysOverdue;
    }
    return a.owner.name.localeCompare(b.owner.name);
  });

  return groups;
}

export async function getUnconvertedDecisions(
  query: ListQueryUnconverted = { limit: 10 },
  now = new Date(),
): Promise<DecisionDTO[]> {
  const today = todayISO(env.APP_TIMEZONE, now);
  const docs = await DecisionModel.find({ status: 'pending' })
    .sort({ decidedAt: 1, createdAt: 1, _id: 1 })
    .limit(query.limit);

  if (docs.length === 0) return [];

  const [membersMap, meetingsMap] = await Promise.all([
    fetchMembersMap(docs.map((d) => String(d.decidedById))),
    fetchMeetingsMap(docs.map((d) => String(d.meetingId))),
  ]);

  return docs.map((d) => {
    const plain = serializeDoc(d);
    const decidedAt = String(plain.decidedAt);
    const ageDays = Math.max(0, diffDaysISO(today, decidedAt));
    const meeting = meetingsMap.get(String(plain.meetingId));
    const decidedBy = membersMap.get(String(plain.decidedById));
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
      status: 'pending',
      noActionReason: String(plain.noActionReason ?? ''),
      actionIds: ((plain.actionIds as unknown[]) ?? []).map(String),
      createdAt: plain.createdAt as Date | undefined,
      updatedAt: plain.updatedAt as Date | undefined,
    };
  });
}

export async function getWeeklyCompletion(
  query: ListQueryWeekly = { weeks: 8 },
  now = new Date(),
): Promise<WeeklyCompletionBucketDTO[]> {
  const today = todayISO(env.APP_TIMEZONE, now);
  const buckets: WeeklyCompletionBucketDTO[] = [];
  const indexByWeek = new Map<string, number>();

  for (let i = query.weeks - 1; i >= 0; i--) {
    const sampleDay = addDaysISO(today, -i * 7);
    const wk = isoWeekKey(sampleDay);
    if (!indexByWeek.has(wk)) {
      indexByWeek.set(wk, buckets.length);
      buckets.push({ week: wk, completed: 0 });
    }
  }

  const doneDocs = await ActionModel.find({
    status: 'done',
    completedAt: { $ne: null },
  }).select('completedAt');

  for (const doc of doneDocs) {
    if (!doc.completedAt) continue;
    const completedDay = todayISO(env.APP_TIMEZONE, doc.completedAt);
    const wk = isoWeekKey(completedDay);
    const idx = indexByWeek.get(wk);
    if (idx !== undefined && buckets[idx]) {
      buckets[idx].completed += 1;
    }
  }

  return buckets;
}

export const insightsService = {
  getSummary,
  getOverdueByOwner,
  getUnconvertedDecisions,
  getWeeklyCompletion,
};
