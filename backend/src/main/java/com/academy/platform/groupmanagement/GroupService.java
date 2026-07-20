package com.academy.platform.groupmanagement;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
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
public class GroupService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public GroupService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> findGroups(
            UUID organizationId,
            String search,
            UUID programId,
            UUID termId,
            UUID branchId,
            boolean includeArchived
    ) {
        String pattern = normalizeSearch(search);

        return jdbcTemplate.query(
                """
                SELECT
                    ag.id,

                    ag.branch_id,
                    b.name AS branch_name,

                    ag.program_id,
                    p.code AS program_code,
                    p.name AS program_name,

                    ag.term_id,
                    ot.code AS term_code,
                    ot.name AS term_name,
                    ot.start_date AS term_start_date,
                    ot.end_date AS term_end_date,

                    ag.code,
                    ag.name,
                    ag.description,
                    ag.capacity,
                    ag.minimum_age,
                    ag.maximum_age,
                    ag.status,
                    ag.created_at,
                    ag.updated_at

                FROM academy_groups ag

                JOIN programs p
                    ON p.id = ag.program_id
                   AND p.organization_id =
                       ag.organization_id

                JOIN operational_terms ot
                    ON ot.id = ag.term_id
                   AND ot.organization_id =
                       ag.organization_id

                LEFT JOIN branches b
                    ON b.id = ag.branch_id
                   AND b.organization_id =
                       ag.organization_id

                WHERE ag.organization_id = ?

                  AND (
                      ? = TRUE
                      OR ag.status <> 'ARCHIVED'
                  )

                  AND (
                      ? = '%%'
                      OR LOWER(ag.code) LIKE ?
                      OR LOWER(ag.name) LIKE ?
                      OR LOWER(p.name) LIKE ?
                      OR LOWER(ot.name) LIKE ?
                  )

                  AND (
                      ?::UUID IS NULL
                      OR ag.program_id = ?::UUID
                  )

                  AND (
                      ?::UUID IS NULL
                      OR ag.term_id = ?::UUID
                  )

                  AND (
                      ?::UUID IS NULL
                      OR ag.branch_id = ?::UUID
                  )

                ORDER BY
                    ot.start_date DESC,
                    p.name,
                    ag.name
                """,
                (resultSet, rowNumber) ->
                        mapGroup(resultSet),
                organizationId,
                includeArchived,
                pattern,
                pattern,
                pattern,
                pattern,
                pattern,
                programId,
                programId,
                termId,
                termId,
                branchId,
                branchId
        );
    }

    @Transactional(readOnly = true)
    public GroupResponse findGroup(
            UUID organizationId,
            UUID groupId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    ag.id,

                    ag.branch_id,
                    b.name AS branch_name,

                    ag.program_id,
                    p.code AS program_code,
                    p.name AS program_name,

                    ag.term_id,
                    ot.code AS term_code,
                    ot.name AS term_name,
                    ot.start_date AS term_start_date,
                    ot.end_date AS term_end_date,

                    ag.code,
                    ag.name,
                    ag.description,
                    ag.capacity,
                    ag.minimum_age,
                    ag.maximum_age,
                    ag.status,
                    ag.created_at,
                    ag.updated_at

                FROM academy_groups ag

                JOIN programs p
                    ON p.id = ag.program_id
                   AND p.organization_id =
                       ag.organization_id

                JOIN operational_terms ot
                    ON ot.id = ag.term_id
                   AND ot.organization_id =
                       ag.organization_id

                LEFT JOIN branches b
                    ON b.id = ag.branch_id
                   AND b.organization_id =
                       ag.organization_id

                WHERE ag.id = ?
                  AND ag.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapGroup(resultSet),
                groupId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Group was not found."
                )
        );
    }

    @Transactional
    public GroupResponse createGroup(
            AuthenticatedUser actor,
            SaveGroupRequest request
    ) {
        validateRequest(request);

        validateProgram(
                actor.organizationId(),
                request.programId()
        );

        validateTerm(
                actor.organizationId(),
                request.termId()
        );

        validateBranch(
                actor.organizationId(),
                request.branchId()
        );

        ensureUnique(
                actor.organizationId(),
                null,
                request.termId(),
                request.code(),
                request.name()
        );

        UUID groupId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO academy_groups
                (
                    id,
                    organization_id,
                    branch_id,
                    program_id,
                    term_id,
                    code,
                    name,
                    description,
                    capacity,
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
                    ?,
                    ?,
                    ?,
                    'DRAFT',
                    ?,
                    ?,
                    0
                )
                """,
                groupId,
                actor.organizationId(),
                request.branchId(),
                request.programId(),
                request.termId(),
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(
                        request.description()
                ),
                request.capacity(),
                request.minimumAge(),
                request.maximumAge(),
                now,
                now
        );

        auditService.record(
                actor,
                "GROUP_CREATED",
                "GROUP",
                groupId,
                "Group created: "
                        + request.name().trim()
        );

        return findGroup(
                actor.organizationId(),
                groupId
        );
    }

    @Transactional
    public GroupResponse updateGroup(
            AuthenticatedUser actor,
            UUID groupId,
            SaveGroupRequest request
    ) {
        GroupResponse existing = findGroup(
                actor.organizationId(),
                groupId
        );

        if (existing.status() == GroupStatus.ARCHIVED) {
            throw new BusinessRuleException(
                    "An archived group cannot be updated."
            );
        }

        if (existing.status() == GroupStatus.COMPLETED) {
            throw new BusinessRuleException(
                    "A completed group cannot be updated."
            );
        }

        validateRequest(request);

        validateProgram(
                actor.organizationId(),
                request.programId()
        );

        validateTerm(
                actor.organizationId(),
                request.termId()
        );

        validateBranch(
                actor.organizationId(),
                request.branchId()
        );

        ensureUnique(
                actor.organizationId(),
                groupId,
                request.termId(),
                request.code(),
                request.name()
        );

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE academy_groups
                SET
                    branch_id = ?,
                    program_id = ?,
                    term_id = ?,
                    code = ?,
                    name = ?,
                    description = ?,
                    capacity = ?,
                    minimum_age = ?,
                    maximum_age = ?,
                    updated_at = ?,
                    version = version + 1

                WHERE id = ?
                  AND organization_id = ?
                """,
                request.branchId(),
                request.programId(),
                request.termId(),
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(
                        request.description()
                ),
                request.capacity(),
                request.minimumAge(),
                request.maximumAge(),
                OffsetDateTime.now(ZoneOffset.UTC),
                groupId,
                actor.organizationId()
        );

        if (updatedRows == 0) {
            throw new ResourceNotFoundException(
                    "Group was not found."
            );
        }

        auditService.record(
                actor,
                "GROUP_UPDATED",
                "GROUP",
                groupId,
                "Group updated: "
                        + request.name().trim()
        );

        return findGroup(
                actor.organizationId(),
                groupId
        );
    }

    @Transactional
    public void updateStatus(
            AuthenticatedUser actor,
            UUID groupId,
            GroupStatus newStatus
    ) {
        GroupResponse existing = findGroup(
                actor.organizationId(),
                groupId
        );

        if (existing.status() == newStatus) {
            return;
        }

        validateStatusTransition(
                existing.status(),
                newStatus
        );

        jdbcTemplate.update(
                """
                UPDATE academy_groups
                SET
                    status = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                newStatus.name(),
                OffsetDateTime.now(ZoneOffset.UTC),
                groupId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "GROUP_STATUS_UPDATED",
                "GROUP",
                groupId,
                "Group status changed from "
                        + existing.status()
                        + " to " + newStatus
        );
    }

    private void validateRequest(
            SaveGroupRequest request
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

    private void validateTerm(
            UUID organizationId,
            UUID termId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM operational_terms
                WHERE id = ?
                  AND organization_id = ?
                  AND status IN ('DRAFT', 'ACTIVE')
                """,
                Integer.class,
                termId,
                organizationId
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected term is invalid "
                            + "or unavailable."
            );
        }
    }

    private void validateBranch(
            UUID organizationId,
            UUID branchId
    ) {
        if (branchId == null) {
            return;
        }

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM branches
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'ACTIVE'
                """,
                Integer.class,
                branchId,
                organizationId
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected branch is invalid "
                            + "or inactive."
            );
        }
    }

    private void ensureUnique(
            UUID organizationId,
            UUID excludedGroupId,
            UUID termId,
            String code,
            String name
    ) {
        Integer count;

        if (excludedGroupId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM academy_groups
                    WHERE organization_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR (
                              term_id = ?
                              AND LOWER(name) = LOWER(?)
                          )
                      )
                    """,
                    Integer.class,
                    organizationId,
                    normalizeCode(code),
                    termId,
                    name.trim()
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM academy_groups
                    WHERE organization_id = ?
                      AND (
                          LOWER(code) = LOWER(?)
                          OR (
                              term_id = ?
                              AND LOWER(name) = LOWER(?)
                          )
                      )
                      AND id <> ?
                    """,
                    Integer.class,
                    organizationId,
                    normalizeCode(code),
                    termId,
                    name.trim(),
                    excludedGroupId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A group with this code or term name "
                            + "already exists."
            );
        }
    }

    private void validateStatusTransition(
            GroupStatus current,
            GroupStatus target
    ) {
        boolean allowed = switch (current) {
            case DRAFT ->
                    target == GroupStatus.ACTIVE
                    || target == GroupStatus.ARCHIVED;

            case ACTIVE ->
                    target == GroupStatus.INACTIVE
                    || target == GroupStatus.COMPLETED
                    || target == GroupStatus.ARCHIVED;

            case INACTIVE ->
                    target == GroupStatus.ACTIVE
                    || target == GroupStatus.COMPLETED
                    || target == GroupStatus.ARCHIVED;

            case COMPLETED ->
                    target == GroupStatus.ARCHIVED;

            case ARCHIVED -> false;
        };

        if (!allowed) {
            throw new BusinessRuleException(
                    "Group status cannot change from "
                            + current + " to " + target + "."
            );
        }
    }

    private GroupResponse mapGroup(
            ResultSet resultSet
    ) throws SQLException {
        return new GroupResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "branch_id",
                        UUID.class
                ),
                resultSet.getString("branch_name"),
                resultSet.getObject(
                        "program_id",
                        UUID.class
                ),
                resultSet.getString("program_code"),
                resultSet.getString("program_name"),
                resultSet.getObject(
                        "term_id",
                        UUID.class
                ),
                resultSet.getString("term_code"),
                resultSet.getString("term_name"),
                resultSet.getObject(
                        "term_start_date",
                        LocalDate.class
                ),
                resultSet.getObject(
                        "term_end_date",
                        LocalDate.class
                ),
                resultSet.getString("code"),
                resultSet.getString("name"),
                resultSet.getString("description"),
                resultSet.getInt("capacity"),
                resultSet.getObject(
                        "minimum_age",
                        Integer.class
                ),
                resultSet.getObject(
                        "maximum_age",
                        Integer.class
                ),
                GroupStatus.valueOf(
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
