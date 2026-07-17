export type StudentStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "GRADUATED"
  | "ARCHIVED";

export type StudentGender =
  | "FEMALE"
  | "MALE"
  | "NON_BINARY"
  | "UNSPECIFIED";

export type GuardianRelationshipType =
  | "MOTHER"
  | "FATHER"
  | "LEGAL_GUARDIAN"
  | "RELATIVE"
  | "OTHER";

export type Student = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  studentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: StudentGender | null;
  status: StudentStatus;
  enrollmentDate: string | null;
  medicalNotes: string | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  guardianCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveStudentRequest = {
  branchId: string | null;
  studentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: StudentGender | null;
  enrollmentDate: string | null;
  medicalNotes: string | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
};

export type StudentGuardianRelationship = {
  studentId: string;
  guardianId: string;
  guardianNumber: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  relationshipType: GuardianRelationshipType;
  primaryContact: boolean;
  legalGuardian: boolean;
  pickupAuthorized: boolean;
  receivesNotifications: boolean;
  internalMediaConsent: boolean;
  marketingMediaConsent: boolean;
  consentRecordedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveStudentGuardianRequest = {
  guardianId: string;
  relationshipType: GuardianRelationshipType;
  primaryContact: boolean;
  legalGuardian: boolean;
  pickupAuthorized: boolean;
  receivesNotifications: boolean;
  internalMediaConsent: boolean;
  marketingMediaConsent: boolean;
};
