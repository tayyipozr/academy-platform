export type LoginRequest = {
  email: string;
  password: string;
  organizationSlug: string;
};

export type AuthenticatedUser = {
  id: string;
  membershipId: string;
  email: string;
  firstName: string;
  lastName: string;

  organization: {
    id: string;
    name: string;
    slug: string;
  };

  roles: string[];
  permissions: string[];
};

export type ApiValidationError = {
  code: string;
  message: string;
  fieldErrors?: Array<{
    field: string;
    message: string;
  }>;
};
