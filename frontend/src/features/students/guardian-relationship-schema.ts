import { z } from "zod";

export const guardianRelationshipSchema =
  z.object({
    guardianId: z
      .string()
      .uuid("Select a guardian."),

    relationshipType: z.enum([
      "MOTHER",
      "FATHER",
      "LEGAL_GUARDIAN",
      "RELATIVE",
      "OTHER",
    ]),

    primaryContact: z.boolean(),
    legalGuardian: z.boolean(),
    pickupAuthorized: z.boolean(),
    receivesNotifications: z.boolean(),
    internalMediaConsent: z.boolean(),
    marketingMediaConsent: z.boolean(),
  });

export type GuardianRelationshipFormValues =
  z.infer<
    typeof guardianRelationshipSchema
  >;
