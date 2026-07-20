import { apiRequest } from "@/lib/api/api-client";

import type {
  AttendanceCorrection,
  GroupAttendanceFilters,
  GroupAttendanceSummary,
  GuardianLinkedStudent,
  SaveAttendanceRequest,
  SessionAttendance,
  StudentAttendanceFilters,
  StudentAttendanceSummary,
} from "./types";

export function getSessionAttendance(
  sessionId: string,
): Promise<SessionAttendance> {
  return apiRequest<SessionAttendance>(
    `/sessions/${sessionId}/attendance`,
  );
}

export function initializeAttendance(
  sessionId: string,
): Promise<SessionAttendance> {
  return apiRequest<SessionAttendance>(
    `/sessions/${sessionId}/attendance/initialize`,
    {
      method: "POST",
    },
  );
}

export function saveAttendance(
  sessionId: string,
  request: SaveAttendanceRequest,
): Promise<SessionAttendance> {
  return apiRequest<SessionAttendance>(
    `/sessions/${sessionId}/attendance`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function finalizeAttendance(
  sessionId: string,
): Promise<SessionAttendance> {
  return apiRequest<SessionAttendance>(
    `/sessions/${sessionId}/attendance/finalize`,
    {
      method: "POST",
    },
  );
}

export function openAttendanceCorrection(
  sessionId: string,
  reason: string,
): Promise<AttendanceCorrection> {
  return apiRequest<AttendanceCorrection>(
    `/sessions/${sessionId}/attendance/corrections/open`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
}

export function getAttendanceCorrections(
  sessionId: string,
): Promise<AttendanceCorrection[]> {
  return apiRequest<AttendanceCorrection[]>(
    `/sessions/${sessionId}/attendance/corrections`,
  );
}

export function getStudentAttendanceHistory(
  studentId: string,
  filters: StudentAttendanceFilters = {},
): Promise<StudentAttendanceSummary> {
  const query = new URLSearchParams();

  if (filters.dateFrom) {
    query.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    query.set("dateTo", filters.dateTo);
  }

  if (filters.groupId) {
    query.set("groupId", filters.groupId);
  }

  if (filters.termId) {
    query.set("termId", filters.termId);
  }

  return apiRequest<StudentAttendanceSummary>(
    `/students/${studentId}/attendance-history?${query.toString()}`,
  );
}

export function getGroupAttendanceSummary(
  groupId: string,
  filters: GroupAttendanceFilters = {},
): Promise<GroupAttendanceSummary> {
  const query = new URLSearchParams();

  if (filters.dateFrom) {
    query.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    query.set("dateTo", filters.dateTo);
  }

  return apiRequest<GroupAttendanceSummary>(
    `/groups/${groupId}/attendance-summary?${query.toString()}`,
  );
}

export function getGuardianLinkedStudents():
  Promise<GuardianLinkedStudent[]> {
  return apiRequest<GuardianLinkedStudent[]>(
    "/guardians/me/students",
  );
}
