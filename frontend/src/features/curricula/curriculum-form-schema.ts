import { z } from "zod";

export const curriculumFormSchema = z.object({
  programId: z
    .string()
    .uuid("Select a program."),

  code: z
    .string()
    .trim()
    .min(1, "Curriculum code is required.")
    .max(50)
    .regex(
      /^[A-Za-z0-9_.-]+$/,
      "Use letters, numbers, periods, underscores, or hyphens.",
    ),

  name: z
    .string()
    .trim()
    .min(1, "Curriculum name is required.")
    .max(200),

  description: z.string().trim().max(5000),

  versionLabel: z
    .string()
    .trim()
    .min(1, "Version is required.")
    .max(50),
});

export type CurriculumFormValues = z.infer<
  typeof curriculumFormSchema
>;
