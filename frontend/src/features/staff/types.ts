export type EmploymentStatus =
  | "ACTIVE"
  | "ON_LEAVE"
  | "INACTIVE"
  | "ARCHIVED";

export type StaffMember = {
  id: string;
  membershipId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  branchId: string | null;
  branchName: string | null;
  staffNumber: string;
  title: string | null;
  specialization: string | null;
  employmentStatus: EmploymentStatus;
  biography: string | null;
  hiredAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveStaffRequest = {
  membershipId: string;
  branchId: string | null;
  staffNumber: string;
  title: string | null;
  specialization: string | null;
  biography: string | null;
  hiredAt: string | null;
  endedAt: string | null;
};
