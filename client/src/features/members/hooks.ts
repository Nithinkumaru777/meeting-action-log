import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MemberCreate, MemberUpdate } from '@mal/shared';
import { queryKeys } from '../../lib/queryClient';
import { createMember, deleteMember, fetchMembers, updateMember } from './api';

export function useMembersQuery() {
  return useQuery({
    queryKey: queryKeys.members(),
    queryFn: fetchMembers,
  });
}

export function useCreateMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberCreate) => createMember(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useUpdateMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MemberUpdate }) => updateMember(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['actions'] });
      void qc.invalidateQueries({ queryKey: ['decisions'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useDeleteMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
