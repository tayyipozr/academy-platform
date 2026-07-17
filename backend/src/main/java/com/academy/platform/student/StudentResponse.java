package com.academy.platform.student;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StudentResponse(
        UUID id,
        UUID branchId,
        String branchName,
        String studentNumber,
        String firstName,
        String lastName,
        LocalDate birthDate,
        StudentGender gender,
        StudentStatus status,
        LocalDate enrollmentDate,
        String medicalNotes,
        String allergies,
        String emergencyContactName,
        String emergencyContactPhone,
        String notes,
        int guardianCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
