package com.academy.platform.curriculum;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CurriculumResponse(
        UUID id,
        UUID programId,
        String programCode,
        String programName,
        String code,
        String name,
        String description,
        String versionLabel,
        CurriculumStatus status,
        int unitCount,
        int outcomeCount,
        int estimatedSessionCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
