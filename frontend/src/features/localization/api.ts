import {
  apiRequest,
} from "@/lib/api/api-client";

import type {
  OrganizationLocalization,
} from "./types";

export function getOrganizationLocalization():
  Promise<OrganizationLocalization> {
  return apiRequest<OrganizationLocalization>(
    "/organization/settings/localization",
  );
}