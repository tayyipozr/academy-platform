package com.academy.platform.organization;

public record OrganizationTerminologyResponse(
        String studentLabel,
        String staffLabel,
        String groupLabel,
        String sessionLabel,
        String programLabel
) {
}
