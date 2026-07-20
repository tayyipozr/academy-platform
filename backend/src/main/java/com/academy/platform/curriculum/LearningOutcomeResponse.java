package com.academy.platform.curriculum;

import java.time.OffsetDateTime;
import java.util.UUID;

public record LearningOutcomeResponse(
        UUID id,
        UUID curriculumId,
        UUID unitId,
        String unitCode,
        String unitTitle,
        String code,
        String title,
        String description,
        int sequenceNumber,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
