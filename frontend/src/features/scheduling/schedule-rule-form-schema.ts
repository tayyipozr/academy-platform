import { z } from "zod";

export const scheduleRuleFormSchema = z
  .object({
    curriculumUnitId: z.string(),
    leadStaffId: z.string(),

    title: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(200),

    description: z
      .string()
      .trim()
      .max(5000),

    dayOfWeek: z.enum([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
    ]),

    startTime: z
      .string()
      .min(1, "Start time is required."),

    endTime: z
      .string()
      .min(1, "End time is required."),

    effectiveFrom: z
      .string()
      .min(1, "Effective start date is required."),

    effectiveUntil: z
      .string()
      .min(1, "Effective end date is required."),

    timezone: z
      .string()
      .trim()
      .min(1, "Timezone is required.")
      .max(100),

    location: z
      .string()
      .trim()
      .max(250),
  })
  .superRefine((values, context) => {
    if (
      values.startTime &&
      values.endTime &&
      values.endTime <= values.startTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message:
          "End time must be after start time.",
      });
    }

    if (
      values.effectiveFrom &&
      values.effectiveUntil &&
      values.effectiveUntil <
        values.effectiveFrom
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveUntil"],
        message:
          "Effective end date cannot be before the start date.",
      });
    }
  });

export type ScheduleRuleFormValues = z.infer<
  typeof scheduleRuleFormSchema
>;
