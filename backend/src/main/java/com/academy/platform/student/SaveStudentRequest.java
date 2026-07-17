package com.academy.platform.student;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SaveStudentRequest(

        UUID branchId,

        @NotBlank
        @Size(max = 50)
        String studentNumber,

        @NotBlank
        @Size(max = 100)
        String firstName,

        @NotBlank
        @Size(max = 100)
        String lastName,

        LocalDate birthDate,

        StudentGender gender,

        LocalDate enrollmentDate,

        @Size(max = 5000)
        String medicalNotes,

        @Size(max = 5000)
        String allergies,

        @Size(max = 200)
        String emergencyContactName,

        @Size(max = 50)
        String emergencyContactPhone,

        @Size(max = 5000)
        String notes
) {
}
