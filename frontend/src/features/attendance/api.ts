import { apiRequest } from "@/lib/api/api-client";

import type {
  AttendanceCorrection,
  SaveAttendanceRequest,
  SessionAttendance,
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
