export type CurriculumStatus =
  | "DRAFT"
  | "ACTIVE"
  | "ARCHIVED";

export type Curriculum = {
  id: string;
  programId: string;
  programCode: string;
  programName: string;
  code: string;
  name: string;
  description: string | null;
  versionLabel: string;
  status: CurriculumStatus;
  unitCount: number;
  outcomeCount: number;
  estimatedSessionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveCurriculumRequest = {
  programId: string;
  code: string;
  name: string;
  description: string | null;
  versionLabel: string;
};

export type CurriculumUnit = {
  id: string;
  curriculumId: string;
  parentUnitId: string | null;
  parentUnitTitle: string | null;
  code: string;
  title: string;
  description: string | null;
  sequenceNumber: number;
  estimatedSessions: number | null;
  outcomeCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveCurriculumUnitRequest = {
  parentUnitId: string | null;
  code: string;
  title: string;
  description: string | null;
  sequenceNumber: number;
  estimatedSessions: number | null;
};

export type LearningOutcome = {
  id: string;
  curriculumId: string;
  unitId: string;
  unitCode: string;
  unitTitle: string;
  code: string;
  title: string;
  description: string | null;
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveLearningOutcomeRequest = {
  code: string;
  title: string;
  description: string | null;
  sequenceNumber: number;
};
