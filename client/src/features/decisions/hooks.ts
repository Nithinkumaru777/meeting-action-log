import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DecisionConvert,
  DecisionCreate,
  DecisionDismiss,
} from '@mal/shared';
import { queryKeys } from '../../lib/queryClient';
import {
  convertDecisionToAction,
  createMeetingDecision,
  deleteDecision,
  dismissDecision,
  fetchDecisions,
  reopenDecision,
  type DecisionsFilter,
} from './api';

export function useDecisionsQuery(filters: DecisionsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.decisions(filters as Record<string, unknown>),
    queryFn: () => fetchDecisions(filters),
  });
}

export function useCreateDecisionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: DecisionCreate }) =>
      createMeetingDecision(meetingId, input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.meeting(vars.meetingId) });
      void qc.invalidateQueries({ queryKey: ['decisions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useConvertDecisionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DecisionConvert }) =>
      convertDecisionToAction(id, input),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['decisions'] });
      void qc.invalidateQueries({ queryKey: ['actions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: queryKeys.meeting(res.decision.meetingId) });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useDismissDecisionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: DecisionDismiss }) =>
      dismissDecision(id, input),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['decisions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: queryKeys.meeting(res.meetingId) });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useReopenDecisionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reopenDecision(id),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['decisions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: queryKeys.meeting(res.meetingId) });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useDeleteDecisionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDecision(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['decisions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}
