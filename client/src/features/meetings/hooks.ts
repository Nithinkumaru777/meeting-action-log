import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeetingCreate, MeetingUpdate } from '@mal/shared';
import { queryKeys } from '../../lib/queryClient';
import {
  createMeeting,
  deleteMeeting,
  fetchMeetingDetail,
  fetchMeetings,
  updateMeeting,
  type MeetingsFilter,
} from './api';

export function useMeetingsQuery(filters: MeetingsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.meetings(filters as Record<string, unknown>),
    queryFn: () => fetchMeetings(filters),
  });
}

export function useMeetingDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.meeting(id ?? ''),
    queryFn: () => fetchMeetingDetail(id!),
    enabled: Boolean(id),
  });
}

export function useCreateMeetingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeetingCreate) => createMeeting(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useUpdateMeetingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MeetingUpdate }) =>
      updateMeeting(id, input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: queryKeys.meeting(vars.id) });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useDeleteMeetingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMeeting(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['actions'] });
      void qc.invalidateQueries({ queryKey: ['decisions'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}
