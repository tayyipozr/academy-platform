import { z } from "zod";

export const rescheduleSessionSchema = z
  .object({
    scheduledStart: z
      .string()
      .min(1, "Start date and time are required."),

    scheduledEnd: z
      .string()
      .min(1, "End date and time are required."),

    location: z.string().trim().max(250),
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

export type RescheduleSessionFormValues =
  z.infer<typeof rescheduleSessionSchema>;
