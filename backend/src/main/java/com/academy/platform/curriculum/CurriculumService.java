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
public class CurriculumService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public CurriculumService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CurriculumResponse> findCurricula(
            UUID organizationId,
            String search,
            UUID programId,
            boolean includeArchived
    ) {
        String pattern = normalizeSearch(search);

        return jdbcTemplate.query(
                """
                SELECT
                    c.id,
                    c.program_id,
                    p.code AS program_code,
                    p.name AS program_name,
                    c.code,
                    c.name,
                    c.description,
                    c.version_label,
                    c.status,
                    c.created_at,
                    c.updated_at,

                    (
                        SELECT COUNT(*)
                        FROM curriculum_units cu
                        WHERE cu.organization_id =
                                  c.organization_id
                          AND cu.curriculum_id = c.id
                    ) AS unit_count,

                    (
                        SELECT COUNT(*)
                        FROM learning_outcomes lo
                        WHERE lo.organization_id =
                                  c.organization_id
                          AND lo.curriculum_id = c.id
                    ) AS outcome_count,

                    (
                        SELECT COALESCE(
                            SUM(cu.estimated_sessions),
                            0
                        )
                        FROM curriculum_units cu
                        WHERE cu.organization_id =
                                  c.organization_id
                          AND cu.curriculum_id = c.id
                    ) AS estimated_session_count

                FROM curricula c

                JOIN programs p
                    ON p.id = c.program_id
                   AND p.organization_id =
                       c.organization_id

                WHERE c.organization_id = ?

                  AND (
                      ? = TRUE
                      OR c.status <> 'ARCHIVED'
                  )

                  AND (
                      ? = '%%'
                      OR LOWER(c.code) LIKE ?
                      OR LOWER(c.name) LIKE ?
                      OR LOWER(p.name) LIKE ?
                      OR LOWER(c.version_label) LIKE ?
                  )

                  AND (
                      ?::UUID IS NULL
                      OR c.program_id = ?::UUID
                  )

                ORDER BY
                    p.name,
                    c.name,
                    c.version_label
                """,
                (resultSet, rowNumber) ->
                        mapCurriculum(resultSet),
                organizationId,
                includeArchived,
                pattern,
                pattern,
                pattern,
                pattern,
                pattern,
                programId,
                programId
        );
    }

    @Transactional(readOnly = true)
    public CurriculumResponse findCurriculum(
            UUID organizationId,
            UUID curriculumId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    c.id,
                    c.program_id,
                    p.code AS program_code,
                    p.name AS program_name,
                    c.code,
                    c.name,
                    c.description,
                    c.version_label,
                    c.status,
                    c.created_at,
                    c.updated_at,

                    (
                        SELECT COUNT(*)
                        FROM curriculum_units cu
                        WHERE cu.organization_id =
                                  c.organization_id
                          AND cu.curriculum_id = c.id
                    ) AS unit_count,

                    (
                        SELECT COUNT(*)
                        FROM learning_outcomes lo
                        WHERE lo.organization_id =
                                  c.organization_id
                          AND lo.curriculum_id = c.id
                    ) AS outcome_count,

                    (
                        SELECT COALESCE(
                            SUM(cu.estimated_sessions),
                            0
                        )
                        FROM curriculum_units cu
                        WHERE cu.organization_id =
                                  c.organization_id
                          AND cu.curriculum_id = c.id
                    ) AS estimated_session_count

                FROM curricula c

                JOIN programs p
                    ON p.id = c.program_id
                   AND p.organization_id =
                       c.organization_id

                WHERE c.id = ?
                  AND c.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapCurriculum(resultSet),
                curriculumId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Curriculum was not found."
                )
        );
    }

    @Transactional
    public CurriculumResponse createCurriculum(
            AuthenticatedUser actor,
            SaveCurriculumRequest request
    ) {
        validateProgram(
                actor.organizationId(),
                request.programId()
        );

        ensureCurriculumUnique(
                actor.organizationId(),
                null,
                request
        );

        UUID curriculumId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO curricula
                (
                    id,
                    organization_id,
                    program_id,
                    code,
                    name,
                    description,
                    version_label,
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
                    'DRAFT',
                    ?,
                    ?,
                    0
                )
                """,
                curriculumId,
                actor.organizationId(),
                request.programId(),
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(
                        request.description()
                ),
                request.versionLabel().trim(),
                now,
                now
        );

        auditService.record(
                actor,
                "CURRICULUM_CREATED",
                "CURRICULUM",
                curriculumId,
                "Curriculum created: "
                        + request.name().trim()
        );

        return findCurriculum(
                actor.organizationId(),
                curriculumId
        );
    }

    @Transactional
    public CurriculumResponse updateCurriculum(
            AuthenticatedUser actor,
            UUID curriculumId,
            SaveCurriculumRequest request
    ) {
        CurriculumResponse existing =
                findCurriculum(
                        actor.organizationId(),
                        curriculumId
                );

        requireDraft(existing);

        validateProgram(
                actor.organizationId(),
                request.programId()
        );

        ensureCurriculumUnique(
                actor.organizationId(),
                curriculumId,
                request
        );

        jdbcTemplate.update(
                """
                UPDATE curricula
                SET
                    program_id = ?,
                    code = ?,
                    name = ?,
                    description = ?,
                    version_label = ?,
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
                OffsetDateTime.now(ZoneOffset.UTC),
                curriculumId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "CURRICULUM_UPDATED",
                "CURRICULUM",
                curriculumId,
                "Curriculum updated."
        );

        return findCurriculum(
                actor.organizationId(),
                curriculumId
        );
    }

    @Transactional
    public void updateStatus(
            AuthenticatedUser actor,
            UUID curriculumId,
            CurriculumStatus newStatus
    ) {
        CurriculumResponse existing =
                findCurriculum(
                        actor.organizationId(),
                        curriculumId
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
                UPDATE curricula
                SET
                    status = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                newStatus.name(),
                OffsetDateTime.now(ZoneOffset.UTC),
                curriculumId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "CURRICULUM_STATUS_UPDATED",
                "CURRICULUM",
                curriculumId,
                "Curriculum status changed from "
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

    private void ensureCurriculumUnique(
            UUID organizationId,
            UUID excludedCurriculumId,
            SaveCurriculumRequest request
    ) {
        Integer count;

        if (excludedCurriculumId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM curricula
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
                    FROM curricula
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
                    excludedCurriculumId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A curriculum with this code or "
                            + "program version already exists."
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

    private void validateStatusTransition(
            CurriculumResponse existing,
            CurriculumStatus target
    ) {
        boolean allowed = switch (existing.status()) {
            case DRAFT ->
                    target == CurriculumStatus.ACTIVE
                    || target
                    == CurriculumStatus.ARCHIVED;

            case ACTIVE ->
                    target
                    == CurriculumStatus.ARCHIVED;

            case ARCHIVED -> false;
        };

        if (!allowed) {
            throw new BusinessRuleException(
                    "Curriculum status cannot change from "
                            + existing.status()
                            + " to " + target + "."
            );
        }

        if (target == CurriculumStatus.ACTIVE) {
            if (existing.unitCount() == 0) {
                throw new BusinessRuleException(
                        "A curriculum must contain at least "
                                + "one unit before activation."
                );
            }

            if (existing.outcomeCount() == 0) {
                throw new BusinessRuleException(
                        "A curriculum must contain at least "
                                + "one learning outcome before "
                                + "activation."
                );
            }
        }
    }

    private CurriculumResponse mapCurriculum(
            ResultSet resultSet
    ) throws SQLException {
        return new CurriculumResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "program_id",
                        UUID.class
                ),
                resultSet.getString("program_code"),
                resultSet.getString("program_name"),
                resultSet.getString("code"),
                resultSet.getString("name"),
                resultSet.getString("description"),
                resultSet.getString("version_label"),
                CurriculumStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getInt("unit_count"),
                resultSet.getInt("outcome_count"),
                resultSet.getInt(
                        "estimated_session_count"
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
