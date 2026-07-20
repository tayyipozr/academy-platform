import { z } from "zod";

export const unitProgressSchema = z
  .object({
    status: z.enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "COMPLETED",
    ]),

    completedSessions: z
      .string()
      .refine(
        (value) =>
          Number.isInteger(Number(value)) &&
          Number(value) >= 0,
        "Completed sessions must be zero or greater.",
      ),
  })
  .superRefine((values, context) => {
    const completedSessions = Number(
      values.completedSessions,
    );

    if (
      values.status === "NOT_STARTED" &&
      completedSessions !== 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedSessions"],
        message:
          "A not-started unit must have zero completed sessions.",
      });
    }

    if (
      values.status !== "NOT_STARTED" &&
      completedSessions === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedSessions"],
        message:
          "An in-progress or completed unit must have at least one completed session.",
      });
    }
  });

export type UnitProgressFormValues = z.infer<
  typeof unitProgressSchema
>;
