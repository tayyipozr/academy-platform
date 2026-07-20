package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StudentEvaluationScoreResponse(
        UUID id,
        UUID criterionId,
        String criterionCode,
        String criterionName,
        String criterionDescription,
        BigDecimal weightPercentage,
        int sequenceNumber,
        BigDecimal score,
        BigDecimal weightedScore,
        String evaluatorComment,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
