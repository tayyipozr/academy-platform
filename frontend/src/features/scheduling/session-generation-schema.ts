import { z } from "zod";

export const sessionGenerationSchema = z
  .object({
    dateFrom: z
      .string()
      .min(1, "Start date is required."),

    dateTo: z
      .string()
      .min(1, "End date is required."),
  })
  .superRefine((values, context) => {
    if (
      values.dateFrom &&
      values.dateTo &&
      values.dateTo < values.dateFrom
    ) {
      context.addIssue({
        code: "custom",
        path: ["dateTo"],
        message:
          "End date cannot be before start date.",
      });
    }

    if (values.dateFrom && values.dateTo) {
      const start = new Date(
        `${values.dateFrom}T00:00:00Z`,
      );

      const end = new Date(
        `${values.dateTo}T00:00:00Z`,
      );

      const difference =
        (end.getTime() - start.getTime()) /
        86_400_000;

      if (difference > 366) {
        context.addIssue({
          code: "custom",
          path: ["dateTo"],
          message:
            "A maximum of 366 days can be generated at once.",
        });
      }
    }
  });

export type SessionGenerationFormValues =
  z.infer<typeof sessionGenerationSchema>;
