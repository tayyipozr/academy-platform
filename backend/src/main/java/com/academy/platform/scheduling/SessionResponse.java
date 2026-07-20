package com.academy.platform.scheduling;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SessionResponse(
        UUID id,
        UUID groupId,
        String groupCode,
        String groupName,
        UUID scheduleRuleId,
        UUID curriculumAssignmentId,
        UUID curriculumId,
        UUID curriculumUnitId,
        String curriculumUnitCode,
        String curriculumUnitTitle,
        UUID leadStaffId,
        String leadStaffName,
        String title,
        String description,
        OffsetDateTime scheduledStart,
        OffsetDateTime scheduledEnd,
        String location,
        SessionStatus status,
        String completionNotes,
        String cancellationReason,
        OffsetDateTime completedAt,
        OffsetDateTime cancelledAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
