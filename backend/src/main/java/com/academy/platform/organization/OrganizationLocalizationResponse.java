package com.academy.platform.organization;

public record OrganizationLocalizationResponse(
        String locale,
        OrganizationTerminologyResponse terminology
) {
}
