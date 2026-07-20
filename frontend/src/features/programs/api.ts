import { apiRequest } from "@/lib/api/api-client";

import type {
  Program,
  ProgramStatus,
  SaveProgramRequest,
} from "./types";

export function getPrograms(input: {
  search?: string;
  includeArchived?: boolean;
} = {}): Promise<Program[]> {
  const query = new URLSearchParams({
    search: input.search ?? "",
    includeArchived: String(
      input.includeArchived ?? false,
    ),
  });

  return apiRequest<Program[]>(
    `/programs?${query.toString()}`,
  );
}

export function createProgram(
  request: SaveProgramRequest,
): Promise<Program> {
  return apiRequest<Program>("/programs", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateProgram(
  programId: string,
  request: SaveProgramRequest,
): Promise<Program> {
  return apiRequest<Program>(
    `/programs/${programId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateProgramStatus(
  programId: string,
  status: ProgramStatus,
): Promise<void> {
  return apiRequest<void>(
    `/programs/${programId}/status/${status}`,
    {
      method: "POST",
    },
  );
}
