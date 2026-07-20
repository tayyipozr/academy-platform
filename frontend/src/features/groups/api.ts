import { apiRequest } from "@/lib/api/api-client";

import type {
  AcademyGroup,
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
