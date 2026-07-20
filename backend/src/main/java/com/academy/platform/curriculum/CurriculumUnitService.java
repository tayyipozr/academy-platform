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
public class CurriculumUnitService {

    private final JdbcTemplate jdbcTemplate;
    private final CurriculumService curriculumService;
    private final AuditService auditService;

    public CurriculumUnitService(
            JdbcTemplate jdbcTemplate,
            CurriculumService curriculumService,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.curriculumService = curriculumService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CurriculumUnitResponse> findUnits(
            UUID organizationId,
            UUID curriculumId
    ) {
        curriculumService.findCurriculum(
                organizationId,
                curriculumId
        );

        return jdbcTemplate.query(
                """
                SELECT
                    cu.id,
                    cu.curriculum_id,
                    cu.parent_unit_id,
                    parent.title AS parent_unit_title,
                    cu.code,
                    cu.title,
                    cu.description,
                    cu.sequence_number,
                    cu.estimated_sessions,
                    cu.created_at,
                    cu.updated_at,

                    (
                        SELECT COUNT(*)
                        FROM learning_outcomes lo
                        WHERE lo.organization_id =
                                  cu.organization_id
                          AND lo.unit_id = cu.id
                    ) AS outcome_count

                FROM curriculum_units cu

                LEFT JOIN curriculum_units parent
                    ON parent.id = cu.parent_unit_id
                   AND parent.curriculum_id =
                       cu.curriculum_id
                   AND parent.organization_id =
                       cu.organization_id

                WHERE cu.organization_id = ?
                  AND cu.curriculum_id = ?

                ORDER BY cu.sequence_number
                """,
                (resultSet, rowNumber) ->
                        mapUnit(resultSet),
                organizationId,
                curriculumId
        );
    }

    @Transactional
    public CurriculumUnitResponse createUnit(
            AuthenticatedUser actor,
            UUID curriculumId,
            SaveCurriculumUnitRequest request
    ) {
        CurriculumResponse curriculum =
                curriculumService.findCurriculum(
                        actor.organizationId(),
                        curriculumId
                );

        requireDraft(curriculum);

        validateParentUnit(
                actor.organizationId(),
                curriculumId,
                null,
                request.parentUnitId()
        );

        ensureUnique(
                actor.organizationId(),
                curriculumId,
                null,
                request.code(),
                request.sequenceNumber()
        );

        UUID unitId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO curriculum_units
                (
                    id,
                    organization_id,
                    curriculum_id,
                    parent_unit_id,
                    code,
                    title,
                    description,
                    sequence_number,
                    estimated_sessions,
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
                    ?,
                    0
                )
                """,
                unitId,
                actor.organizationId(),
                curriculumId,
                request.parentUnitId(),
                normalizeCode(request.code()),
                request.title().trim(),
                normalizeNullable(
                        request.description()
                ),
                request.sequenceNumber(),
                request.estimatedSessions(),
                now,
                now
        );

        auditService.record(
                actor,
                "CURRICULUM_UNIT_CREATED",
                "CURRICULUM_UNIT",
                unitId,
                "Curriculum unit created: "
                        + request.title().trim()
        );

        return findUnit(
                actor.organizationId(),
                curriculumId,
                unitId
        );
    }

    @Transactional
    public CurriculumUnitResponse updateUnit(
            AuthenticatedUser actor,
            UUID curriculumId,
            UUID unitId,
            SaveCurriculumUnitRequest request
    ) {
        CurriculumResponse curriculum =
                curriculumService.findCurriculum(
                        actor.organizationId(),
                        curriculumId
                );

        requireDraft(curriculum);

        findUnit(
                actor.organizationId(),
                curriculumId,
                unitId
        );

        validateParentUnit(
                actor.organizationId(),
                curriculumId,
                unitId,
                request.parentUnitId()
        );

        ensureUnique(
                actor.organizationId(),
                curriculumId,
                unitId,
                request.code(),
                request.sequenceNumber()
        );

        jdbcTemplate.update(
                """
                UPDATE curriculum_units
                SET
                    parent_unit_id = ?,
                    code = ?,
                    title = ?,
                    description = ?,
                    sequence_number = ?,
                    estimated_sessions = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND curriculum_id = ?
                  AND organization_id = ?
                """,
                request.parentUnitId(),
                normalizeCode(request.code()),
                request.title().trim(),
                normalizeNullable(
                        request.description()
                ),
                request.sequenceNumber(),
                request.estimatedSessions(),
                OffsetDateTime.now(ZoneOffset.UTC),
                unitId,
                curriculumId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "CURRICULUM_UNIT_UPDATED",
                "CURRICULUM_UNIT",
                unitId,
                "Curriculum unit updated."
        );

        return findUnit(
                actor.organizationId(),
                curriculumId,
                unitId
        );
    }

    @Transactional(readOnly = true)
    public CurriculumUnitResponse findUnit(
            UUID organizationId,
            UUID curriculumId,
            UUID unitId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    cu.id,
                    cu.curriculum_id,
                    cu.parent_unit_id,
                    parent.title AS parent_unit_title,
                    cu.code,
                    cu.title,
                    cu.description,
                    cu.sequence_number,
                    cu.estimated_sessions,
                    cu.created_at,
                    cu.updated_at,

                    (
                        SELECT COUNT(*)
                        FROM learning_outcomes lo
                        WHERE lo.organization_id =
                                  cu.organization_id
                          AND lo.unit_id = cu.id
                    ) AS outcome_count

                FROM curriculum_units cu

                LEFT JOIN curriculum_units parent
                    ON parent.id = cu.parent_unit_id
                   AND parent.curriculum_id =
                       cu.curriculum_id
                   AND parent.organization_id =
                       cu.organization_id

                WHERE cu.id = ?
                  AND cu.curriculum_id = ?
                  AND cu.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapUnit(resultSet),
                unitId,
                curriculumId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Curriculum unit was not found."
                )
        );
    }

    private void validateParentUnit(
            UUID organizationId,
            UUID curriculumId,
            UUID currentUnitId,
            UUID parentUnitId
    ) {
        if (parentUnitId == null) {
            return;
        }

        if (parentUnitId.equals(currentUnitId)) {
            throw new BusinessRuleException(
                    "A unit cannot be its own parent."
            );
        }

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM curriculum_units
                WHERE id = ?
                  AND curriculum_id = ?
                  AND organization_id = ?
                """,
                Integer.class,
                parentUnitId,
                curriculumId,
                organizationId
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected parent unit is invalid."
            );
        }

