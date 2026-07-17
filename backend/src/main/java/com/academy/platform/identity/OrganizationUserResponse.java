package com.academy.platform.identity;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrganizationUserResponse(
        UUID userId,
        UUID membershipId,
        String email,
        String firstName,
        String lastName,
        String status,
        List<RoleSummary> roles,
        OffsetDateTime joinedAt,
        OffsetDateTime lastLoginAt
) {

    public OrganizationUserResponse {
        roles = List.copyOf(roles);
    }

    public record RoleSummary(
            UUID id,
            String name
    ) {
    }
}
