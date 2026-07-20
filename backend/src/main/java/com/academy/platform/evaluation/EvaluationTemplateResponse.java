package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EvaluationTemplateResponse(
        UUID id,
        UUID programId,
        String programCode,
        String programName,
        String code,
        String name,
        String description,
        String versionLabel,
        BigDecimal minimumScore,
        BigDecimal maximumScore,
        BigDecimal passingScore,
        EvaluationTemplateStatus status,
        int criterionCount,
        BigDecimal totalWeight,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
