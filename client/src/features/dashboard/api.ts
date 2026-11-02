import {
  apiFetch,
  type DecisionDTO,
  type InsightsSummaryDTO,
  type OverdueOwnerGroupDTO,
  type WeeklyCompletionBucketDTO,
} from '../../lib/api';

export async function fetchInsightsSummary(): Promise<InsightsSummaryDTO> {
  return apiFetch<InsightsSummaryDTO>('/insights/summary');
}

export async function fetchOverdueByOwner(): Promise<OverdueOwnerGroupDTO[]> {
  return apiFetch<OverdueOwnerGroupDTO[]>('/insights/overdue');
}

export async function fetchUnconvertedDecisions(limit = 20): Promise<DecisionDTO[]> {
  return apiFetch<DecisionDTO[]>('/insights/unconverted-decisions', {
    params: { limit },
  });
}

export async function fetchWeeklyCompletion(weeks = 8): Promise<WeeklyCompletionBucketDTO[]> {
  return apiFetch<WeeklyCompletionBucketDTO[]>('/insights/weekly-completion', {
    params: { weeks },
  });
}
