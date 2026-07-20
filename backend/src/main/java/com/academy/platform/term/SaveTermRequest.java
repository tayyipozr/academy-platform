package com.academy.platform.term;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveTermRequest(

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

        @NotNull
        LocalDate startDate,

        @NotNull
        LocalDate endDate
) {
}
