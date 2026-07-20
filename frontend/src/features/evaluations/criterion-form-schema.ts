import { z } from "zod";

export const evaluationCriterionFormSchema =
  z.object({
    code: z
      .string()
      .trim()
      .min(1, "Criterion code is required.")
      .max(50)
      .regex(
        /^[A-Za-z0-9_.-]+$/,
        "Use letters, numbers, periods, underscores, or hyphens.",
      ),

    name: z
      .string()
      .trim()
      .min(1, "Criterion name is required.")
      .max(200),

    description: z
      .string()
      .trim()
      .max(5000),

    weightPercentage: z
      .string()
      .min(1, "Weight is required.")
      .refine(
        (value) => {
          const number = Number(value);

          return (
            Number.isFinite(number) &&
            number > 0 &&
            number <= 100
          );
        },
        "Weight must be greater than 0 and no more than 100.",
      ),

    sequenceNumber: z
      .string()
      .refine(
        (value) =>
          Number.isInteger(Number(value)) &&
          Number(value) > 0,
        "Sequence must be a positive integer.",
      ),
  });

export type EvaluationCriterionFormValues =
  z.infer<
    typeof evaluationCriterionFormSchema
  >;
