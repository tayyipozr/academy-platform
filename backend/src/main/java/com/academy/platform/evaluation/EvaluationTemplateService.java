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
public class EvaluationTemplateService {

    private static final BigDecimal REQUIRED_WEIGHT =
            new BigDecimal("100.00");

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public EvaluationTemplateService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<EvaluationTemplateResponse> findTemplates(
            UUID organizationId,
            String search,
            UUID programId,
            boolean includeArchived
    ) {
        String searchPattern =
                normalizeSearch(search);

        return jdbcTemplate.query(
                """
                SELECT
                    et.id,
                    et.program_id,
                    p.code AS program_code,
                    p.name AS program_name,
                    et.code,
                    et.name,
                    et.description,
                    et.version_label,
                    et.minimum_score,
                    et.maximum_score,
                    et.passing_score,
                    et.status,
                    et.created_at,
                    et.updated_at,

                    (
                        SELECT COUNT(*)
                        FROM evaluation_criteria ec
                        WHERE ec.organization_id =
                                  et.organization_id
                          AND ec.template_id = et.id
                    ) AS criterion_count,

                    (
                        SELECT COALESCE(
                            SUM(ec.weight_percentage),
                            0
                        )
                        FROM evaluation_criteria ec
                        WHERE ec.organization_id =
                                  et.organization_id
                          AND ec.template_id = et.id
                    ) AS total_weight

                FROM evaluation_templates et

                JOIN programs p
                    ON p.id = et.program_id
                   AND p.organization_id =
                       et.organization_id

                WHERE et.organization_id = ?

                  AND (
                      ? = TRUE
                      OR et.status <> 'ARCHIVED'
                  )

                  AND (
                      ? = '%%'
                      OR LOWER(et.code) LIKE ?
                      OR LOWER(et.name) LIKE ?
                      OR LOWER(p.name) LIKE ?
                      OR LOWER(et.version_label) LIKE ?
                  )

                  AND (
                      ?::UUID IS NULL
                      OR et.program_id = ?::UUID
                  )

                ORDER BY
                    p.name,
                    et.name,
                    et.version_label
                """,
                (resultSet, rowNumber) ->
                        mapTemplate(resultSet),
                organizationId,
                includeArchived,
                searchPattern,
                searchPattern,
                searchPattern,
                searchPattern,
                searchPattern,
                programId,
                programId
        );
    }

