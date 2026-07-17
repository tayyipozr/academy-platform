import type {
  AuthenticatedUser,
} from "@/features/auth/types";

export function hasPermission(
  user: AuthenticatedUser | null | undefined,
  permission: string,
): boolean {
  return (
    user?.permissions.includes(permission) ?? false
  );
}

export function hasEveryPermission(
  user: AuthenticatedUser | null | undefined,
  permissions: string[],
): boolean {
  return permissions.every((permission) =>
    hasPermission(user, permission),
  );
}

export function hasAnyPermission(
  user: AuthenticatedUser | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((permission) =>
    hasPermission(user, permission),
  );
}
