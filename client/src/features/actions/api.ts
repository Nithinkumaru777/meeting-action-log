import type {
  ActionCreate,
  ActionExtend,
  ActionStatus,
  ActionUpdate,
  Priority,
} from '@mal/shared';
import {
  apiFetch,
  type ActionDTO,
  type PaginatedResponse,
} from '../../lib/api';

export interface ActionsFilter {
  status?: ActionStatus;
  ownerId?: string;
  meetingId?: string;
  priority?: Priority;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export async function fetchActions(
  filters: ActionsFilter = {}
): Promise<PaginatedResponse<ActionDTO>> {
  return apiFetch<PaginatedResponse<ActionDTO>>('/actions', {
    params: {
      status: filters.status,
      ownerId: filters.ownerId,
      meetingId: filters.meetingId,
      priority: filters.priority,
      overdue: filters.overdue,
      page: filters.page ?? 1,
      limit: filters.limit ?? 50,
    },
    rawEnvelope: true,
  });
}

export async function createMeetingAction(
  meetingId: string,
  input: ActionCreate
): Promise<ActionDTO> {
  return apiFetch<ActionDTO>(`/meetings/${meetingId}/actions`, {
    method: 'POST',
    body: input,
  });
}

export async function updateAction(
  id: string,
  input: ActionUpdate
): Promise<ActionDTO> {
  return apiFetch<ActionDTO>(`/actions/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function setActionStatus(
  id: string,
  status: ActionStatus
): Promise<ActionDTO> {
  return apiFetch<ActionDTO>(`/actions/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function extendActionDueDate(
  id: string,
  input: ActionExtend = { days: 3 }
): Promise<ActionDTO> {
  return apiFetch<ActionDTO>(`/actions/${id}/extend`, {
    method: 'POST',
    body: input,
  });
}

export async function deleteAction(id: string): Promise<void> {
  return apiFetch<void>(`/actions/${id}`, {
    method: 'DELETE',
  });
}
