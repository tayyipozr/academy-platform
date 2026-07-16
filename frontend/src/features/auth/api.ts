import { apiRequest } from "@/lib/api/api-client";

import type {
  AuthenticatedUser,
  LoginRequest,
} from "./types";

export function login(
  request: LoginRequest,
): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getCurrentUser(): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/auth/me");
}

export function logout(): Promise<void> {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
  });
}
