export type OrganizationTerminology = {
  studentLabel: string;
  staffLabel: string;
  groupLabel: string;
  sessionLabel: string;
  programLabel: string;
};

export type OrganizationSettings = {
  id: string;
  name: string;
  slug: string;
  defaultLocale: string;
  timezone: string;
  terminology: OrganizationTerminology;
};

export type UpdateOrganizationSettingsRequest = {
  name: string;
  defaultLocale: string;
  timezone: string;
  terminology: OrganizationTerminology;
};
