import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActionCreate, ActionExtend, ActionStatus, ActionUpdate } from '@mal/shared';
import type { ActionDTO, InsightsSummaryDTO, MeetingDetailDTO } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';
import {
  createMeetingAction,
  deleteAction,
  extendActionDueDate,
  fetchActions,
  setActionStatus,
  updateAction,
  type ActionsFilter,
} from './api';

export function useActionsQuery(filters: ActionsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.actions(filters as Record<string, unknown>),
    queryFn: () => fetchActions(filters),
  });
}

export function useCreateActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: ActionCreate }) =>
      createMeetingAction(meetingId, input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.meeting(vars.meetingId) });
      void qc.invalidateQueries({ queryKey: ['actions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useUpdateActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ActionUpdate }) => updateAction(id, input),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: queryKeys.meeting(res.meetingId) });
      void qc.invalidateQueries({ queryKey: ['actions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useToggleActionStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActionStatus; meetingId?: string }) =>
      setActionStatus(id, status),
    onMutate: async ({ id, status, meetingId }) => {
      await qc.cancelQueries({ queryKey: ['insights', 'overview'] });
      const prevOverview = qc.getQueryData<InsightsSummaryDTO>(queryKeys.insightsOverview());

      if (prevOverview) {
        const deltaDone = status === 'done' ? 1 : -1;
        const nextDone = Math.max(0, prevOverview.doneActions + deltaDone);
        const nextOpen = Math.max(0, prevOverview.totalActions - nextDone);
        qc.setQueryData<InsightsSummaryDTO>(queryKeys.insightsOverview(), {
          ...prevOverview,
          doneActions: nextDone,
          openActions: nextOpen,
          completionRate:
            prevOverview.totalActions > 0
              ? Math.round((nextDone / prevOverview.totalActions) * 100)
              : 0,
        });
      }

      let prevMeeting: MeetingDetailDTO | undefined;
      if (meetingId) {
        prevMeeting = qc.getQueryData<MeetingDetailDTO>(queryKeys.meeting(meetingId));
        if (prevMeeting) {
          qc.setQueryData<MeetingDetailDTO>(queryKeys.meeting(meetingId), {
            ...prevMeeting,
            actions: prevMeeting.actions.map((a: ActionDTO) =>
              a.id === id
                ? {
                    ...a,
                    status,
                    completedAt: status === 'done' ? new Date().toISOString() : null,
                  }
                : a,
            ),
          });
        }
      }

      return { prevOverview, prevMeeting, meetingId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevOverview) {
        qc.setQueryData(queryKeys.insightsOverview(), ctx.prevOverview);
      }
      if (ctx?.meetingId && ctx.prevMeeting) {
        qc.setQueryData(queryKeys.meeting(ctx.meetingId), ctx.prevMeeting);
      }
    },
    onSettled: (res, _err, vars) => {
      const mId = res?.meetingId ?? vars.meetingId;
      if (mId) {
        void qc.invalidateQueries({ queryKey: queryKeys.meeting(mId) });
      }
      void qc.invalidateQueries({ queryKey: ['actions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useExtendActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ActionExtend }) =>
      extendActionDueDate(id, input),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: queryKeys.meeting(res.meetingId) });
      void qc.invalidateQueries({ queryKey: ['actions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useDeleteActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAction(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['actions'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}
