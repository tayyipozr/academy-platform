package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.util.UUID;

public record PublishedCriterionScoreResponse(
        UUID criterionId,
        String criterionCode,
        String criterionName,
        String criterionDescription,
        BigDecimal weightPercentage,
        BigDecimal score,
        BigDecimal weightedScore,
        String evaluatorComment
) {
}
