import type { MemberCreate, MemberUpdate } from '@mal/shared';
import { apiFetch, type MemberDTO, type PaginatedResponse } from '../../lib/api';

export async function fetchMembers(): Promise<MemberDTO[]> {
  const res = await apiFetch<MemberDTO[] | PaginatedResponse<MemberDTO>>('/members', {
    params: { limit: 100 },
    rawEnvelope: true,
  });
  if (Array.isArray(res)) return res;
  return res.data ?? [];
}

export async function createMember(input: MemberCreate): Promise<MemberDTO> {
  return apiFetch<MemberDTO>('/members', {
    method: 'POST',
    body: input,
  });
}

export async function updateMember(id: string, input: MemberUpdate): Promise<MemberDTO> {
  return apiFetch<MemberDTO>(`/members/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteMember(id: string): Promise<void> {
  return apiFetch<void>(`/members/${id}`, {
    method: 'DELETE',
  });
}
