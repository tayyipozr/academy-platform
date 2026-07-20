import { z } from "zod";

export const manualSessionSchema = z
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

    scheduledStart: z
      .string()
      .min(1, "Start date and time are required."),

    scheduledEnd: z
      .string()
      .min(1, "End date and time are required."),

    location: z
      .string()
      .trim()
      .max(250),
  })
  .superRefine((values, context) => {
    if (
      values.scheduledStart &&
      values.scheduledEnd &&
      values.scheduledEnd <=
        values.scheduledStart
    ) {
      context.addIssue({
        code: "custom",
        path: ["scheduledEnd"],
        message:
          "End date and time must be after start.",
      });
    }
  });

export type ManualSessionFormValues = z.infer<
  typeof manualSessionSchema
>;
