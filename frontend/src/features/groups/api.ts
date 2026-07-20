import { apiRequest } from "@/lib/api/api-client";

import type {
  AcademyGroup,
  CreateEnrollmentRequest,
  CreateGroupStaffAssignmentRequest,
  EndEnrollmentRequest,
  EndGroupStaffAssignmentRequest,
  GroupEnrollment,
  GroupEnrollmentSummary,
  GroupStaffAssignment,
  GroupStatus,
  SaveGroupRequest,
} from "./types";

export function getGroups(input: {
  search?: string;
  programId?: string;
  termId?: string;
  branchId?: string;
  includeArchived?: boolean;
} = {}): Promise<AcademyGroup[]> {
  const query = new URLSearchParams();

  query.set("search", input.search ?? "");
  query.set(
    "includeArchived",
    String(input.includeArchived ?? false),
  );

  if (input.programId) {
    query.set("programId", input.programId);
  }

  if (input.termId) {
    query.set("termId", input.termId);
  }

  if (input.branchId) {
    query.set("branchId", input.branchId);
  }

  return apiRequest<AcademyGroup[]>(
    `/groups?${query.toString()}`,
  );
}

export function createGroup(
  request: SaveGroupRequest,
): Promise<AcademyGroup> {
  return apiRequest<AcademyGroup>("/groups", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateGroup(
  groupId: string,
  request: SaveGroupRequest,
): Promise<AcademyGroup> {
  return apiRequest<AcademyGroup>(
    `/groups/${groupId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateGroupStatus(
  groupId: string,
  status: GroupStatus,
): Promise<void> {
  return apiRequest<void>(
    `/groups/${groupId}/status/${status}`,
    {
      method: "POST",
    },
  );
}

export function getGroup(
  groupId: string,
): Promise<AcademyGroup> {
  return apiRequest<AcademyGroup>(
    `/groups/${groupId}`,
  );
}

export function getGroupEnrollments(
  groupId: string,
  includeHistory: boolean,
): Promise<GroupEnrollmentSummary> {
  const query = new URLSearchParams({
    includeHistory: includeHistory.toString(),
  });

  return apiRequest<GroupEnrollmentSummary>(
    `/groups/${groupId}/enrollments?${query.toString()}`,
  );
}

export function enrollStudent(
  groupId: string,
  request: CreateEnrollmentRequest,
): Promise<GroupEnrollment> {
  return apiRequest<GroupEnrollment>(
    `/groups/${groupId}/enrollments`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function endEnrollment(
  groupId: string,
  enrollmentId: string,
  request: EndEnrollmentRequest,
): Promise<GroupEnrollment> {
  return apiRequest<GroupEnrollment>(
    `/groups/${groupId}/enrollments/${enrollmentId}/end`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function getGroupStaffAssignments(
  groupId: string,
  includeHistory: boolean,
): Promise<GroupStaffAssignment[]> {
  const query = new URLSearchParams({
    includeHistory: includeHistory.toString(),
  });

  return apiRequest<GroupStaffAssignment[]>(
    `/groups/${groupId}/staff-assignments?${query.toString()}`,
  );
}

export function assignStaffToGroup(
  groupId: string,
  request: CreateGroupStaffAssignmentRequest,
): Promise<GroupStaffAssignment> {
  return apiRequest<GroupStaffAssignment>(
    `/groups/${groupId}/staff-assignments`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function endGroupStaffAssignment(
  groupId: string,
  assignmentId: string,
  request: EndGroupStaffAssignmentRequest,
): Promise<GroupStaffAssignment> {
  return apiRequest<GroupStaffAssignment>(
    `/groups/${groupId}/staff-assignments/${assignmentId}/end`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}