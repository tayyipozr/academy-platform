package com.academy.platform.curriculum;

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
public class LearningOutcomeService {

    private final JdbcTemplate jdbcTemplate;
    private final CurriculumService curriculumService;
    private final CurriculumUnitService unitService;
    private final AuditService auditService;

    public LearningOutcomeService(
            JdbcTemplate jdbcTemplate,
            CurriculumService curriculumService,
            CurriculumUnitService unitService,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.curriculumService = curriculumService;
        this.unitService = unitService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<LearningOutcomeResponse> findOutcomes(
            UUID organizationId,
            UUID curriculumId,
            UUID unitId
    ) {
        unitService.findUnit(
                organizationId,
                curriculumId,
                unitId
        );

        return jdbcTemplate.query(
                """
                SELECT
                    lo.id,
                    lo.curriculum_id,
                    lo.unit_id,
                    cu.code AS unit_code,
                    cu.title AS unit_title,
                    lo.code,
                    lo.title,
                    lo.description,
                    lo.sequence_number,
                    lo.created_at,
                    lo.updated_at

                FROM learning_outcomes lo

                JOIN curriculum_units cu
                    ON cu.id = lo.unit_id
                   AND cu.curriculum_id =
                       lo.curriculum_id
                   AND cu.organization_id =
                       lo.organization_id

                WHERE lo.organization_id = ?
                  AND lo.curriculum_id = ?
                  AND lo.unit_id = ?

                ORDER BY lo.sequence_number
                """,
                (resultSet, rowNumber) ->
                        mapOutcome(resultSet),
                organizationId,
                curriculumId,
                unitId
        );
    }

    @Transactional
    public LearningOutcomeResponse createOutcome(
            AuthenticatedUser actor,
            UUID curriculumId,
            UUID unitId,
            SaveLearningOutcomeRequest request
    ) {
        requireDraft(
                actor.organizationId(),
                curriculumId
        );

        unitService.findUnit(
                actor.organizationId(),
                curriculumId,
                unitId
        );

        ensureUnique(
                actor.organizationId(),
                curriculumId,
                unitId,
                null,
                request.code(),
                request.sequenceNumber()
        );

        UUID outcomeId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO learning_outcomes
                (
                    id,
                    organization_id,
                    curriculum_id,
                    unit_id,
                    code,
                    title,
                    description,
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
                outcomeId,
                actor.organizationId(),
                curriculumId,
                unitId,
                normalizeCode(request.code()),
                request.title().trim(),
                normalizeNullable(
                        request.description()
                ),
                request.sequenceNumber(),
                now,
                now
        );

        auditService.record(
                actor,
                "LEARNING_OUTCOME_CREATED",
                "LEARNING_OUTCOME",
                outcomeId,
                "Learning outcome created: "
                        + request.title().trim()
        );

        return findOutcome(
                actor.organizationId(),
                curriculumId,
                unitId,
                outcomeId
        );
    }

    @Transactional
    public LearningOutcomeResponse updateOutcome(
            AuthenticatedUser actor,
            UUID curriculumId,
            UUID unitId,
            UUID outcomeId,
            SaveLearningOutcomeRequest request
    ) {
        requireDraft(
                actor.organizationId(),
                curriculumId
        );

        findOutcome(
                actor.organizationId(),
                curriculumId,
                unitId,
                outcomeId
        );

        ensureUnique(
                actor.organizationId(),
                curriculumId,
                unitId,
                outcomeId,
                request.code(),
                request.sequenceNumber()
        );

        jdbcTemplate.update(
                """
                UPDATE learning_outcomes
                SET
                    code = ?,
                    title = ?,
                    description = ?,
                    sequence_number = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND unit_id = ?
                  AND curriculum_id = ?
                  AND organization_id = ?
                """,
                normalizeCode(request.code()),
                request.title().trim(),
                normalizeNullable(
                        request.description()
                ),
                request.sequenceNumber(),
                OffsetDateTime.now(ZoneOffset.UTC),
                outcomeId,
                unitId,
                curriculumId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "LEARNING_OUTCOME_UPDATED",
                "LEARNING_OUTCOME",
                outcomeId,
                "Learning outcome updated."
        );

        return findOutcome(
                actor.organizationId(),
                curriculumId,
                unitId,
                outcomeId
        );
    }

    @Transactional(readOnly = true)
    public LearningOutcomeResponse findOutcome(
            UUID organizationId,
            UUID curriculumId,
            UUID unitId,
            UUID outcomeId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    lo.id,
                    lo.curriculum_id,
                    lo.unit_id,
                    cu.code AS unit_code,
                    cu.title AS unit_title,
                    lo.code,
                    lo.title,
                    lo.description,
                    lo.sequence_number,
                    lo.created_at,
                    lo.updated_at

                FROM learning_outcomes lo

                JOIN curriculum_units cu
                    ON cu.id = lo.unit_id
                   AND cu.curriculum_id =
                       lo.curriculum_id
                   AND cu.organization_id =
                       lo.organization_id

                WHERE lo.id = ?
                  AND lo.unit_id = ?
                  AND lo.curriculum_id = ?
                  AND lo.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapOutcome(resultSet),
                outcomeId,
                unitId,
                curriculumId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Learning outcome was not found."
                )
        );
    }

    private void requireDraft(
            UUID organizationId,
            UUID curriculumId
    ) {
        CurriculumResponse curriculum =
                curriculumService.findCurriculum(
                        organizationId,
                        curriculumId
                );

        if (curriculum.status()
                != CurriculumStatus.DRAFT) {
            throw new BusinessRuleException(
                    "Only draft curricula can be modified."
            );
        }
    }

    private void ensureUnique(
            UUID organizationId,
            UUID curriculumId,
            UUID unitId,
            UUID excludedOutcomeId,
            String code,
            int sequenceNumber
    ) {
        Integer count;

        if (excludedOutcomeId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM learning_outcomes
                    WHERE organization_id = ?
                      AND curriculum_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR (
                              unit_id = ?
                              AND sequence_number = ?
                          )
                      )
                    """,
                    Integer.class,
                    organizationId,
                    curriculumId,
                    normalizeCode(code),
                    unitId,
                    sequenceNumber
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM learning_outcomes
                    WHERE organization_id = ?
                      AND curriculum_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR (
                              unit_id = ?
                              AND sequence_number = ?
                          )
                      )
                      AND id <> ?
                    """,
                    Integer.class,
                    organizationId,
                    curriculumId,
                    normalizeCode(code),
                    unitId,
                    sequenceNumber,
                    excludedOutcomeId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "An outcome with this code or "
                            + "sequence already exists."
            );
        }
    }

    private LearningOutcomeResponse mapOutcome(
            ResultSet resultSet
    ) throws SQLException {
        return new LearningOutcomeResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "curriculum_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "unit_id",
                        UUID.class
                ),
                resultSet.getString("unit_code"),
                resultSet.getString("unit_title"),
                resultSet.getString("code"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getInt("sequence_number"),
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
