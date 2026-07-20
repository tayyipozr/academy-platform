package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EvaluationCriterionResponse(
        UUID id,
        UUID templateId,
        String code,
        String name,
        String description,
        BigDecimal weightPercentage,
        int sequenceNumber,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
