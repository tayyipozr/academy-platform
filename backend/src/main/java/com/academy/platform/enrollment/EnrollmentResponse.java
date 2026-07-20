package com.academy.platform.enrollment;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EnrollmentResponse(
        UUID id,
        UUID groupId,
        String groupCode,
        String groupName,
        UUID studentId,
        String studentNumber,
        String firstName,
        String lastName,
        LocalDate birthDate,
        EnrollmentStatus status,
        LocalDate enrolledAt,
        LocalDate endedAt,
        String endReason,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
