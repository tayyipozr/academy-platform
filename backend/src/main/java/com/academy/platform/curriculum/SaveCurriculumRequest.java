package com.academy.platform.curriculum;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveCurriculumRequest(

        @NotNull
        UUID programId,

        @NotBlank
        @Size(max = 50)
        @Pattern(
                regexp = "^[A-Za-z0-9_.-]+$",
                message = "Code may contain letters, numbers, "
                        + "underscores, periods, and hyphens only."
        )
        String code,

        @NotBlank
        @Size(max = 200)
        String name,

        @Size(max = 5000)
        String description,

        @NotBlank
        @Size(max = 50)
        String versionLabel
) {
}
