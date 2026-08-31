import type {
  SupportedLocale,
  TranslationDictionary,
} from "./messages";

export type {
  SupportedLocale,
  TranslationDictionary,
};

export type OrganizationTerminology = {
  studentLabel: string;
  staffLabel: string;
  groupLabel: string;
  sessionLabel: string;
  programLabel: string;
};

export type OrganizationLocalization = {
  locale: string;
  terminology: OrganizationTerminology;
};