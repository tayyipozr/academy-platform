package com.academy.platform.authentication;

import java.io.Serial;
import java.io.Serializable;
import java.security.Principal;
import java.util.Set;
import java.util.UUID;

public record AuthenticatedUser(
        UUID userId,
        UUID organizationId,
        UUID membershipId,
        long securityVersion,
        String organizationName,
        String organizationSlug,
        String email,
        String firstName,
        String lastName,
        Set<String> roles,
        Set<String> permissions
) implements Serializable, Principal {

    @Serial
    private static final long serialVersionUID = 1L;

    public AuthenticatedUser {
        roles = Set.copyOf(roles);
        permissions = Set.copyOf(permissions);
    }

    @Override
    public String getName() {
        return userId.toString();
    }

    public String fullName() {
        return firstName + " " + lastName;
    }

    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }
}