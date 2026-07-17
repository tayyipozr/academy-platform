package com.academy.platform.student;

import java.time.OffsetDateTime;
import java.util.UUID;

public record StudentGuardianResponse(
        UUID studentId,
        UUID guardianId,
        String guardianNumber,
        String email,
        String firstName,
        String lastName,
        String phone,
        GuardianRelationshipType relationshipType,
        boolean primaryContact,
        boolean legalGuardian,
        boolean pickupAuthorized,
        boolean receivesNotifications,
        boolean internalMediaConsent,
        boolean marketingMediaConsent,
        OffsetDateTime consentRecordedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
