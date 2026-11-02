import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import {
  fetchInsightsSummary,
  fetchOverdueByOwner,
  fetchUnconvertedDecisions,
  fetchWeeklyCompletion,
} from './api';

export function useInsightsOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.insightsOverview(),
    queryFn: fetchInsightsSummary,
  });
}

export function useOverdueByOwnerQuery() {
  return useQuery({
    queryKey: queryKeys.insightsByOwner(),
    queryFn: fetchOverdueByOwner,
  });
}

export function useUnconvertedDecisionsQuery(limit = 20) {
  return useQuery({
    queryKey: queryKeys.insightsUnconverted(limit),
    queryFn: () => fetchUnconvertedDecisions(limit),
  });
}

export function useWeeklyVelocityQuery(weeks = 8) {
  return useQuery({
    queryKey: queryKeys.insightsVelocity(weeks),
    queryFn: () => fetchWeeklyCompletion(weeks),
  });
}
