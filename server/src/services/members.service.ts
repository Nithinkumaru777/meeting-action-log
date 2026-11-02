import type { Types } from 'mongoose';
import { todayISO, type ListQueryMembers, type MemberCreate, type MemberUpdate } from '@mal/shared';
import { env } from '../config/env';
import { ActionModel } from '../models/Action';
import { MeetingModel } from '../models/Meeting';
import { MemberModel, type IMember } from '../models/Member';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, skipFor } from '../utils/pagination';
import { serializeDoc } from '../utils/serialize';

export interface MemberDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarHue: number;
  openActions: number;
  overdueActions: number;
  createdAt?: Date;
  updatedAt?: Date;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function computeCountsForMemberIds(
  memberIds: Types.ObjectId[],
  today: string,
): Promise<Map<string, { openActions: number; overdueActions: number }>> {
  const map = new Map<string, { openActions: number; overdueActions: number }>();
  if (memberIds.length === 0) return map;

  const rows = await ActionModel.aggregate<{
    _id: Types.ObjectId;
    openActions: number;
    overdueActions: number;
  }>([
    {
      $match: {
        ownerId: { $in: memberIds },
        status: { $ne: 'done' },
      },
    },
    {
      $group: {
        _id: '$ownerId',
        openActions: { $sum: 1 },
        overdueActions: {
          $sum: {
            $cond: [{ $lt: ['$dueDate', today] }, 1, 0],
          },
        },
      },
    },
  ]);

  for (const row of rows) {
    map.set(String(row._id), {
      openActions: row.openActions,
      overdueActions: row.overdueActions,
    });
  }
  return map;
}

function toMemberDTO(
  doc: IMember & { _id?: unknown },
  counts = { openActions: 0, overdueActions: 0 },
): MemberDTO {
  const plain = serializeDoc(doc);
  return {
    id: String(plain.id),
    name: String(plain.name),
    email: String(plain.email),
    role: String(plain.role ?? ''),
    avatarHue: Number(plain.avatarHue),
    openActions: counts.openActions,
    overdueActions: counts.overdueActions,
    createdAt: plain.createdAt as Date | undefined,
    updatedAt: plain.updatedAt as Date | undefined,
  };
}

export async function create(input: MemberCreate): Promise<MemberDTO> {
  const email = input.email.trim().toLowerCase();
  const existing = await MemberModel.exists({ email });
  if (existing) {
    throw ApiError.conflict('A member with this email already exists.');
  }

  const created = await MemberModel.create({
    name: input.name.trim(),
    email,
    role: input.role?.trim() ?? '',
    ...(input.avatarHue !== undefined ? { avatarHue: input.avatarHue } : {}),
  });

  return toMemberDTO(created, { openActions: 0, overdueActions: 0 });
}

export async function list(
  query: ListQueryMembers,
  now = new Date(),
): Promise<{
  data: MemberDTO[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const filter: Record<string, unknown> = {};
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { role: rx }];
  }

  const [total, docs] = await Promise.all([
    MemberModel.countDocuments(filter),
    MemberModel.find(filter).sort({ name: 1, _id: 1 }).skip(skipFor(query)).limit(query.limit),
  ]);

  const today = todayISO(env.APP_TIMEZONE, now);
  const countsMap = await computeCountsForMemberIds(
    docs.map((d) => d._id),
    today,
  );

  const data = docs.map((d) =>
    toMemberDTO(d, countsMap.get(String(d._id)) ?? { openActions: 0, overdueActions: 0 }),
  );

  return {
    data,
    meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
}

export async function get(id: string, now = new Date()): Promise<MemberDTO> {
  const doc = await MemberModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Member not found.');
  }
  const today = todayISO(env.APP_TIMEZONE, now);
  const countsMap = await computeCountsForMemberIds([doc._id], today);
  return toMemberDTO(doc, countsMap.get(String(doc._id)) ?? { openActions: 0, overdueActions: 0 });
}

export async function update(
  id: string,
  patch: MemberUpdate,
  now = new Date(),
): Promise<MemberDTO> {
  const doc = await MemberModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Member not found.');
  }

  if (patch.email !== undefined) {
    const normalizedEmail = patch.email.trim().toLowerCase();
    if (normalizedEmail !== doc.email) {
      const collision = await MemberModel.exists({
        email: normalizedEmail,
        _id: { $ne: doc._id },
      });
      if (collision) {
        throw ApiError.conflict('A member with this email already exists.');
      }
      doc.email = normalizedEmail;
    }
  }

  if (patch.name !== undefined) doc.name = patch.name.trim();
  if (patch.role !== undefined) doc.role = patch.role.trim();
  if (patch.avatarHue !== undefined) doc.avatarHue = patch.avatarHue;

  await doc.save();

  const today = todayISO(env.APP_TIMEZONE, now);
  const countsMap = await computeCountsForMemberIds([doc._id], today);
  return toMemberDTO(doc, countsMap.get(String(doc._id)) ?? { openActions: 0, overdueActions: 0 });
}

export async function remove(id: string, now = new Date()): Promise<void> {
  const doc = await MemberModel.findById(id);
  if (!doc) {
    throw ApiError.notFound('Member not found.');
  }

  const openActionsCount = await ActionModel.countDocuments({
    ownerId: doc._id,
    status: { $ne: 'done' },
  });
  if (openActionsCount > 0) {
    throw ApiError.conflict(
      'Cannot remove a member who still owns open actions. Reassign or complete them first.',
    );
  }

  const today = todayISO(env.APP_TIMEZONE, now);
  const upcomingMeetingCount = await MeetingModel.countDocuments({
    attendeeIds: doc._id,
    date: { $gte: today },
  });
  if (upcomingMeetingCount > 0) {
    throw ApiError.conflict('Cannot remove a member who is an attendee of an upcoming meeting.');
  }

  await MemberModel.deleteOne({ _id: doc._id });
}

export const membersService = {
  create,
  list,
  get,
  update,
  remove,
};
