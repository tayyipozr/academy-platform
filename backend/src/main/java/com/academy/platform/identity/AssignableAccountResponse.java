package com.academy.platform.identity;

import java.util.UUID;

public record AssignableAccountResponse(
        UUID membershipId,
        UUID userId,
        String email,
        String firstName,
        String lastName,
        String membershipStatus
) {
}
