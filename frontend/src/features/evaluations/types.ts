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

export type PublishedCriterionScore = {
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  criterionDescription: string | null;
  weightPercentage: number;
  score: number;
  weightedScore: number;
  evaluatorComment: string | null;
};

export type PublishedEvaluation = {
  id: string;

  studentId: string;
  studentNumber: string;
  studentFirstName: string;
  studentLastName: string;

  groupId: string;
  groupCode: string;
  groupName: string;

  templateId: string;
  templateName: string;
  templateVersion: string;

  evaluationDate: string;

  minimumScore: number;
  maximumScore: number;
  passingScore: number | null;
  overallScore: number;

  normalizedScore: number;
  passed: boolean | null;

  evaluatorName: string | null;
  evaluatorComment: string | null;

  publishedAt: string;

  scores: PublishedCriterionScore[];
};

export type CriterionAverage = {
  templateId: string;
  templateName: string;

  criterionId: string;
  criterionCode: string;
  criterionName: string;

  weightPercentage: number;
  evaluationCount: number;

  averageScore: number;
  averageNormalizedScore: number;
};

export type EvaluationTrendPoint = {
  evaluationId: string;
  evaluationDate: string;
  templateName: string;
  templateVersion: string;
  overallScore: number;
  normalizedScore: number;
};

export type StudentDevelopmentSummary = {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;

  groupId: string | null;
  groupCode: string | null;
  groupName: string | null;

  dateFrom: string | null;
  dateTo: string | null;

  publishedEvaluationCount: number;

  averageNormalizedScore: number | null;
  latestNormalizedScore: number | null;
  scoreTrend: number | null;

  passingEvaluationCount: number;
  passingRateDenominator: number;
  passingRate: number;

  attendancePercentage: number | null;
  groupCurriculumCompletionPercentage:
  | number
  | null;

  developmentStatus: DevelopmentStatus;

  criterionAverages: CriterionAverage[];
  trend: EvaluationTrendPoint[];
};

export type GroupStudentPerformance = {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;

  publishedEvaluationCount: number;
  averageNormalizedScore: number | null;
  latestNormalizedScore: number | null;
  scoreTrend: number | null;

  developmentStatus: DevelopmentStatus;
};

export type GroupPerformanceSummary = {
  groupId: string;
  groupCode: string;
  groupName: string;

  programId: string;
  programName: string;

  termId: string;
  termName: string;

  dateFrom: string | null;
  dateTo: string | null;

  studentCount: number;
  publishedEvaluationCount: number;
  averageNormalizedScore: number | null;

  passingEvaluationCount: number;
  passingRateDenominator: number;
  passingRate: number;

  students: GroupStudentPerformance[];
};

export type EvaluationReportFilters = {
  groupId?: string;
  dateFrom?: string;
  dateTo?: string;
};