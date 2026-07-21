package com.academy.platform.reporting;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record CreateStudentProgressExportRequest(

        @NotNull
        UUID studentId,

        UUID groupId,

        LocalDate dateFrom,

        LocalDate dateTo
) {
}
