export type BranchStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

export type Branch = {
  id: string;
  code: string;
  name: string;
  status: BranchStatus;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveBranchRequest = {
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  timezone: string;
};
