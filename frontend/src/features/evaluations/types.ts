export type EvaluationTemplateStatus =
  | "DRAFT"
  | "ACTIVE"
  | "ARCHIVED";

export type EvaluationTemplate = {
  id: string;
  programId: string;
  programCode: string;
  programName: string;
  code: string;
  name: string;
  description: string | null;
  versionLabel: string;
  minimumScore: number;
  maximumScore: number;
  passingScore: number | null;
  status: EvaluationTemplateStatus;
  criterionCount: number;
  totalWeight: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveEvaluationTemplateRequest = {
  programId: string;
  code: string;
  name: string;
  description: string | null;
  versionLabel: string;
  minimumScore: number;
  maximumScore: number;
  passingScore: number | null;
};

export type EvaluationCriterion = {
  id: string;
  templateId: string;
  code: string;
  name: string;
  description: string | null;
  weightPercentage: number;
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveEvaluationCriterionRequest = {
  code: string;
  name: string;
  description: string | null;
  weightPercentage: number;
  sequenceNumber: number;
};

export type StudentEvaluationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PUBLISHED";

export type DevelopmentStatus =
  | "NO_DATA"
  | "NEEDS_SUPPORT"
  | "DEVELOPING"
  | "ON_TRACK"
  | "EXCEEDING_EXPECTATIONS";
