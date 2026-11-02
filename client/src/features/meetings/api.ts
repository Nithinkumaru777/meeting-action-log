import type { MeetingCreate, MeetingUpdate } from '@mal/shared';
import {
  apiFetch,
  type MeetingDTO,
  type MeetingDetailDTO,
  type PaginatedResponse,
} from '../../lib/api';

export interface MeetingsFilter {
  filter?: 'all' | 'upcoming' | 'past';
  q?: string;
  attendeeId?: string;
  page?: number;
  limit?: number;
}

export async function fetchMeetings(
  filters: MeetingsFilter = {}
): Promise<PaginatedResponse<MeetingDTO>> {
  return apiFetch<PaginatedResponse<MeetingDTO>>('/meetings', {
    params: {
      filter: filters.filter ?? 'all',
      q: filters.q,
      attendeeId: filters.attendeeId,
      page: filters.page ?? 1,
      limit: filters.limit ?? 50,
    },
    rawEnvelope: true,
  });
}

export async function fetchMeetingDetail(id: string): Promise<MeetingDetailDTO> {
  return apiFetch<MeetingDetailDTO>(`/meetings/${id}`);
}

export async function createMeeting(input: MeetingCreate): Promise<MeetingDTO> {
  return apiFetch<MeetingDTO>('/meetings', {
    method: 'POST',
    body: input,
  });
}

export async function updateMeeting(
  id: string,
  input: MeetingUpdate
): Promise<MeetingDTO> {
  return apiFetch<MeetingDTO>(`/meetings/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteMeeting(id: string): Promise<void> {
  return apiFetch<void>(`/meetings/${id}`, {
    method: 'DELETE',
  });
}
