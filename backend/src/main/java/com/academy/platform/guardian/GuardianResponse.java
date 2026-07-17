package com.academy.platform.guardian;

import java.time.OffsetDateTime;
import java.util.UUID;

public record GuardianResponse(
        UUID id,
        UUID membershipId,
        UUID userId,
        String email,
        String firstName,
        String lastName,
        String guardianNumber,
        String phone,
        String alternatePhone,
        String occupation,
        String addressLine1,
        String addressLine2,
        String city,
        String stateProvince,
        String postalCode,
        String countryCode,
        GuardianStatus status,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
