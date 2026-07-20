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

export type SaveEvaluationScoreRequest = {
  criterionId: string;
  score: number;
  comment: string | null;
};

export type SaveStudentEvaluationRequest = {
  studentId: string;
  groupId: string;
  sessionId: string | null;
  templateId: string;
  evaluationDate: string;
  evaluatorComment: string | null;
  scores: SaveEvaluationScoreRequest[];
};

export type StudentEvaluationScore = {
  id: string;
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  criterionDescription: string | null;
  weightPercentage: number;
  sequenceNumber: number;
  score: number;
  weightedScore: number;
  evaluatorComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentEvaluation = {
  id: string;

  studentId: string;
  studentNumber: string;
  studentFirstName: string;
  studentLastName: string;

  groupId: string;
  groupCode: string;
  groupName: string;

  sessionId: string | null;
  sessionTitle: string | null;

  templateId: string;
  templateCode: string;
  templateName: string;
  templateVersion: string;

  minimumScore: number;
  maximumScore: number;
  passingScore: number | null;

  evaluatorUserId: string;
  evaluatorStaffId: string | null;
  evaluatorName: string;

  evaluationDate: string;
  overallScore: number | null;
  passed: boolean | null;
  evaluatorComment: string | null;

  status: StudentEvaluationStatus;

  submittedBy: string | null;
  submittedAt: string | null;

  publishedBy: string | null;
  publishedAt: string | null;

  criterionCount: number;
  scoredCriterionCount: number;
  complete: boolean;

  scores: StudentEvaluationScore[];

  createdAt: string;
  updatedAt: string;
};

export type StudentEvaluationSummary = {
  id: string;

  studentId: string;
  studentNumber: string;
  studentFirstName: string;
  studentLastName: string;

  groupId: string;
  groupCode: string;
  groupName: string;

  sessionId: string | null;
  sessionTitle: string | null;

  templateId: string;
  templateName: string;
  templateVersion: string;

  evaluationDate: string;
  overallScore: number | null;
  status: StudentEvaluationStatus;
  evaluatorName: string;

  submittedAt: string | null;
  publishedAt: string | null;
};

export type EvaluationFilters = {
  studentId?: string;
  groupId?: string;
  sessionId?: string;
  status?: StudentEvaluationStatus | "";
  dateFrom?: string;
  dateTo?: string;
};