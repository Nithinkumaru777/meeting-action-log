import type {
  ActionStatus,
  DecisionStatus,
  DueState,
  ErrorCode,
  Priority,
} from '@mal/shared';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK_ERROR';
  readonly details: ApiErrorDetail[];
  readonly requestId?: string;

  constructor(params: {
    status: number;
    code: ErrorCode | 'NETWORK_ERROR';
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details ?? [];
    this.requestId = params.requestId;
  }
}

export type FieldErrorSetter = (
  field: string,
  error: { type?: string; message?: string }
) => void;

export function applyServerErrorsToForm(
  err: unknown,
  setError: FieldErrorSetter
): boolean {
  if (!(err instanceof ApiError) || err.details.length === 0) {
    return false;
  }
  for (const detail of err.details) {
    if (detail.path) {
      setError(detail.path, { type: 'server', message: detail.message });
    }
  }
  return true;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface MemberDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarHue: number;
  openActions?: number;
  overdueActions?: number;
}

export interface MeetingStatsDTO {
  decisions: number;
  pendingDecisions: number;
  actions: number;
  doneActions: number;
  overdueActions: number;
}

export interface MeetingDTO {
  id: string;
  title: string;
  date: string;
  startTime: string;
  durationMin: number;
  attendeeIds: string[];
  attendees?: MemberDTO[];
  agenda: string;
  notes: string;
  tags: string[];
  stats: MeetingStatsDTO;
}

export interface DecisionDTO {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  meeting?: { id: string; title: string; date: string };
  text: string;
  rationale: string;
  decidedById: string;
  decidedBy?: MemberDTO;
  decidedAt: string;
  ageDays: number;
  status: DecisionStatus;
  noActionReason: string;
  actionIds: string[];
}

export interface ActionDTO {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  meeting?: { id: string; title: string; date: string };
  decisionId: string | null;
  title: string;
  description: string;
  ownerId: string;
  owner?: MemberDTO;
  dueDate: string;
  priority: Priority;
  status: ActionStatus;
  completedAt: string | Date | null;
  isOverdue: boolean;
  daysOverdue: number;
  dueState: DueState;
}

export interface MeetingDetailDTO extends MeetingDTO {
  attendees: MemberDTO[];
  decisions: DecisionDTO[];
  actions: ActionDTO[];
}

export interface InsightsSummaryDTO {
  openActions: number;
  overdueActions: number;
  doneActions: number;
  totalActions: number;
  completionRate: number;
  pendingDecisions: number;
  upcomingMeetings: number;
  oldestOverdueDays: number;
  totalMeetings: number;
}

export interface OverdueOwnerGroupDTO {
  owner: MemberDTO;
  count: number;
  oldestDaysOverdue: number;
  actions: ActionDTO[];
}

export interface WeeklyCompletionBucketDTO {
  week: string;
  completed: number;
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  rawEnvelope?: boolean;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  const normalized = path.startsWith('http')
    ? path
    : path.startsWith('/api')
      ? path
      : `/api${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return normalized;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      search.set(k, String(v));
    }
  }
  const qs = search.toString();
  return qs ? `${normalized}?${qs}` : normalized;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { params, body, rawEnvelope = false, headers, ...rest } = options;
  const url = buildUrl(path, params);

  const reqHeaders = new Headers(headers);
  if (body !== undefined && !reqHeaders.has('Content-Type')) {
    reqHeaders.set('Content-Type', 'application/json');
  }
  if (!reqHeaders.has('Accept')) {
    reqHeaders.set('Accept', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message:
        networkErr instanceof Error && networkErr.message
          ? networkErr.message
          : 'The server did not answer. Check the API is running, then try again.',
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const errObj =
      parsed &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      parsed.error &&
      typeof parsed.error === 'object'
        ? (parsed.error as {
            code?: ErrorCode;
            message?: string;
            details?: ApiErrorDetail[];
            requestId?: string;
          })
        : null;

    throw new ApiError({
      status: res.status,
      code: errObj?.code ?? 'INTERNAL',
      message: errObj?.message ?? `Request failed with status ${res.status}`,
      details: Array.isArray(errObj?.details) ? errObj.details : [],
      requestId: errObj?.requestId ?? res.headers.get('x-request-id') ?? undefined,
    });
  }

  if (rawEnvelope) {
    return parsed as T;
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    'data' in parsed &&
    !('meta' in parsed)
  ) {
    return (parsed as { data: T }).data;
  }

  return parsed as T;
}
