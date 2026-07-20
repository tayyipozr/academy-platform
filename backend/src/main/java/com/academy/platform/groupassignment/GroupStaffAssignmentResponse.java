package com.academy.platform.groupassignment;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record GroupStaffAssignmentResponse(
        UUID id,
        UUID groupId,
        String groupCode,
        String groupName,
        UUID staffId,
        String staffNumber,
        String firstName,
        String lastName,
        String email,
        String title,
        String specialization,
        GroupStaffRole assignmentRole,
        GroupStaffAssignmentStatus status,
        LocalDate startDate,
        LocalDate endDate,
        String endReason,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
