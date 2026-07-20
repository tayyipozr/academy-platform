export type GroupStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "COMPLETED"
  | "ARCHIVED";

export type AcademyGroup = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  programId: string;
  programCode: string;
  programName: string;
  termId: string;
  termCode: string;
  termName: string;
  termStartDate: string;
  termEndDate: string;
  code: string;
  name: string;
  description: string | null;
  capacity: number;
  minimumAge: number | null;
  maximumAge: number | null;
  status: GroupStatus;
  createdAt: string;
  updatedAt: string;
};

export type SaveGroupRequest = {
  branchId: string | null;
  programId: string;
  termId: string;
  code: string;
  name: string;
  description: string | null;
  capacity: number;
  minimumAge: number | null;
  maximumAge: number | null;
};

export type EnrollmentStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "WITHDRAWN"
  | "CANCELLED";

export type GroupEnrollment = {
  id: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  status: EnrollmentStatus;
  enrolledAt: string;
  endedAt: string | null;
  endReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GroupEnrollmentSummary = {
  groupId: string;
  capacity: number;
  activeEnrollmentCount: number;
  availablePlaces: number;
  enrollments: GroupEnrollment[];
};

export type CreateEnrollmentRequest = {
  studentId: string;
  enrolledAt: string;
};

export type EndEnrollmentRequest = {
  status: Exclude<EnrollmentStatus, "ACTIVE">;
  endedAt: string;
  reason: string | null;
};

export type GroupStaffRole =
  | "PRIMARY_INSTRUCTOR"
  | "ASSISTANT_INSTRUCTOR";

export type GroupStaffAssignmentStatus =
  | "ACTIVE"
  | "ENDED"
  | "CANCELLED";

export type GroupStaffAssignment = {
  id: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  staffId: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string | null;
  specialization: string | null;
  assignmentRole: GroupStaffRole;
  status: GroupStaffAssignmentStatus;
  startDate: string;
  endDate: string | null;
  endReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateGroupStaffAssignmentRequest = {
  staffId: string;
  assignmentRole: GroupStaffRole;
  startDate: string;
};

export type EndGroupStaffAssignmentRequest = {
  status: Exclude<
    GroupStaffAssignmentStatus,
    "ACTIVE"
  >;
  endDate: string;
  reason: string | null;
};