import { z } from "zod";

export const organizationSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Organization name is required.")
    .max(200, "Organization name is too long."),

  defaultLocale: z
    .string()
    .trim()
    .min(1, "Default locale is required.")
    .max(20),

  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(100),

  terminology: z.object({
    studentLabel: z
      .string()
      .trim()
      .min(1, "Student label is required.")
      .max(50),

    staffLabel: z
      .string()
      .trim()
      .min(1, "Staff label is required.")
      .max(50),

    groupLabel: z
      .string()
      .trim()
      .min(1, "Group label is required.")
      .max(50),

    sessionLabel: z
      .string()
      .trim()
      .min(1, "Session label is required.")
      .max(50),

    programLabel: z
      .string()
      .trim()
      .min(1, "Program label is required.")
      .max(50),
  }),
});

export type OrganizationSettingsFormValues =
  z.infer<typeof organizationSettingsSchema>;
