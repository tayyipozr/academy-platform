import { z } from "zod";

export const guardianFormSchema = z.object({
  membershipId: z
    .string()
    .uuid("Select a guardian account."),

  guardianNumber: z.string().trim().max(50),
  phone: z.string().trim().max(50),
  alternatePhone: z.string().trim().max(50),
  occupation: z.string().trim().max(150),
  addressLine1: z.string().trim().max(250),
  addressLine2: z.string().trim().max(250),
  city: z.string().trim().max(100),
  stateProvince: z.string().trim().max(100),
  postalCode: z.string().trim().max(30),

  countryCode: z
    .string()
    .trim()
    .regex(
      /^$|^[A-Za-z]{2}$/,
      "Country code must contain two letters.",
    ),

  notes: z.string().trim().max(5000),
});

export type GuardianFormValues = z.infer<
  typeof guardianFormSchema
>;
