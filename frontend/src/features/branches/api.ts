import { apiRequest } from "@/lib/api/api-client";

import type {
  Branch,
  SaveBranchRequest,
} from "./types";

export function getBranches(
  includeArchived = false,
): Promise<Branch[]> {
  const query = new URLSearchParams({
    includeArchived: includeArchived.toString(),
  });

  return apiRequest<Branch[]>(
    `/branches?${query.toString()}`,
  );
}

export function createBranch(
  request: SaveBranchRequest,
): Promise<Branch> {
  return apiRequest<Branch>("/branches", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateBranch(
  branchId: string,
  request: SaveBranchRequest,
): Promise<Branch> {
  return apiRequest<Branch>(
    `/branches/${branchId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function archiveBranch(
  branchId: string,
): Promise<void> {
  return apiRequest<void>(
    `/branches/${branchId}/archive`,
    {
      method: "POST",
    },
  );
}

export function activateBranch(
  branchId: string,
): Promise<void> {
  return apiRequest<void>(
    `/branches/${branchId}/activate`,
    {
      method: "POST",
    },
  );
}
