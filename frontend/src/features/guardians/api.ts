import { apiRequest } from "@/lib/api/api-client";

import type {
  Guardian,
  GuardianStatus,
  SaveGuardianRequest,
} from "./types";

export function getGuardians(input: {
  search: string;
  includeArchived: boolean;
}): Promise<Guardian[]> {
  const query = new URLSearchParams({
    search: input.search,
    includeArchived:
      input.includeArchived.toString(),
  });

  return apiRequest<Guardian[]>(
    `/guardians?${query.toString()}`,
  );
}

export function createGuardian(
  request: SaveGuardianRequest,
): Promise<Guardian> {
  return apiRequest<Guardian>("/guardians", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateGuardian(
  guardianId: string,
  request: SaveGuardianRequest,
): Promise<Guardian> {
  return apiRequest<Guardian>(
    `/guardians/${guardianId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateGuardianStatus(
  guardianId: string,
  status: GuardianStatus,
): Promise<void> {
  return apiRequest<void>(
    `/guardians/${guardianId}/status/${status}`,
    {
      method: "POST",
    },
  );
}
