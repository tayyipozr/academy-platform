package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveEvaluationScoreRequest(

        @NotNull
        UUID criterionId,

        @NotNull
        @Digits(integer = 8, fraction = 2)
        BigDecimal score,

        @Size(max = 2000)
        String comment
) {
}
