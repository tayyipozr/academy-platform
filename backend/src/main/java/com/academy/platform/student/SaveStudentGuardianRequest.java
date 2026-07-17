package com.academy.platform.student;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record SaveStudentGuardianRequest(

        @NotNull
        UUID guardianId,

        @NotNull
        GuardianRelationshipType relationshipType,

        boolean primaryContact,

        boolean legalGuardian,

        boolean pickupAuthorized,

        boolean receivesNotifications,

        boolean internalMediaConsent,

        boolean marketingMediaConsent
) {
}
