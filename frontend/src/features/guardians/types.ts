export type GuardianStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

export type Guardian = {
  id: string;
  membershipId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  guardianNumber: string | null;
  phone: string | null;
  alternatePhone: string | null;
  occupation: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  status: GuardianStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveGuardianRequest = {
  membershipId: string;
  guardianNumber: string | null;
  phone: string | null;
  alternatePhone: string | null;
  occupation: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  notes: string | null;
};
