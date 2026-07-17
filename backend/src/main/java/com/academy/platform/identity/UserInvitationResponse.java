package com.academy.platform.identity;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserInvitationResponse(
        UUID invitationId,
        UUID membershipId,
        String token,
        OffsetDateTime expiresAt
) {
}
