import type {
  StudentAttendanceSummary,
} from "@/features/attendance/types";

import type {
  StudentDevelopmentSummary,
} from "@/features/evaluations/types";

export type UpcomingSessionSummary = {
  sessionId: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  location: string | null;
  status: string;
  leadStaffId: string | null;
  leadStaffName: string | null;
};

export type DashboardSummary = {
  dashboardType:
    | "ADMINISTRATOR"
    | "INSTRUCTOR";

  activeStudentCount: number;
  activeGroupCount: number;
  activeStaffCount: number;

  upcomingSessionCount: number;
  sessionsMissingAttendanceCount: number;

  draftEvaluationCount: number;
  submittedEvaluationCount: number;
  publishedEvaluationCount: number;

  activeCurriculumCount: number;

  generatedAt: string;

  upcomingSessions: UpcomingSessionSummary[];
};

export type CompletedLessonsSummary = {
  completedSessionCount: number;
  attendedCompletedSessionCount: number;
  missedCompletedSessionCount: number;
  sessionsWithoutAttendanceCount: number;
};

export type StudentProgressReport = {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;

  groupId: string | null;
  groupCode: string | null;
  groupName: string | null;

  dateFrom: string | null;
  dateTo: string | null;

  attendance: StudentAttendanceSummary;

  development: StudentDevelopmentSummary;

  lessons: CompletedLessonsSummary;

  generatedAt: string;
};

export type ReportExportType =
  "STUDENT_PROGRESS_PDF";

export type ReportExportStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED";

export type ReportExport = {
  id: string;
  reportType: ReportExportType;
  status: ReportExportStatus;

  studentId: string;
  studentNumber: string | null;
  studentName: string | null;

  groupId: string | null;
  groupName: string | null;

  dateFrom: string | null;
  dateTo: string | null;

  filename: string | null;
  contentType: string | null;
  fileSize: number | null;

  requestedBy: string;
  requestedAt: string;
  processingStartedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  expiresAt: string | null;

  errorMessage: string | null;
  sourceExportId: string | null;
};

export type CreateStudentProgressExportRequest = {
  studentId: string;
  groupId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export type ReportDownload = {
  downloadUrl: string;
  filename: string;
  contentType: string;
  expiresAt: string;
};

export type ProgressReportFilters = {
  groupId?: string;
  dateFrom?: string;
  dateTo?: string;
};
