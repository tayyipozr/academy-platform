package com.academy.platform.curriculumassignment;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EndGroupCurriculumAssignmentRequest(

        @NotNull
        GroupCurriculumAssignmentStatus status,

        @NotNull
        LocalDate endDate,

        @Size(max = 500)
        String reason
) {
}
