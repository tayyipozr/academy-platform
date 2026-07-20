package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ConflictException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EvaluationCriterionService {

    private static final BigDecimal MAX_TOTAL_WEIGHT =
            new BigDecimal("100.00");

    private final JdbcTemplate jdbcTemplate;
    private final EvaluationTemplateService
            templateService;
    private final AuditService auditService;

    public EvaluationCriterionService(
            JdbcTemplate jdbcTemplate,
            EvaluationTemplateService templateService,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.templateService = templateService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<EvaluationCriterionResponse>
    findCriteria(
            UUID organizationId,
            UUID templateId
    ) {
        templateService.findTemplate(
                organizationId,
                templateId
        );

        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    template_id,
                    code,
                    name,
                    description,
                    weight_percentage,
                    sequence_number,
                    created_at,
                    updated_at

                FROM evaluation_criteria

                WHERE organization_id = ?
                  AND template_id = ?

                ORDER BY sequence_number
                """,
                (resultSet, rowNumber) ->
                        mapCriterion(resultSet),
                organizationId,
                templateId
        );
    }

    @Transactional
    public EvaluationCriterionResponse
    createCriterion(
            AuthenticatedUser actor,
            UUID templateId,
            SaveEvaluationCriterionRequest request
    ) {
        EvaluationTemplateResponse template =
                templateService.findTemplate(
                        actor.organizationId(),
                        templateId
                );

        requireDraft(template);

        ensureUnique(
                actor.organizationId(),
                templateId,
                null,
                request.code(),
                request.sequenceNumber()
        );

        validateTotalWeight(
                actor.organizationId(),
                templateId,
                null,
                request.weightPercentage()
        );

        UUID criterionId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO evaluation_criteria
                (
                    id,
                    organization_id,
                    template_id,
                    code,
                    name,
                    description,
                    weight_percentage,
                    sequence_number,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    0
                )
                """,
                criterionId,
                actor.organizationId(),
                templateId,
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(
                        request.description()
                ),
                normalizeWeight(
                        request.weightPercentage()
                ),
                request.sequenceNumber(),
                now,
                now
        );

        auditService.record(
                actor,
                "EVALUATION_CRITERION_CREATED",
                "EVALUATION_CRITERION",
                criterionId,
                "Evaluation criterion created: "
                        + request.name().trim()
        );

        return findCriterion(
                actor.organizationId(),
                templateId,
                criterionId
        );
    }

    @Transactional
    public EvaluationCriterionResponse
    updateCriterion(
            AuthenticatedUser actor,
            UUID templateId,
            UUID criterionId,
            SaveEvaluationCriterionRequest request
    ) {
        EvaluationTemplateResponse template =
                templateService.findTemplate(
                        actor.organizationId(),
                        templateId
                );

        requireDraft(template);

        findCriterion(
                actor.organizationId(),
                templateId,
                criterionId
        );

        ensureUnique(
                actor.organizationId(),
                templateId,
                criterionId,
                request.code(),
                request.sequenceNumber()
        );

        validateTotalWeight(
                actor.organizationId(),
                templateId,
                criterionId,
                request.weightPercentage()
        );

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE evaluation_criteria
                SET
                    code = ?,
                    name = ?,
                    description = ?,
                    weight_percentage = ?,
                    sequence_number = ?,
                    updated_at = ?,
                    version = version + 1

                WHERE id = ?
                  AND template_id = ?
                  AND organization_id = ?
                """,
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(
                        request.description()
                ),
                normalizeWeight(
                        request.weightPercentage()
                ),
                request.sequenceNumber(),
                OffsetDateTime.now(ZoneOffset.UTC),
                criterionId,
                templateId,
                actor.organizationId()
        );

        if (updatedRows == 0) {
            throw new ResourceNotFoundException(
                    "Evaluation criterion was not found."
            );
        }

        auditService.record(
                actor,
                "EVALUATION_CRITERION_UPDATED",
                "EVALUATION_CRITERION",
                criterionId,
                "Evaluation criterion updated."
        );

        return findCriterion(
                actor.organizationId(),
                templateId,
                criterionId
        );
    }

    @Transactional(readOnly = true)
    public EvaluationCriterionResponse
    findCriterion(
            UUID organizationId,
            UUID templateId,
            UUID criterionId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    template_id,
                    code,
                    name,
                    description,
                    weight_percentage,
                    sequence_number,
                    created_at,
                    updated_at

                FROM evaluation_criteria

                WHERE id = ?
                  AND template_id = ?
                  AND organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapCriterion(resultSet),
                criterionId,
                templateId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Evaluation criterion was not found."
                )
        );
    }

    private void validateTotalWeight(
            UUID organizationId,
            UUID templateId,
            UUID excludedCriterionId,
            BigDecimal requestedWeight
    ) {
        BigDecimal existingWeight;

        if (excludedCriterionId == null) {
            existingWeight =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COALESCE(
                                SUM(weight_percentage),
                                0
                            )
                            FROM evaluation_criteria
                            WHERE organization_id = ?
                              AND template_id = ?
                            """,
                            BigDecimal.class,
                            organizationId,
                            templateId
                    );
        } else {
            existingWeight =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COALESCE(
                                SUM(weight_percentage),
                                0
                            )
                            FROM evaluation_criteria
                            WHERE organization_id = ?
                              AND template_id = ?
                              AND id <> ?
                            """,
                            BigDecimal.class,
                            organizationId,
                            templateId,
                            excludedCriterionId
                    );
        }

        BigDecimal total =
                (
                    existingWeight == null
                        ? BigDecimal.ZERO
                        : existingWeight
                )
                .add(requestedWeight)
                .setScale(
                        2,
                        RoundingMode.HALF_UP
                );

        if (total.compareTo(MAX_TOTAL_WEIGHT) > 0) {
            throw new BusinessRuleException(
                    "Criterion weights cannot total more "
                            + "than 100."
            );
        }
    }

    private void ensureUnique(
            UUID organizationId,
            UUID templateId,
            UUID excludedCriterionId,
            String code,
            int sequenceNumber
    ) {
        Integer count;

        if (excludedCriterionId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM evaluation_criteria
                    WHERE organization_id = ?
                      AND template_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR sequence_number = ?
                      )
                    """,
                    Integer.class,
                    organizationId,
                    templateId,
                    normalizeCode(code),
                    sequenceNumber
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM evaluation_criteria
                    WHERE organization_id = ?
                      AND template_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR sequence_number = ?
                      )
                      AND id <> ?
                    """,
                    Integer.class,
                    organizationId,
                    templateId,
                    normalizeCode(code),
                    sequenceNumber,
                    excludedCriterionId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A criterion with this code or sequence "
                            + "already exists."
            );
        }
    }

    private void requireDraft(
            EvaluationTemplateResponse template
    ) {
        if (template.status()
                != EvaluationTemplateStatus.DRAFT) {
            throw new BusinessRuleException(
                    "Only draft evaluation templates "
                            + "can be modified."
            );
        }
    }

    private EvaluationCriterionResponse mapCriterion(
            ResultSet resultSet
    ) throws SQLException {
        return new EvaluationCriterionResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "template_id",
                        UUID.class
                ),
                resultSet.getString("code"),
                resultSet.getString("name"),
                resultSet.getString("description"),
                resultSet.getBigDecimal(
                        "weight_percentage"
                ),
                resultSet.getInt(
                        "sequence_number"
                ),
                resultSet.getObject(
                        "created_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "updated_at",
                        OffsetDateTime.class
                )
        );
    }

    private BigDecimal normalizeWeight(
            BigDecimal weight
    ) {
        return weight.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    private String normalizeCode(String code) {
        return code
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
