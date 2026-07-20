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

export type StudentAttendanceItem = {
  attendanceRecordId: string;
  sessionId: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  termId: string;
  termCode: string;
  termName: string;
  sessionTitle: string;
  sessionDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AttendanceStatus;
  arrivalTime: string | null;
  departureTime: string | null;
  note: string | null;
  recordedAt: string | null;
  finalizedAt: string;
};

export type StudentAttendanceSummary = {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateFrom: string | null;
  dateTo: string | null;
  groupId: string | null;
  termId: string | null;
  totalFinalizedSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendedCount: number;
  percentageDenominator: number;
  attendancePercentage: number;
  records: StudentAttendanceItem[];
};

export type GroupStudentAttendanceSummary = {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  totalFinalizedSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendedCount: number;
  percentageDenominator: number;
  attendancePercentage: number;
};

export type GroupAttendanceSummary = {
  groupId: string;
  groupCode: string;
  groupName: string;
  programId: string;
  programName: string;
  termId: string;
  termCode: string;
  termName: string;
  dateFrom: string | null;
  dateTo: string | null;
  finalizedSessionCount: number;
  attendanceRecordCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendedCount: number;
  percentageDenominator: number;
  attendancePercentage: number;
  students: GroupStudentAttendanceSummary[];
};

export type GuardianLinkedStudent = {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  status: string;
  branchId: string | null;
  branchName: string | null;
  relationshipType: string;
  primaryContact: boolean;
  legalGuardian: boolean;
  pickupAuthorized: boolean;
};

export type StudentAttendanceFilters = {
  dateFrom?: string;
  dateTo?: string;
  groupId?: string;
  termId?: string;
};

export type GroupAttendanceFilters = {
  dateFrom?: string;
  dateTo?: string;
};