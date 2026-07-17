package com.academy.platform.branch;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BranchResponse(
        UUID id,
        String code,
        String name,
        BranchStatus status,
        String email,
        String phone,
        String addressLine1,
        String addressLine2,
        String city,
        String stateProvince,
        String postalCode,
        String countryCode,
        String timezone,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
