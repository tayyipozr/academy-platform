package com.academy.platform.curriculumassignment;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record GroupCurriculumAssignmentResponse(
        UUID id,
        UUID groupId,
        String groupCode,
        String groupName,
        UUID curriculumId,
        String curriculumCode,
        String curriculumName,
        String curriculumVersion,
        GroupCurriculumAssignmentStatus status,
        LocalDate startDate,
        LocalDate endDate,
        String endReason,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
