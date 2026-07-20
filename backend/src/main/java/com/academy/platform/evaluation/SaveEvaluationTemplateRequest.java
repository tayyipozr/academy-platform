package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveEvaluationTemplateRequest(

        @NotNull
        UUID programId,

        @NotBlank
        @Size(max = 50)
        @Pattern(
                regexp = "^[A-Za-z0-9_.-]+$",
                message = "Code may contain letters, numbers, "
                        + "periods, underscores, and hyphens."
        )
        String code,

        @NotBlank
        @Size(max = 200)
        String name,

        @Size(max = 5000)
        String description,

        @NotBlank
        @Size(max = 50)
        String versionLabel,

        @NotNull
        @Digits(integer = 8, fraction = 2)
        BigDecimal minimumScore,

        @NotNull
        @Digits(integer = 8, fraction = 2)
        @DecimalMin(
                value = "0.01",
                message = "Maximum score must be positive."
        )
        BigDecimal maximumScore,

        @Digits(integer = 8, fraction = 2)
        BigDecimal passingScore
) {
}
