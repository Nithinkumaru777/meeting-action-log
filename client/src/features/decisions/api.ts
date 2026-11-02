import type {
  DecisionConvert,
  DecisionCreate,
  DecisionDismiss,
  DecisionStatus,
  DecisionUpdate,
} from '@mal/shared';
import {
  apiFetch,
  type ActionDTO,
  type DecisionDTO,
  type PaginatedResponse,
} from '../../lib/api';

export interface DecisionsFilter {
  status?: DecisionStatus;
  meetingId?: string;
  decidedById?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export async function fetchDecisions(
  filters: DecisionsFilter = {}
): Promise<PaginatedResponse<DecisionDTO>> {
  return apiFetch<PaginatedResponse<DecisionDTO>>('/decisions', {
    params: {
      status: filters.status,
      meetingId: filters.meetingId,
      decidedById: filters.decidedById,
      q: filters.q,
      page: filters.page ?? 1,
      limit: filters.limit ?? 50,
    },
    rawEnvelope: true,
  });
}

export async function createMeetingDecision(
  meetingId: string,
  input: DecisionCreate
): Promise<DecisionDTO> {
  return apiFetch<DecisionDTO>(`/meetings/${meetingId}/decisions`, {
    method: 'POST',
    body: input,
  });
}

export async function updateDecision(
  id: string,
  input: DecisionUpdate
): Promise<DecisionDTO> {
  return apiFetch<DecisionDTO>(`/decisions/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteDecision(id: string): Promise<void> {
  return apiFetch<void>(`/decisions/${id}`, {
    method: 'DELETE',
  });
}

export interface ConvertDecisionResult {
  decision: DecisionDTO;
  actions: ActionDTO[];
}

export async function convertDecisionToAction(
  id: string,
  input: DecisionConvert
): Promise<ConvertDecisionResult> {
  return apiFetch<ConvertDecisionResult>(`/decisions/${id}/convert`, {
    method: 'POST',
    body: input,
  });
}

export async function dismissDecision(
  id: string,
  input: DecisionDismiss = {}
): Promise<DecisionDTO> {
  return apiFetch<DecisionDTO>(`/decisions/${id}/dismiss`, {
    method: 'POST',
    body: input,
  });
}

export async function reopenDecision(id: string): Promise<DecisionDTO> {
  return apiFetch<DecisionDTO>(`/decisions/${id}/reopen`, {
    method: 'POST',
  });
}
