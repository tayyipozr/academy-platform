package com.academy.platform.evaluation;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EvaluationPublicationService {

    private final JdbcTemplate jdbcTemplate;
    private final StudentEvaluationService evaluationService;
    private final AuditService auditService;

    public EvaluationPublicationService(
            JdbcTemplate jdbcTemplate,
            StudentEvaluationService evaluationService,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.evaluationService = evaluationService;
        this.auditService = auditService;
    }

    @Transactional
    public StudentEvaluationResponse publishEvaluation(
            AuthenticatedUser actor,
            UUID evaluationId
    ) {
        PublicationRecord evaluation =
                findEvaluationForUpdate(
                        actor.organizationId(),
                        evaluationId
                );

        if (evaluation.status()
                != StudentEvaluationStatus.SUBMITTED) {
            throw new BusinessRuleException(
                    "Only submitted evaluations can be published."
            );
        }

        if (evaluation.overallScore() == null) {
            throw new BusinessRuleException(
                    "An evaluation without an overall score "
                            + "cannot be published."
            );
        }

        Integer criterionCount =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM evaluation_criteria
                        WHERE organization_id = ?
                          AND template_id = ?
                        """,
                        Integer.class,
                        actor.organizationId(),
                        evaluation.templateId()
                );

        Integer scoreCount =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM student_evaluation_scores
                        WHERE organization_id = ?
                          AND evaluation_id = ?
                        """,
                        Integer.class,
                        actor.organizationId(),
                        evaluationId
                );

        if (criterionCount == null
                || criterionCount == 0
                || !criterionCount.equals(scoreCount)) {
            throw new BusinessRuleException(
                    "Every criterion must be scored before "
                            + "the evaluation can be published."
            );
        }

        OffsetDateTime publishedAt =
                OffsetDateTime.now(ZoneOffset.UTC);

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE student_evaluations
                SET
                    status = 'PUBLISHED',
                    published_by = ?,
                    published_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'SUBMITTED'
                """,
                actor.userId(),
                publishedAt,
                publishedAt,
                evaluationId,
                actor.organizationId()
        );

        if (updatedRows == 0) {
            throw new BusinessRuleException(
                    "The evaluation could not be published."
            );
        }

        auditService.record(
                actor,
                "STUDENT_EVALUATION_PUBLISHED",
                "STUDENT_EVALUATION",
                evaluationId,
                "Student evaluation published."
        );

        return evaluationService.findEvaluation(
                actor,
                evaluationId
        );
    }

    private PublicationRecord findEvaluationForUpdate(
            UUID organizationId,
            UUID evaluationId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    template_id,
                    status,
                    overall_score
                FROM student_evaluations
                WHERE id = ?
                  AND organization_id = ?
                FOR UPDATE
                """,
                (resultSet, rowNumber) ->
                        new PublicationRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "template_id",
                                        UUID.class
                                ),
                                StudentEvaluationStatus.valueOf(
                                        resultSet.getString(
                                                "status"
                                        )
                                ),
                                resultSet.getBigDecimal(
                                        "overall_score"
                                )
                        ),
                evaluationId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Student evaluation was not found."
                )
        );
    }

    private record PublicationRecord(
            UUID id,
            UUID templateId,
            StudentEvaluationStatus status,
            java.math.BigDecimal overallScore
    ) {
    }
}
