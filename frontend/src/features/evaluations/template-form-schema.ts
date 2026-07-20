import { z } from "zod";

export const evaluationTemplateFormSchema = z
  .object({
    programId: z
      .string()
      .uuid("Select a program."),

    code: z
      .string()
      .trim()
      .min(1, "Template code is required.")
      .max(50)
      .regex(
        /^[A-Za-z0-9_.-]+$/,
        "Use letters, numbers, periods, underscores, or hyphens.",
      ),

    name: z
      .string()
      .trim()
      .min(1, "Template name is required.")
      .max(200),

    description: z
      .string()
      .trim()
      .max(5000),

    versionLabel: z
      .string()
      .trim()
      .min(1, "Version is required.")
      .max(50),

    minimumScore: z
      .string()
      .min(1, "Minimum score is required.")
      .refine(
        (value) => Number.isFinite(Number(value)),
        "Minimum score must be numeric.",
      ),

    maximumScore: z
      .string()
      .min(1, "Maximum score is required.")
      .refine(
        (value) => Number.isFinite(Number(value)),
        "Maximum score must be numeric.",
      ),

    passingScore: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          Number.isFinite(Number(value)),
        "Passing score must be numeric.",
      ),
  })
  .superRefine((values, context) => {
    const minimum = Number(values.minimumScore);
    const maximum = Number(values.maximumScore);

    if (
      Number.isFinite(minimum) &&
      Number.isFinite(maximum) &&
      maximum <= minimum
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximumScore"],
        message:
          "Maximum score must be greater than minimum score.",
      });
    }

    if (values.passingScore !== "") {
      const passing = Number(values.passingScore);

      if (
        Number.isFinite(minimum) &&
        Number.isFinite(maximum) &&
        (
          passing < minimum ||
          passing > maximum
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["passingScore"],
          message:
            "Passing score must be within the scoring range.",
        });
      }
    }
  });

export type EvaluationTemplateFormValues =
  z.infer<typeof evaluationTemplateFormSchema>;
