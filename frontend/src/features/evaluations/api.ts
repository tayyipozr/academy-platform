import { apiRequest } from "@/lib/api/api-client";

import type {
  EvaluationCriterion,
  EvaluationTemplate,
  EvaluationTemplateStatus,
  SaveEvaluationCriterionRequest,
  SaveEvaluationTemplateRequest,
} from "./types";

export function getEvaluationTemplates(
  input: {
    search?: string;
    programId?: string;
    includeArchived?: boolean;
  } = {},
): Promise<EvaluationTemplate[]> {
  const query = new URLSearchParams({
    search: input.search ?? "",
    includeArchived: String(
      input.includeArchived ?? false,
    ),
  });

  if (input.programId) {
    query.set("programId", input.programId);
  }

  return apiRequest<EvaluationTemplate[]>(
    `/evaluation-templates?${query.toString()}`,
  );
}

export function getEvaluationTemplate(
  templateId: string,
): Promise<EvaluationTemplate> {
  return apiRequest<EvaluationTemplate>(
    `/evaluation-templates/${templateId}`,
  );
}

export function createEvaluationTemplate(
  request: SaveEvaluationTemplateRequest,
): Promise<EvaluationTemplate> {
  return apiRequest<EvaluationTemplate>(
    "/evaluation-templates",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function updateEvaluationTemplate(
  templateId: string,
  request: SaveEvaluationTemplateRequest,
): Promise<EvaluationTemplate> {
  return apiRequest<EvaluationTemplate>(
    `/evaluation-templates/${templateId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function updateEvaluationTemplateStatus(
  templateId: string,
  status: EvaluationTemplateStatus,
): Promise<void> {
  return apiRequest<void>(
    `/evaluation-templates/${templateId}/status/${status}`,
    {
      method: "POST",
    },
  );
}

export function getEvaluationCriteria(
  templateId: string,
): Promise<EvaluationCriterion[]> {
  return apiRequest<EvaluationCriterion[]>(
    `/evaluation-templates/${templateId}/criteria`,
  );
}

export function createEvaluationCriterion(
  templateId: string,
  request: SaveEvaluationCriterionRequest,
): Promise<EvaluationCriterion> {
  return apiRequest<EvaluationCriterion>(
    `/evaluation-templates/${templateId}/criteria`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function updateEvaluationCriterion(
  templateId: string,
  criterionId: string,
  request: SaveEvaluationCriterionRequest,
): Promise<EvaluationCriterion> {
  return apiRequest<EvaluationCriterion>(
    `/evaluation-templates/${templateId}/criteria/${criterionId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}
