import { z } from "zod";

export const endEnrollmentSchema = z.object({
  status: z.enum([
    "COMPLETED",
    "WITHDRAWN",
    "CANCELLED",
  ]),

  endedAt: z
    .string()
    .min(1, "End date is required."),

  reason: z.string().trim().max(500),
});

export type EndEnrollmentFormValues = z.infer<
  typeof endEnrollmentSchema
>;
