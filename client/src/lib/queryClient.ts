import { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  members: () => ['members'] as const,
  meetings: (filters?: Record<string, unknown>) =>
    filters ? (['meetings', filters] as const) : (['meetings'] as const),
  meeting: (id: string) => ['meeting', id] as const,
  actions: (filters?: Record<string, unknown>) =>
    filters ? (['actions', filters] as const) : (['actions'] as const),
  decisions: (filters?: Record<string, unknown>) =>
    filters ? (['decisions', filters] as const) : (['decisions'] as const),
  insightsOverview: () => ['insights', 'overview'] as const,
  insightsByOwner: () => ['insights', 'by-owner'] as const,
  insightsUnconverted: (limit?: number) =>
    ['insights', 'unconverted', limit ?? 20] as const,
  insightsVelocity: (weeks: number = 8) => ['insights', 'velocity', weeks] as const,
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: 0,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();
