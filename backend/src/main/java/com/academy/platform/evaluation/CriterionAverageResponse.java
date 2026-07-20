package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.util.UUID;

public record CriterionAverageResponse(
        UUID templateId,
        String templateName,
        UUID criterionId,
        String criterionCode,
        String criterionName,
        BigDecimal weightPercentage,
        int evaluationCount,
        BigDecimal averageScore,
        BigDecimal averageNormalizedScore
) {
}
