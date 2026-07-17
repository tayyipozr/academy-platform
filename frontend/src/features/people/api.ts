import { apiRequest } from "@/lib/api/api-client";

import type {
  AssignableAccount,
  AssignableAccountRole,
} from "./types";

export function getAssignableAccounts(
  role: AssignableAccountRole,
): Promise<AssignableAccount[]> {
  const query = new URLSearchParams({
    role,
  });

  return apiRequest<AssignableAccount[]>(
    `/accounts/assignable?${query.toString()}`,
  );
}
