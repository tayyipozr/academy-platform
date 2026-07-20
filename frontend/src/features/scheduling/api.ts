import { apiRequest } from "@/lib/api/api-client";

import type {
  GenerateSessionsRequest,
  SaveScheduleRuleRequest,
  ScheduleRule,
  ScheduleRuleStatus,
  SessionGenerationResponse,
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
