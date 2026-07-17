package com.academy.platform.staff;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StaffResponse(
        UUID id,
        UUID membershipId,
        UUID userId,
        String email,
        String firstName,
        String lastName,
        UUID branchId,
        String branchName,
        String staffNumber,
        String title,
        String specialization,
        EmploymentStatus employmentStatus,
        String biography,
        LocalDate hiredAt,
        LocalDate endedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
