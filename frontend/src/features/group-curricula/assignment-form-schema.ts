import { z } from "zod";

export const curriculumAssignmentFormSchema =
  z.object({
    curriculumId: z
      .string()
      .uuid("Select a curriculum."),

    operationDate: z
      .string()
      .min(1, "Assignment date is required."),

    reason: z.string().trim().max(500),
  });

export type CurriculumAssignmentFormValues =
  z.infer<
    typeof curriculumAssignmentFormSchema
  >;
