import { apiRequest } from "@/lib/api/api-client";

import type {
  Curriculum,
  CurriculumStatus,
  CurriculumUnit,
  LearningOutcome,
  SaveCurriculumRequest,
  SaveCurriculumUnitRequest,
  SaveLearningOutcomeRequest,
} from "./types";

export function getCurricula(
  input: {
    search?: string;
    programId?: string;
    includeArchived?: boolean;
  } = {},
): Promise<Curriculum[]> {
  const query = new URLSearchParams({
    search: input.search ?? "",
    includeArchived: String(
      input.includeArchived ?? false,
    ),
  });

  if (input.programId) {
    query.set("programId", input.programId);
  }

  return apiRequest<Curriculum[]>(
    `/curricula?${query.toString()}`,
  );
}

export function getCurriculum(
  curriculumId: string,
): Promise<Curriculum> {
  return apiRequest<Curriculum>(
    `/curricula/${curriculumId}`,
  );
}

export function createCurriculum(
  request: SaveCurriculumRequest,
): Promise<Curriculum> {
  return apiRequest<Curriculum>("/curricula", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function updateCurriculum(
  curriculumId: string,
  request: SaveCurriculumRequest,
): Promise<Curriculum> {
  return apiRequest<Curriculum>(
    `/curricula/${curriculumId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateCurriculumStatus(
  curriculumId: string,
  status: CurriculumStatus,
): Promise<void> {
  return apiRequest<void>(
    `/curricula/${curriculumId}/status/${status}`,
    {
      method: "POST",
    },
  );
}

export function getCurriculumUnits(
  curriculumId: string,
): Promise<CurriculumUnit[]> {
  return apiRequest<CurriculumUnit[]>(
    `/curricula/${curriculumId}/units`,
  );
}

export function createCurriculumUnit(
  curriculumId: string,
  request: SaveCurriculumUnitRequest,
): Promise<CurriculumUnit> {
  return apiRequest<CurriculumUnit>(
    `/curricula/${curriculumId}/units`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function updateCurriculumUnit(
  curriculumId: string,
  unitId: string,
  request: SaveCurriculumUnitRequest,
): Promise<CurriculumUnit> {
  return apiRequest<CurriculumUnit>(
    `/curricula/${curriculumId}/units/${unitId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function getLearningOutcomes(
  curriculumId: string,
  unitId: string,
): Promise<LearningOutcome[]> {
  return apiRequest<LearningOutcome[]>(
    `/curricula/${curriculumId}/units/${unitId}/outcomes`,
  );
}

export function createLearningOutcome(
  curriculumId: string,
  unitId: string,
  request: SaveLearningOutcomeRequest,
): Promise<LearningOutcome> {
  return apiRequest<LearningOutcome>(
    `/curricula/${curriculumId}/units/${unitId}/outcomes`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function updateLearningOutcome(
  curriculumId: string,
  unitId: string,
  outcomeId: string,
  request: SaveLearningOutcomeRequest,
): Promise<LearningOutcome> {
  return apiRequest<LearningOutcome>(
    `/curricula/${curriculumId}/units/${unitId}/outcomes/${outcomeId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}
