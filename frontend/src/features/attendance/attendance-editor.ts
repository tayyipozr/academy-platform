import type {
  AttendanceRecord,
  AttendanceStatus,
  SaveAttendanceRecord,
} from "./types";

export type EditableAttendanceRecord = {
  id: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus;
  arrivalTime: string;
  departureTime: string;
  note: string;
};

export function toEditableAttendance(
  record: AttendanceRecord,
): EditableAttendanceRecord {
  return {
    id: record.id,
    studentId: record.studentId,
    studentNumber: record.studentNumber,
    firstName: record.firstName,
    lastName: record.lastName,
    status: record.status,
    arrivalTime:
      record.arrivalTime?.slice(0, 5) ?? "",
    departureTime:
      record.departureTime?.slice(0, 5) ?? "",
    note: record.note ?? "",
  };
}

export function toSaveAttendanceRecord(
  record: EditableAttendanceRecord,
): SaveAttendanceRecord {
  const allowsTimes = [
    "PRESENT",
    "LATE",
  ].includes(record.status);

  return {
    studentId: record.studentId,
    status: record.status,
    arrivalTime:
      allowsTimes && record.arrivalTime
        ? `${record.arrivalTime}:00`
        : null,
    departureTime:
      allowsTimes && record.departureTime
        ? `${record.departureTime}:00`
        : null,
    note: record.note.trim() || null,
  };
}
