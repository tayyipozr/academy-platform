import { z } from "zod";

export const programFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Program code is required.")
      .max(50)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Use letters, numbers, underscores, or hyphens only.",
      ),

    name: z
      .string()
      .trim()
      .min(1, "Program name is required.")
      .max(200),

    description: z.string().trim().max(5000),

    category: z.string().trim().max(100),

    minimumAge: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          (Number.isInteger(Number(value)) &&
            Number(value) >= 0 &&
            Number(value) <= 120),
        "Minimum age must be between 0 and 120.",
      ),

    maximumAge: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          (Number.isInteger(Number(value)) &&
            Number(value) >= 0 &&
            Number(value) <= 120),
        "Maximum age must be between 0 and 120.",
      ),
  })
  .superRefine((values, context) => {
    if (
      values.minimumAge !== "" &&
      values.maximumAge !== "" &&
      Number(values.maximumAge) <
        Number(values.minimumAge)
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximumAge"],
        message:
          "Maximum age cannot be less than minimum age.",
      });
    }
  });

export type ProgramFormValues = z.infer<
  typeof programFormSchema
>;
