import { apiRequest } from "@/lib/api/api-client";

import type {
  OperationalTerm,
  SaveTermRequest,
  TermStatus,
} from "./types";

export function getTerms(input: {
  search?: string;
  includeArchived?: boolean;
} = {}): Promise<OperationalTerm[]> {
  const query = new URLSearchParams({
    search: input.search ?? "",
    includeArchived: String(
      input.includeArchived ?? false,
    ),
  });

  return apiRequest<OperationalTerm[]>(
    `/terms?${query.toString()}`,
  );
}

export function createTerm(
  request: SaveTermRequest,
): Promise<OperationalTerm> {
  return apiRequest<OperationalTerm>("/terms", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateTerm(
  termId: string,
  request: SaveTermRequest,
): Promise<OperationalTerm> {
  return apiRequest<OperationalTerm>(
    `/terms/${termId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateTermStatus(
  termId: string,
  status: TermStatus,
): Promise<void> {
  return apiRequest<void>(
    `/terms/${termId}/status/${status}`,
    {
      method: "POST",
    },
  );
}
