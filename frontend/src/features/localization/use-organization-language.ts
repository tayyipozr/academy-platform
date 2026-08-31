"use client";

import {
  useLocalization,
} from "./use-localization";

export function useOrganizationLanguage() {
  return useLocalization();
}