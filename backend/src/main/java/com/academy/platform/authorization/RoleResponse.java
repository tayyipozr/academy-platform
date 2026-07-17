package com.academy.platform.authorization;

import java.util.UUID;

public record RoleResponse(
        UUID id,
        String name,
        String description,
        boolean systemRole
) {
}
