package com.academy.platform.curriculumassignment;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CurriculumUnitProgressResponse(
        UUID id,
        UUID assignmentId,
        UUID unitId,
        UUID parentUnitId,
        String unitCode,
        String unitTitle,
        int sequenceNumber,
        Integer estimatedSessions,
        CurriculumUnitProgressStatus status,
        int completedSessions,
        OffsetDateTime completedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
