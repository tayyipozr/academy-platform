package com.academy.platform.evaluation;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveEvaluationCriterionRequest(

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

        @NotNull
        @Digits(integer = 3, fraction = 2)
        @DecimalMin(
                value = "0.01",
                message = "Weight must be greater than zero."
        )
        @DecimalMax(
                value = "100.00",
                message = "Weight cannot exceed 100."
        )
        BigDecimal weightPercentage,

        @NotNull
        @Min(1)
        Integer sequenceNumber
) {
}
