package com.academy.platform.scheduling;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ScheduleRuleResponse(
        UUID id,
        UUID groupId,
        String groupCode,
        String groupName,
        UUID curriculumAssignmentId,
        UUID curriculumId,
        UUID curriculumUnitId,
        String curriculumUnitCode,
        String curriculumUnitTitle,
        UUID leadStaffId,
        String leadStaffName,
        String title,
        String description,
        int dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        LocalDate effectiveFrom,
        LocalDate effectiveUntil,
        String timezone,
        String location,
        ScheduleRuleStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
