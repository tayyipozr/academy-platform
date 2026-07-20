package com.academy.platform.enrollment;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EndEnrollmentRequest(

        @NotNull
        EnrollmentStatus status,

        @NotNull
        LocalDate endedAt,

        @Size(max = 500)
        String reason
) {
}
