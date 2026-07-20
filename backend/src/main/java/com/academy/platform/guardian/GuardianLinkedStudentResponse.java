package com.academy.platform.guardian;

import java.time.LocalDate;
import java.util.UUID;

public record GuardianLinkedStudentResponse(
        UUID studentId,
        String studentNumber,
        String firstName,
        String lastName,
        LocalDate birthDate,
        String status,
        UUID branchId,
        String branchName,
        String relationshipType,
        boolean primaryContact,
        boolean legalGuardian,
        boolean pickupAuthorized
) {
}
