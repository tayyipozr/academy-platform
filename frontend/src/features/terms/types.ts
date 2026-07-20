export type TermStatus =
  | "DRAFT"
  | "ACTIVE"
  | "COMPLETED"
  | "ARCHIVED";

export type OperationalTerm = {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: TermStatus;
  createdAt: string;
  updatedAt: string;
};

export type SaveTermRequest = {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
};
