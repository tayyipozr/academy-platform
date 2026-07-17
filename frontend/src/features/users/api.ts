import { apiRequest } from "@/lib/api/api-client";

import type {
  CreateInvitationRequest,
  CreateUserRequest,
  OrganizationUser,
  PageResponse,
  Role,
  UpdateUserRequest,
  UserInvitationResponse,
  UserSearchParameters,
} from "./types";

export function getRoles(): Promise<Role[]> {
  return apiRequest<Role[]>("/roles");
}

export function getUsers(
  parameters: UserSearchParameters,
): Promise<PageResponse<OrganizationUser>> {
  const query = new URLSearchParams({
    search: parameters.search,
    page: parameters.page.toString(),
    size: parameters.size.toString(),
  });

  return apiRequest<PageResponse<OrganizationUser>>(
    `/users?${query.toString()}`,
  );
}

export function createUser(
  request: CreateUserRequest,
): Promise<void> {
  return apiRequest<void>("/users", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function createInvitation(
  request: CreateInvitationRequest,
): Promise<UserInvitationResponse> {
  return apiRequest<UserInvitationResponse>(
    "/users/invitations",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function updateUser(
  membershipId: string,
  request: UpdateUserRequest,
): Promise<void> {
  return apiRequest<void>(
    `/users/${membershipId}`,
    {
      method: "PATCH",
      body: JSON.stringify(request),
    },
  );
}

export function suspendUser(
  membershipId: string,
): Promise<void> {
  return apiRequest<void>(
    `/users/${membershipId}/suspend`,
    {
      method: "POST",
    },
  );
}

export function reactivateUser(
  membershipId: string,
): Promise<void> {
  return apiRequest<void>(
    `/users/${membershipId}/reactivate`,
    {
      method: "POST",
    },
  );
}

export type AcceptInvitationRequest = {
  token: string;
  password: string;
};

export type AcceptInvitationResponse = {
  organizationSlug: string;
  email: string;
  accepted: boolean;
};

export function acceptInvitation(
  request: AcceptInvitationRequest,
): Promise<AcceptInvitationResponse> {
  return apiRequest<AcceptInvitationResponse>(
    "/invitations/accept",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}
