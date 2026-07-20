package com.academy.platform.curriculumassignment;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record CreateGroupCurriculumAssignmentRequest(

        @NotNull
        UUID curriculumId,

        @NotNull
        LocalDate startDate
) {
}
