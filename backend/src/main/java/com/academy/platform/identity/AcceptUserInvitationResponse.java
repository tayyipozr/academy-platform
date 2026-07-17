package com.academy.platform.identity;

public record AcceptUserInvitationResponse(
        String organizationSlug,
        String email,
        boolean accepted
) {
}
