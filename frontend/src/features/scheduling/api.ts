import { apiRequest } from "@/lib/api/api-client";

import type {
  CreateSessionRequest,
  GenerateSessionsRequest,
  LessonSession,
  RescheduleSessionRequest,
  SaveScheduleRuleRequest,
  ScheduleRule,
  ScheduleRuleStatus,
  SessionFilters,
  SessionGenerationResponse,
  UpdateSessionStatusRequest,
} from "./types";

export function getScheduleRules(
  groupId: string,
  includeArchived: boolean,
): Promise<ScheduleRule[]> {
  const query = new URLSearchParams({
    includeArchived: includeArchived.toString(),
  });

  return apiRequest<ScheduleRule[]>(
    `/groups/${groupId}/schedule-rules?${query.toString()}`,
  );
}

export function createScheduleRule(
  groupId: string,
  request: SaveScheduleRuleRequest,
): Promise<ScheduleRule> {
  return apiRequest<ScheduleRule>(
    `/groups/${groupId}/schedule-rules`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function updateScheduleRule(
  groupId: string,
  ruleId: string,
  request: SaveScheduleRuleRequest,
): Promise<ScheduleRule> {
  return apiRequest<ScheduleRule>(
    `/groups/${groupId}/schedule-rules/${ruleId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateScheduleRuleStatus(
  groupId: string,
  ruleId: string,
  status: ScheduleRuleStatus,
): Promise<void> {
  return apiRequest<void>(
    `/groups/${groupId}/schedule-rules/${ruleId}/status/${status}`,
    {
      method: "POST",
    },
  );
}

export function generateSessions(
  groupId: string,
  ruleId: string,
  request: GenerateSessionsRequest,
): Promise<SessionGenerationResponse> {
  return apiRequest<SessionGenerationResponse>(
    `/groups/${groupId}/schedule-rules/${ruleId}/generate`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function getSessions(
  filters: SessionFilters = {},
): Promise<LessonSession[]> {
  const query = new URLSearchParams();

  if (filters.groupId) {
    query.set("groupId", filters.groupId);
  }

  if (filters.staffId) {
    query.set("staffId", filters.staffId);
  }

  if (filters.status) {
    query.set("status", filters.status);
  }

  if (filters.dateFrom) {
    query.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    query.set("dateTo", filters.dateTo);
  }

  return apiRequest<LessonSession[]>(
    `/sessions?${query.toString()}`,
  );
}

export function getSession(
  sessionId: string,
): Promise<LessonSession> {
  return apiRequest<LessonSession>(
    `/sessions/${sessionId}`,
  );
}

export function createManualSession(
  request: CreateSessionRequest,
): Promise<LessonSession> {
  return apiRequest<LessonSession>(
    "/sessions",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function rescheduleSession(
  sessionId: string,
  request: RescheduleSessionRequest,
): Promise<LessonSession> {
  return apiRequest<LessonSession>(
    `/sessions/${sessionId}/schedule`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateSessionStatus(
  sessionId: string,
  request: UpdateSessionStatusRequest,
): Promise<LessonSession> {
  return apiRequest<LessonSession>(
    `/sessions/${sessionId}/status`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}
