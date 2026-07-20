package com.academy.platform.curriculumassignment;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReplaceGroupCurriculumRequest(

        @NotNull
        UUID curriculumId,

        @NotNull
        LocalDate replacementDate,

        @Size(max = 500)
        String reason
) {
}
