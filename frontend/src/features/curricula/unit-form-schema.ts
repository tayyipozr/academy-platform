import { z } from "zod";

export const unitFormSchema = z.object({
  parentUnitId: z.string(),

  code: z
    .string()
    .trim()
    .min(1, "Unit code is required.")
    .max(50)
    .regex(
      /^[A-Za-z0-9_.-]+$/,
      "Use letters, numbers, periods, underscores, or hyphens.",
    ),

  title: z
    .string()
    .trim()
    .min(1, "Unit title is required.")
    .max(200),

  description: z.string().trim().max(5000),

  sequenceNumber: z
    .string()
    .refine(
      (value) =>
        Number.isInteger(Number(value)) &&
        Number(value) > 0,
      "Sequence must be a positive integer.",
    ),

  estimatedSessions: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        (Number.isInteger(Number(value)) &&
          Number(value) > 0),
      "Estimated sessions must be a positive integer.",
    ),
});

export type UnitFormValues = z.infer<
  typeof unitFormSchema
>;
