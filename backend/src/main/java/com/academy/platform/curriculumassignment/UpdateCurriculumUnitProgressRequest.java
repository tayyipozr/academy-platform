package com.academy.platform.curriculumassignment;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateCurriculumUnitProgressRequest(

        @NotNull
        CurriculumUnitProgressStatus status,

        @NotNull
        @Min(0)
        Integer completedSessions
) {
}
