package com.academy.platform.program;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveProgramRequest(

        @NotBlank
        @Size(max = 50)
        @Pattern(
                regexp = "^[A-Za-z0-9_-]+$",
                message = "Code may contain letters, numbers, "
                        + "underscores, and hyphens only."
        )
        String code,

        @NotBlank
        @Size(max = 200)
        String name,

        @Size(max = 5000)
        String description,

        @Size(max = 100)
        String category,

        @Min(0)
        @Max(120)
        Integer minimumAge,

        @Min(0)
        @Max(120)
        Integer maximumAge
) {
}
