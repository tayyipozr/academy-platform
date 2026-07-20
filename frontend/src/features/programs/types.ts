export type ProgramStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

export type Program = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  minimumAge: number | null;
  maximumAge: number | null;
  status: ProgramStatus;
  createdAt: string;
  updatedAt: string;
};

export type SaveProgramRequest = {
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  minimumAge: number | null;
  maximumAge: number | null;
};
