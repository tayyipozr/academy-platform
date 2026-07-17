export type MembershipStatus =
  | "ACTIVE"
  | "INVITED"
  | "SUSPENDED"
  | "ARCHIVED";

export type Role = {
  id: string;
  name: string;
  description: string | null;
  systemRole: boolean;
};

export type UserRoleSummary = {
  id: string;
  name: string;
};

export type OrganizationUser = {
  userId: string;
  membershipId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: MembershipStatus;
  roles: UserRoleSummary[];
  joinedAt: string;
  lastLoginAt: string | null;
};

export type PageMetadata = {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type PageResponse<T> = {
  data: T[];
  page: PageMetadata;
};

export type UserSearchParameters = {
  search: string;
  page: number;
  size: number;
};

export type CreateUserRequest = {
  email: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string;
  roleIds: string[];
};

export type CreateInvitationRequest = {
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
};

export type UserInvitationResponse = {
  invitationId: string;
  membershipId: string;
  token: string;
  expiresAt: string;
};

export type UpdateUserRequest = {
  firstName: string;
  lastName: string;
  roleIds: string[];
};