        if (currentUnitId != null) {
            Integer descendantCount =
                    jdbcTemplate.queryForObject(
                            """
                            WITH RECURSIVE descendants AS
                            (
                                SELECT id
                                FROM curriculum_units
                                WHERE parent_unit_id = ?
                                  AND curriculum_id = ?
                                  AND organization_id = ?

                                UNION ALL

                                SELECT child.id
                                FROM curriculum_units child
                                JOIN descendants d
                                  ON child.parent_unit_id =
                                     d.id
                                WHERE child.curriculum_id = ?
                                  AND child.organization_id = ?
                            )
                            SELECT COUNT(*)
                            FROM descendants
                            WHERE id = ?
                            """,
                            Integer.class,
                            currentUnitId,
                            curriculumId,
                            organizationId,
                            curriculumId,
                            organizationId,
                            parentUnitId
                    );

            if (descendantCount != null
                    && descendantCount > 0) {
                throw new BusinessRuleException(
                        "A unit cannot use one of its "
                                + "descendants as its parent."
                );
            }
        }
    }

    private void ensureUnique(
            UUID organizationId,
            UUID curriculumId,
            UUID excludedUnitId,
            String code,
            int sequenceNumber
    ) {
        Integer count;

        if (excludedUnitId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM curriculum_units
                    WHERE organization_id = ?
                      AND curriculum_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR sequence_number = ?
                      )
                    """,
                    Integer.class,
                    organizationId,
                    curriculumId,
                    normalizeCode(code),
                    sequenceNumber
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM curriculum_units
                    WHERE organization_id = ?
                      AND curriculum_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR sequence_number = ?
                      )
                      AND id <> ?
                    """,
                    Integer.class,
                    organizationId,
                    curriculumId,
                    normalizeCode(code),
                    sequenceNumber,
                    excludedUnitId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A unit with this code or sequence "
                            + "already exists."
            );
        }
    }

    private void requireDraft(
            CurriculumResponse curriculum
    ) {
        if (curriculum.status()
                != CurriculumStatus.DRAFT) {
            throw new BusinessRuleException(
                    "Only draft curricula can be modified."
            );
        }
    }

    private CurriculumUnitResponse mapUnit(
            ResultSet resultSet
    ) throws SQLException {
        return new CurriculumUnitResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "curriculum_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "parent_unit_id",
                        UUID.class
                ),
                resultSet.getString(
                        "parent_unit_title"
                ),
                resultSet.getString("code"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getInt("sequence_number"),
                resultSet.getObject(
                        "estimated_sessions",
                        Integer.class
                ),
                resultSet.getInt("outcome_count"),
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
