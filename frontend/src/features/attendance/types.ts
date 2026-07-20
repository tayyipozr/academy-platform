export type AttendanceStatus =
  | "NOT_RECORDED"
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED";

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus;
  arrivalTime: string | null;
  departureTime: string | null;
  note: string | null;
  recordedBy: string | null;
  recordedAt: string | null;
  updatedAt: string;
};

export type SessionAttendance = {
  sessionId: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  sessionTitle: string;
  scheduledStart: string;
  scheduledEnd: string;
  sessionStatus: string;

  finalized: boolean;
  finalizedAt: string | null;
  finalizedBy: string | null;

  correctionOpen: boolean;
  activeCorrectionId: string | null;
  activeCorrectionReason: string | null;

  totalStudentCount: number;
  recordedCount: number;
  notRecordedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;

  records: AttendanceRecord[];
};

export type SaveAttendanceRecord = {
  studentId: string;
  status: AttendanceStatus;
  arrivalTime: string | null;
  departureTime: string | null;
  note: string | null;
};

export type SaveAttendanceRequest = {
  records: SaveAttendanceRecord[];
};

export type AttendanceCorrectionStatus =
  | "OPEN"
  | "COMPLETED"
  | "CANCELLED";

export type AttendanceChange = {
  id: string;
  attendanceRecordId: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;

  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;

  previousArrivalTime: string | null;
  newArrivalTime: string | null;

  previousDepartureTime: string | null;
  newDepartureTime: string | null;

  previousNote: string | null;
  newNote: string | null;

  changedBy: string;
  changedByName: string | null;
  changedAt: string;
};

export type AttendanceCorrection = {
  id: string;
  sessionId: string;
  status: AttendanceCorrectionStatus;
  correctionReason: string;

  previousFinalizedAt: string;
  previousFinalizedBy: string;

  openedBy: string;
  openedByName: string | null;
  openedAt: string;

  completedBy: string | null;
  completedByName: string | null;
  completedAt: string | null;

  changeCount: number;
  changes: AttendanceChange[];
};