    @Transactional(readOnly = true)
    public EvaluationTemplateResponse findTemplate(
            UUID organizationId,
            UUID templateId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    et.id,
                    et.program_id,
                    p.code AS program_code,
                    p.name AS program_name,
                    et.code,
                    et.name,
                    et.description,
                    et.version_label,
                    et.minimum_score,
                    et.maximum_score,
                    et.passing_score,
                    et.status,
                    et.created_at,
                    et.updated_at,

                    (
                        SELECT COUNT(*)
                        FROM evaluation_criteria ec
                        WHERE ec.organization_id =
                                  et.organization_id
                          AND ec.template_id = et.id
                    ) AS criterion_count,

                    (
                        SELECT COALESCE(
                            SUM(ec.weight_percentage),
                            0
                        )
                        FROM evaluation_criteria ec
                        WHERE ec.organization_id =
                                  et.organization_id
                          AND ec.template_id = et.id
                    ) AS total_weight

                FROM evaluation_templates et

                JOIN programs p
                    ON p.id = et.program_id
                   AND p.organization_id =
                       et.organization_id

                WHERE et.id = ?
                  AND et.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapTemplate(resultSet),
                templateId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Evaluation template was not found."
                )
        );
    }

    @Transactional
    public EvaluationTemplateResponse createTemplate(
            AuthenticatedUser actor,
            SaveEvaluationTemplateRequest request
    ) {
        validateProgram(
                actor.organizationId(),
                request.programId()
        );

        validateScoreRange(request);

        ensureUnique(
                actor.organizationId(),
                null,
                request
        );

        UUID templateId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO evaluation_templates
                (
                    id,
                    organization_id,
                    program_id,
                    code,
                    name,
                    description,
                    version_label,
                    minimum_score,
                    maximum_score,
                    passing_score,
                    status,
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
                    'DRAFT',
                    ?,
                    ?,
                    0
                )
                """,
                templateId,
                actor.organizationId(),
                request.programId(),
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(
                        request.description()
                ),
                request.versionLabel().trim(),
                normalizeScore(
                        request.minimumScore()
                ),
                normalizeScore(
                        request.maximumScore()
                ),
                normalizeScore(
                        request.passingScore()
                ),
                now,
                now
        );

        auditService.record(
                actor,
                "EVALUATION_TEMPLATE_CREATED",
                "EVALUATION_TEMPLATE",
                templateId,
                "Evaluation template created: "
                        + request.name().trim()
        );

        return findTemplate(
                actor.organizationId(),
                templateId
        );
    }

    @Transactional
    public EvaluationTemplateResponse updateTemplate(
            AuthenticatedUser actor,
            UUID templateId,
            SaveEvaluationTemplateRequest request
    ) {
        EvaluationTemplateResponse existing =
                findTemplate(
                        actor.organizationId(),
                        templateId
                );

        requireDraft(existing);

        validateProgram(
                actor.organizationId(),
                request.programId()
        );

        validateScoreRange(request);

        ensureUnique(
                actor.organizationId(),
                templateId,
                request
        );

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE evaluation_templates
                SET
                    program_id = ?,
                    code = ?,
                    name = ?,
                    description = ?,
                    version_label = ?,
                    minimum_score = ?,
                    maximum_score = ?,
                    passing_score = ?,
                    updated_at = ?,
                    version = version + 1

                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'DRAFT'
                """,
                request.programId(),
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(
                        request.description()
                ),
                request.versionLabel().trim(),
                normalizeScore(
                        request.minimumScore()
                ),
                normalizeScore(
                        request.maximumScore()
                ),
                normalizeScore(
                        request.passingScore()
                ),
                OffsetDateTime.now(ZoneOffset.UTC),
                templateId,
                actor.organizationId()
        );

        if (updatedRows == 0) {
            throw new ResourceNotFoundException(
                    "Evaluation template was not found."
            );
        }

        auditService.record(
                actor,
                "EVALUATION_TEMPLATE_UPDATED",
                "EVALUATION_TEMPLATE",
                templateId,
                "Evaluation template updated."
        );

        return findTemplate(
                actor.organizationId(),
                templateId
        );
    }

    @Transactional
    public void updateStatus(
            AuthenticatedUser actor,
            UUID templateId,
            EvaluationTemplateStatus newStatus
    ) {
        EvaluationTemplateResponse existing =
                findTemplate(
                        actor.organizationId(),
                        templateId
                );

        if (existing.status() == newStatus) {
            return;
        }

        validateStatusTransition(
                existing,
                newStatus
        );

        jdbcTemplate.update(
                """
                UPDATE evaluation_templates
                SET
                    status = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                newStatus.name(),
                OffsetDateTime.now(ZoneOffset.UTC),
                templateId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "EVALUATION_TEMPLATE_STATUS_UPDATED",
                "EVALUATION_TEMPLATE",
                templateId,
                "Template status changed from "
                        + existing.status()
                        + " to " + newStatus
        );
    }

    private void validateProgram(
            UUID organizationId,
            UUID programId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM programs
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'ACTIVE'
                """,
                Integer.class,
                programId,
                organizationId
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected program is invalid "
                            + "or inactive."
            );
        }
    }

    private void validateScoreRange(
            SaveEvaluationTemplateRequest request
    ) {
        BigDecimal minimum =
                request.minimumScore();

        BigDecimal maximum =
                request.maximumScore();

        BigDecimal passing =
                request.passingScore();

        if (maximum.compareTo(minimum) <= 0) {
            throw new BusinessRuleException(
                    "Maximum score must be greater than "
                            + "minimum score."
            );
        }

        if (
                passing != null
                && (
                        passing.compareTo(minimum) < 0
                        || passing.compareTo(maximum) > 0
                )
        ) {
            throw new BusinessRuleException(
                    "Passing score must be within "
                            + "the template score range."
            );
        }
    }

    private void ensureUnique(
            UUID organizationId,
            UUID excludedTemplateId,
            SaveEvaluationTemplateRequest request
    ) {
        Integer count;

        if (excludedTemplateId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM evaluation_templates
                    WHERE organization_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR (
                              program_id = ?
                              AND LOWER(name) = LOWER(?)
                              AND LOWER(version_label) =
                                  LOWER(?)
                          )
                      )
                    """,
                    Integer.class,
                    organizationId,
                    normalizeCode(request.code()),
                    request.programId(),
                    request.name().trim(),
                    request.versionLabel().trim()
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM evaluation_templates
                    WHERE organization_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR (
                              program_id = ?
                              AND LOWER(name) = LOWER(?)
                              AND LOWER(version_label) =
                                  LOWER(?)
                          )
                      )
                      AND id <> ?
                    """,
                    Integer.class,
                    organizationId,
                    normalizeCode(request.code()),
                    request.programId(),
                    request.name().trim(),
                    request.versionLabel().trim(),
                    excludedTemplateId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "An evaluation template with this "
                            + "code or program version "
                            + "already exists."
            );
        }
    }

    private void validateStatusTransition(
            EvaluationTemplateResponse template,
            EvaluationTemplateStatus target
    ) {
        boolean allowed = switch (
                template.status()
        ) {
            case DRAFT ->
                    target
                    == EvaluationTemplateStatus.ACTIVE
                    || target
                    == EvaluationTemplateStatus.ARCHIVED;

            case ACTIVE ->
                    target
                    == EvaluationTemplateStatus.ARCHIVED;

            case ARCHIVED -> false;
        };

        if (!allowed) {
            throw new BusinessRuleException(
                    "Template status cannot change from "
                            + template.status()
                            + " to " + target + "."
            );
        }

        if (target
                == EvaluationTemplateStatus.ACTIVE) {

            if (template.criterionCount() == 0) {
                throw new BusinessRuleException(
                        "An evaluation template must contain "
                                + "at least one criterion "
                                + "before activation."
                );
            }

            if (
                    template.totalWeight()
                            .setScale(
                                    2,
                                    RoundingMode.HALF_UP
                            )
                            .compareTo(
                                    REQUIRED_WEIGHT
                            ) != 0
            ) {
                throw new BusinessRuleException(
                        "Criterion weights must total "
                                + "exactly 100 before activation."
                );
            }
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

    private EvaluationTemplateResponse mapTemplate(
            ResultSet resultSet
    ) throws SQLException {
        return new EvaluationTemplateResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "program_id",
                        UUID.class
                ),
                resultSet.getString(
                        "program_code"
                ),
                resultSet.getString(
                        "program_name"
                ),
                resultSet.getString("code"),
                resultSet.getString("name"),
                resultSet.getString("description"),
                resultSet.getString(
                        "version_label"
                ),
                resultSet.getBigDecimal(
                        "minimum_score"
                ),
                resultSet.getBigDecimal(
                        "maximum_score"
                ),
                resultSet.getBigDecimal(
                        "passing_score"
                ),
                EvaluationTemplateStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getInt("criterion_count"),
                resultSet.getBigDecimal(
                        "total_weight"
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

    private BigDecimal normalizeScore(
            BigDecimal score
    ) {
        if (score == null) {
            return null;
        }

        return score.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    private String normalizeCode(String code) {
        return code
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return "%%";
        }

        return "%"
                + search.trim()
                .toLowerCase(Locale.ROOT)
                + "%";
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
