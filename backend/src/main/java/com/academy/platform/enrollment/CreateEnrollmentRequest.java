package com.academy.platform.enrollment;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record CreateEnrollmentRequest(

        @NotNull
        UUID studentId,

        @NotNull
        LocalDate enrolledAt
) {
}
