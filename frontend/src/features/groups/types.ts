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
