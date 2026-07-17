import { apiRequest } from "@/lib/api/api-client";

import type {
  EmploymentStatus,
  SaveStaffRequest,
  StaffMember,
} from "./types";

export function getStaff(input: {
  search: string;
  includeArchived: boolean;
}): Promise<StaffMember[]> {
  const query = new URLSearchParams({
    search: input.search,
    includeArchived:
      input.includeArchived.toString(),
  });

  return apiRequest<StaffMember[]>(
    `/staff?${query.toString()}`,
  );
}

export function createStaff(
  request: SaveStaffRequest,
): Promise<StaffMember> {
  return apiRequest<StaffMember>("/staff", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateStaff(
  staffId: string,
  request: SaveStaffRequest,
): Promise<StaffMember> {
  return apiRequest<StaffMember>(
    `/staff/${staffId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateStaffStatus(
  staffId: string,
  status: EmploymentStatus,
): Promise<void> {
  return apiRequest<void>(
    `/staff/${staffId}/status/${status}`,
    {
      method: "POST",
    },
  );
}
