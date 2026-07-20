package com.academy.platform.program;

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
public class ProgramService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public ProgramService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ProgramResponse> findPrograms(
            UUID organizationId,
            String search,
            boolean includeArchived
    ) {
        String pattern = normalizeSearch(search);

        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    code,
                    name,
                    description,
                    category,
                    minimum_age,
                    maximum_age,
                    status,
                    created_at,
                    updated_at
                FROM programs
                WHERE organization_id = ?
                  AND (
                      ? = TRUE
                      OR status <> 'ARCHIVED'
                  )
                  AND (
                      ? = '%%'
                      OR LOWER(code) LIKE ?
                      OR LOWER(name) LIKE ?
                      OR LOWER(
                          COALESCE(category, '')
                      ) LIKE ?
                  )
                ORDER BY name, code
                """,
                (resultSet, rowNumber) ->
                        mapProgram(resultSet),
                organizationId,
                includeArchived,
                pattern,
                pattern,
                pattern,
                pattern
        );
    }

    @Transactional(readOnly = true)
    public ProgramResponse findProgram(
            UUID organizationId,
            UUID programId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    code,
                    name,
                    description,
                    category,
                    minimum_age,
                    maximum_age,
                    status,
                    created_at,
                    updated_at
                FROM programs
                WHERE id = ?
                  AND organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapProgram(resultSet),
                programId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Program was not found."
                )
        );
    }

    @Transactional
    public ProgramResponse createProgram(
            AuthenticatedUser actor,
            SaveProgramRequest request
    ) {
        validateAgeRange(request);

        ensureUnique(
                actor.organizationId(),
                null,
                request.code(),
                request.name()
        );

        UUID programId = UUID.randomUUID();
        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO programs
                (
                    id,
                    organization_id,
                    code,
                    name,
                    description,
                    category,
                    minimum_age,
                    maximum_age,
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
                    'ACTIVE',
                    ?,
                    ?,
                    0
                )
                """,
                programId,
                actor.organizationId(),
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(
                        request.description()
                ),
                normalizeNullable(request.category()),
                request.minimumAge(),
                request.maximumAge(),
                now,
                now
        );

        auditService.record(
                actor,
                "PROGRAM_CREATED",
                "PROGRAM",
                programId,
                "Program created: "
                        + request.name().trim()
        );

        return findProgram(
                actor.organizationId(),
                programId
        );
    }

    @Transactional
    public ProgramResponse updateProgram(
            AuthenticatedUser actor,
            UUID programId,
            SaveProgramRequest request
    ) {
        findProgram(
                actor.organizationId(),
                programId
        );

        validateAgeRange(request);

        ensureUnique(
                actor.organizationId(),
                programId,
                request.code(),
                request.name()
        );

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE programs
                SET
                    code = ?,
                    name = ?,
                    description = ?,
                    category = ?,
                    minimum_age = ?,
                    maximum_age = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(
                        request.description()
                ),
                normalizeNullable(request.category()),
                request.minimumAge(),
                request.maximumAge(),
                OffsetDateTime.now(ZoneOffset.UTC),
                programId,
                actor.organizationId()
        );

        if (updatedRows == 0) {
            throw new ResourceNotFoundException(
                    "Program was not found."
            );
        }

        auditService.record(
                actor,
                "PROGRAM_UPDATED",
                "PROGRAM",
                programId,
                "Program updated: "
                        + request.name().trim()
        );

        return findProgram(
                actor.organizationId(),
                programId
        );
    }

    @Transactional
    public void updateStatus(
            AuthenticatedUser actor,
            UUID programId,
            ProgramStatus status
    ) {
        ProgramResponse existing = findProgram(
                actor.organizationId(),
                programId
        );

        if (existing.status() == status) {
            return;
        }

        jdbcTemplate.update(
                """
                UPDATE programs
                SET
                    status = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                status.name(),
                OffsetDateTime.now(ZoneOffset.UTC),
                programId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "PROGRAM_STATUS_UPDATED",
                "PROGRAM",
                programId,
                "Program status changed from "
                        + existing.status()
                        + " to " + status
        );
    }

    private void validateAgeRange(
            SaveProgramRequest request
    ) {
        if (request.minimumAge() != null
                && request.maximumAge() != null
                && request.maximumAge()
                < request.minimumAge()) {
            throw new BusinessRuleException(
                    "Maximum age cannot be less than "
                            + "minimum age."
            );
        }
    }

    private void ensureUnique(
            UUID organizationId,
            UUID excludedProgramId,
            String code,
            String name
    ) {
        Integer count;

        if (excludedProgramId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM programs
                    WHERE organization_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR LOWER(name) = LOWER(?)
                      )
                    """,
                    Integer.class,
                    organizationId,
                    normalizeCode(code),
                    name.trim()
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM programs
                    WHERE organization_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR LOWER(name) = LOWER(?)
                      )
                      AND id <> ?
                    """,
                    Integer.class,
                    organizationId,
                    normalizeCode(code),
                    name.trim(),
                    excludedProgramId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A program with this code or name "
                            + "already exists."
            );
        }
    }

    private ProgramResponse mapProgram(
            ResultSet resultSet
    ) throws SQLException {
        return new ProgramResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("code"),
                resultSet.getString("name"),
                resultSet.getString("description"),
                resultSet.getString("category"),
                resultSet.getObject(
                        "minimum_age",
                        Integer.class
                ),
                resultSet.getObject(
                        "maximum_age",
                        Integer.class
                ),
                ProgramStatus.valueOf(
                        resultSet.getString("status")
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
        return code.trim().toUpperCase(Locale.ROOT);
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
