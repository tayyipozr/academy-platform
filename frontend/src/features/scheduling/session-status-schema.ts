import { z } from "zod";

export const sessionStatusSchema = z
  .object({
    status: z.enum([
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "POSTPONED",
    ]),

    completionNotes: z
      .string()
      .trim()
      .max(5000),

    cancellationReason: z
      .string()
      .trim()
      .max(500),
  })
  .superRefine((values, context) => {
    if (
      values.status === "CANCELLED" &&
      values.cancellationReason.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["cancellationReason"],
        message:
          "A cancellation reason is required.",
      });
    }
  });

export type SessionStatusFormValues = z.infer<
  typeof sessionStatusSchema
>;
