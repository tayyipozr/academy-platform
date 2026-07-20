package com.academy.platform.curriculum;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveLearningOutcomeRequest(

        @NotBlank
        @Size(max = 50)
        @Pattern(
                regexp = "^[A-Za-z0-9_.-]+$",
                message = "Code may contain letters, numbers, "
                        + "underscores, periods, and hyphens only."
        )
        String code,

        @NotBlank
        @Size(max = 300)
        String title,

        @Size(max = 5000)
        String description,

        @NotNull
        @Min(1)
        Integer sequenceNumber
) {
}
