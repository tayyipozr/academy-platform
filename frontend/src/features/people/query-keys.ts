import type {
  AssignableAccountRole,
} from "./types";

export const peopleQueryKeys = {
  assignableAccounts: (
    role: AssignableAccountRole,
  ) => ["assignable-accounts", role] as const,
};
