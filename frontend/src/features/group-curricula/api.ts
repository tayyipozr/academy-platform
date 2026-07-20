import { apiRequest } from "@/lib/api/api-client";

import type {
  CreateGroupCurriculumAssignmentRequest,
  CurriculumUnitProgress,
  EndGroupCurriculumAssignmentRequest,
  GroupCurriculumAssignment,
  GroupCurriculumProgress,
  ReplaceGroupCurriculumRequest,
  UpdateCurriculumUnitProgressRequest,
} from "./types";

export function getGroupCurriculumAssignments(
  groupId: string,
  includeHistory: boolean,
): Promise<GroupCurriculumAssignment[]> {
  const query = new URLSearchParams({
    includeHistory: includeHistory.toString(),
  });

  return apiRequest<GroupCurriculumAssignment[]>(
    `/groups/${groupId}/curriculum-assignments?${query.toString()}`,
  );
}

export function assignCurriculumToGroup(
  groupId: string,
  request: CreateGroupCurriculumAssignmentRequest,
): Promise<GroupCurriculumProgress> {
  return apiRequest<GroupCurriculumProgress>(
    `/groups/${groupId}/curriculum-assignments`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function replaceGroupCurriculum(
  groupId: string,
  request: ReplaceGroupCurriculumRequest,
): Promise<GroupCurriculumProgress> {
  return apiRequest<GroupCurriculumProgress>(
    `/groups/${groupId}/curriculum-assignments/replace`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function endGroupCurriculumAssignment(
  groupId: string,
  assignmentId: string,
  request: EndGroupCurriculumAssignmentRequest,
): Promise<GroupCurriculumAssignment> {
  return apiRequest<GroupCurriculumAssignment>(
    `/groups/${groupId}/curriculum-assignments/${assignmentId}/end`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function getGroupCurriculumProgress(
  groupId: string,
  assignmentId: string,
): Promise<GroupCurriculumProgress> {
  return apiRequest<GroupCurriculumProgress>(
    `/groups/${groupId}/curriculum-assignments/${assignmentId}/progress`,
  );
}

export function updateCurriculumUnitProgress(
  groupId: string,
  assignmentId: string,
  unitId: string,
  request: UpdateCurriculumUnitProgressRequest,
): Promise<CurriculumUnitProgress> {
  return apiRequest<CurriculumUnitProgress>(
    `/groups/${groupId}/curriculum-assignments/${assignmentId}/units/${unitId}/progress`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}
