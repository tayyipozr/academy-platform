import {
  apiRequest,
} from "@/lib/api/api-client";

import type {
  CreateStudentProgressExportRequest,
  DashboardSummary,
  ProgressReportFilters,
  ReportDownload,
  ReportExport,
  ReportExportStatus,
  StudentProgressReport,
} from "./types";

export function getDashboardSummary():
Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>(
    "/dashboard/summary",
  );
}

export function getStudentProgressReport(
  studentId: string,
  filters: ProgressReportFilters = {},
): Promise<StudentProgressReport> {
  const query = createProgressQuery(filters);

  return apiRequest<StudentProgressReport>(
    `/reports/students/${studentId}/progress?${query.toString()}`,
  );
}

export function requestStudentProgressExport(
  request: CreateStudentProgressExportRequest,
): Promise<ReportExport> {
  return apiRequest<ReportExport>(
    "/report-exports/student-progress",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function getReportExport(
  exportId: string,
): Promise<ReportExport> {
  return apiRequest<ReportExport>(
    `/report-exports/${exportId}`,
  );
}

export function getReportExports(
  filters: {
    studentId?: string;
    status?: ReportExportStatus | "";
  } = {},
): Promise<ReportExport[]> {
  const query = new URLSearchParams();

  if (filters.studentId) {
    query.set(
      "studentId",
      filters.studentId,
    );
  }

  if (filters.status) {
    query.set("status", filters.status);
  }

  return apiRequest<ReportExport[]>(
    `/report-exports?${query.toString()}`,
  );
}

export function regenerateReportExport(
  exportId: string,
): Promise<ReportExport> {
  return apiRequest<ReportExport>(
    `/report-exports/${exportId}/regenerate`,
    {
      method: "POST",
    },
  );
}

export function getReportDownload(
  exportId: string,
): Promise<ReportDownload> {
  return apiRequest<ReportDownload>(
    `/report-exports/${exportId}/download`,
  );
}

function createProgressQuery(
  filters: ProgressReportFilters,
): URLSearchParams {
  const query = new URLSearchParams();

  if (filters.groupId) {
    query.set("groupId", filters.groupId);
  }

  if (filters.dateFrom) {
    query.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    query.set("dateTo", filters.dateTo);
  }

  return query;
}
