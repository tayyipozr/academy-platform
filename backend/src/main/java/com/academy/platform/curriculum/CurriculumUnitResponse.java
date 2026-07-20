package com.academy.platform.curriculum;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CurriculumUnitResponse(
        UUID id,
        UUID curriculumId,
        UUID parentUnitId,
        String parentUnitTitle,
        String code,
        String title,
        String description,
        int sequenceNumber,
        Integer estimatedSessions,
        int outcomeCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
