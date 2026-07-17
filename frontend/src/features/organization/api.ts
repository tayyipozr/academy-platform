import { apiRequest } from "@/lib/api/api-client";

import type {
  OrganizationSettings,
  UpdateOrganizationSettingsRequest,
} from "./types";

export function getOrganizationSettings(): Promise<OrganizationSettings> {
  return apiRequest<OrganizationSettings>(
    "/organization/settings",
  );
}

export function updateOrganizationSettings(
  request: UpdateOrganizationSettingsRequest,
): Promise<OrganizationSettings> {
  return apiRequest<OrganizationSettings>(
    "/organization/settings",
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}
