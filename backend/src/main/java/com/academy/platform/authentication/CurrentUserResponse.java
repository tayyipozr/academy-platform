package com.academy.platform.authentication;

import java.util.Set;
import java.util.UUID;

public record CurrentUserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        OrganizationResponse organization,
        Set<String> roles,
        Set<String> permissions
) {

    public static CurrentUserResponse from(
            AuthenticatedUser authenticatedUser
    ) {
        return new CurrentUserResponse(
                authenticatedUser.userId(),
                authenticatedUser.email(),
                authenticatedUser.firstName(),
                authenticatedUser.lastName(),
                new OrganizationResponse(
                        authenticatedUser.organizationId(),
                        authenticatedUser.organizationName(),
                        authenticatedUser.organizationSlug()
                ),
                authenticatedUser.roles(),
                authenticatedUser.permissions()
        );
    }

    public record OrganizationResponse(
            UUID id,
            String name,
            String slug
    ) {
    }
}
