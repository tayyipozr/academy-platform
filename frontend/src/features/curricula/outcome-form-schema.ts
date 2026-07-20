import { z } from "zod";

export const outcomeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Outcome code is required.")
    .max(50)
    .regex(
      /^[A-Za-z0-9_.-]+$/,
      "Use letters, numbers, periods, underscores, or hyphens.",
    ),

  title: z
    .string()
    .trim()
    .min(1, "Outcome title is required.")
    .max(300),

  description: z.string().trim().max(5000),

  sequenceNumber: z
    .string()
    .refine(
      (value) =>
        Number.isInteger(Number(value)) &&
        Number(value) > 0,
      "Sequence must be a positive integer.",
    ),
});

export type OutcomeFormValues = z.infer<
  typeof outcomeFormSchema
>;
