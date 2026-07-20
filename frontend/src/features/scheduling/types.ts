export type ScheduleRuleStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

export type SessionStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "POSTPONED";

export type ScheduleRule = {
  id: string;
  groupId: string;
  groupCode: string;
  groupName: string;

  curriculumAssignmentId: string | null;
  curriculumId: string | null;
  curriculumUnitId: string | null;
  curriculumUnitCode: string | null;
  curriculumUnitTitle: string | null;

  leadStaffId: string | null;
  leadStaffName: string | null;

  title: string;
  description: string | null;

  dayOfWeek: number;
  startTime: string;
  endTime: string;

  effectiveFrom: string;
  effectiveUntil: string;

  timezone: string;
  location: string | null;

  status: ScheduleRuleStatus;

  createdAt: string;
  updatedAt: string;
};

export type SaveScheduleRuleRequest = {
  curriculumUnitId: string | null;
  leadStaffId: string | null;
  title: string;
  description: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveUntil: string;
  timezone: string;
  location: string | null;
};

export type GenerateSessionsRequest = {
  dateFrom: string;
  dateTo: string;
};

export type LessonSession = {
  id: string;
  groupId: string;
  groupCode: string;
  groupName: string;

  scheduleRuleId: string | null;

  curriculumAssignmentId: string | null;
  curriculumId: string | null;
  curriculumUnitId: string | null;
  curriculumUnitCode: string | null;
  curriculumUnitTitle: string | null;

  leadStaffId: string | null;
  leadStaffName: string | null;

  title: string;
  description: string | null;

  scheduledStart: string;
  scheduledEnd: string;

  location: string | null;
  status: SessionStatus;

  completionNotes: string | null;
  cancellationReason: string | null;

  completedAt: string | null;
  cancelledAt: string | null;

  createdAt: string;
  updatedAt: string;
};

export type SessionGenerationResponse = {
  scheduleRuleId: string;
  dateFrom: string;
  dateTo: string;
  matchedDateCount: number;
  generatedSessionCount: number;
  skippedSessionCount: number;
  generatedSessions: LessonSession[];
};
