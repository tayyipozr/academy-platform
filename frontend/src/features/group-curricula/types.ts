export type GroupCurriculumAssignmentStatus =
  | "ACTIVE"
  | "ENDED"
  | "CANCELLED";

export type CurriculumUnitProgressStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED";

export type GroupCurriculumAssignment = {
  id: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  curriculumId: string;
  curriculumCode: string;
  curriculumName: string;
  curriculumVersion: string;
  status: GroupCurriculumAssignmentStatus;
  startDate: string;
  endDate: string | null;
  endReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CurriculumUnitProgress = {
  id: string;
  assignmentId: string;
  unitId: string;
  parentUnitId: string | null;
  unitCode: string;
  unitTitle: string;
  sequenceNumber: number;
  estimatedSessions: number | null;
  status: CurriculumUnitProgressStatus;
  completedSessions: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GroupCurriculumProgress = {
  assignment: GroupCurriculumAssignment;
  totalUnitCount: number;
  notStartedUnitCount: number;
  inProgressUnitCount: number;
  completedUnitCount: number;
  totalEstimatedSessions: number;
  completedSessionCount: number;
  completionPercentage: number;
  units: CurriculumUnitProgress[];
};

export type CreateGroupCurriculumAssignmentRequest = {
  curriculumId: string;
  startDate: string;
};

export type ReplaceGroupCurriculumRequest = {
  curriculumId: string;
  replacementDate: string;
  reason: string | null;
};

export type EndGroupCurriculumAssignmentRequest = {
  status: Exclude<
    GroupCurriculumAssignmentStatus,
    "ACTIVE"
  >;
  endDate: string;
  reason: string | null;
};

export type UpdateCurriculumUnitProgressRequest = {
  status: CurriculumUnitProgressStatus;
  completedSessions: number;
};
