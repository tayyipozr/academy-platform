package com.academy.platform.organization;

import java.util.UUID;

public record OrganizationSettingsResponse(
        UUID id,
        String name,
        String slug,
        String defaultLocale,
        String timezone,
        OrganizationTerminologyResponse terminology
) {
}
