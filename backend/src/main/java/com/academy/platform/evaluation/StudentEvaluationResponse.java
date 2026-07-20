package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record StudentEvaluationResponse(
        UUID id,

        UUID studentId,
        String studentNumber,
        String studentFirstName,
        String studentLastName,

        UUID groupId,
        String groupCode,
        String groupName,

        UUID sessionId,
        String sessionTitle,

        UUID templateId,
        String templateCode,
        String templateName,
        String templateVersion,

        BigDecimal minimumScore,
        BigDecimal maximumScore,
        BigDecimal passingScore,

        UUID evaluatorUserId,
        UUID evaluatorStaffId,
        String evaluatorName,

        LocalDate evaluationDate,
        BigDecimal overallScore,
        Boolean passed,
        String evaluatorComment,

        StudentEvaluationStatus status,

        UUID submittedBy,
        OffsetDateTime submittedAt,

        UUID publishedBy,
        OffsetDateTime publishedAt,

        int criterionCount,
        int scoredCriterionCount,
        boolean complete,

        List<StudentEvaluationScoreResponse> scores,

        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public StudentEvaluationResponse {
        scores = List.copyOf(scores);
    }
}
