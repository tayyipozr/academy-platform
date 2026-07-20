package com.academy.platform.term;

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
public class TermService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public TermService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<TermResponse> findTerms(
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
                    start_date,
                    end_date,
                    status,
                    created_at,
                    updated_at
                FROM operational_terms
                WHERE organization_id = ?
                  AND (
                      ? = TRUE
                      OR status <> 'ARCHIVED'
                  )
                  AND (
                      ? = '%%'
                      OR LOWER(code) LIKE ?
                      OR LOWER(name) LIKE ?
                  )
                ORDER BY start_date DESC, name
                """,
                (resultSet, rowNumber) ->
                        mapTerm(resultSet),
                organizationId,
                includeArchived,
                pattern,
                pattern,
                pattern
        );
    }

    @Transactional(readOnly = true)
    public TermResponse findTerm(
            UUID organizationId,
            UUID termId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    code,
                    name,
                    start_date,
                    end_date,
                    status,
                    created_at,
                    updated_at
                FROM operational_terms
                WHERE id = ?
                  AND organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapTerm(resultSet),
                termId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Term was not found."
                )
        );
    }

    @Transactional
    public TermResponse createTerm(
            AuthenticatedUser actor,
            SaveTermRequest request
    ) {
        validateDateRange(request);
        ensureUnique(
                actor.organizationId(),
                null,
                request.code(),
                request.name()
        );

        UUID termId = UUID.randomUUID();
        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO operational_terms
                (
                    id,
                    organization_id,
                    code,
                    name,
                    start_date,
                    end_date,
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
                    'DRAFT',
                    ?,
                    ?,
                    0
                )
                """,
                termId,
                actor.organizationId(),
                normalizeCode(request.code()),
                request.name().trim(),
                request.startDate(),
                request.endDate(),
                now,
                now
        );

        auditService.record(
                actor,
                "TERM_CREATED",
                "OPERATIONAL_TERM",
                termId,
                "Term created: " + request.name().trim()
        );

        return findTerm(
                actor.organizationId(),
                termId
        );
    }

    @Transactional
    public TermResponse updateTerm(
            AuthenticatedUser actor,
            UUID termId,
            SaveTermRequest request
    ) {
        TermResponse existing = findTerm(
                actor.organizationId(),
                termId
        );

        if (existing.status() == TermStatus.ARCHIVED) {
            throw new BusinessRuleException(
                    "An archived term cannot be updated."
            );
        }

        validateDateRange(request);
        ensureUnique(
                actor.organizationId(),
                termId,
                request.code(),
                request.name()
        );

        jdbcTemplate.update(
                """
                UPDATE operational_terms
                SET
                    code = ?,
                    name = ?,
                    start_date = ?,
                    end_date = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                normalizeCode(request.code()),
                request.name().trim(),
                request.startDate(),
                request.endDate(),
                OffsetDateTime.now(ZoneOffset.UTC),
                termId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "TERM_UPDATED",
                "OPERATIONAL_TERM",
                termId,
                "Term updated: " + request.name().trim()
        );

        return findTerm(
                actor.organizationId(),
                termId
        );
    }

    @Transactional
    public void updateStatus(
            AuthenticatedUser actor,
            UUID termId,
            TermStatus newStatus
    ) {
        TermResponse existing = findTerm(
                actor.organizationId(),
                termId
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
                UPDATE operational_terms
                SET
                    status = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                newStatus.name(),
                OffsetDateTime.now(ZoneOffset.UTC),
                termId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "TERM_STATUS_UPDATED",
                "OPERATIONAL_TERM",
                termId,
                "Term status changed from "
                        + existing.status()
                        + " to " + newStatus
        );
    }

    private void validateDateRange(
            SaveTermRequest request
    ) {
        if (request.endDate()
                .isBefore(request.startDate())) {
            throw new BusinessRuleException(
                    "Term end date cannot be before "
                            + "the start date."
            );
        }
    }

    private void validateStatusTransition(
            TermStatus current,
            TermStatus target
    ) {
        boolean allowed = switch (current) {
            case DRAFT ->
                    target == TermStatus.ACTIVE
                    || target == TermStatus.ARCHIVED;

            case ACTIVE ->
                    target == TermStatus.COMPLETED
                    || target == TermStatus.ARCHIVED;

            case COMPLETED ->
                    target == TermStatus.ARCHIVED;

            case ARCHIVED -> false;
        };

        if (!allowed) {
            throw new BusinessRuleException(
                    "Term status cannot change from "
                            + current + " to " + target + "."
            );
        }
    }

    private void ensureUnique(
            UUID organizationId,
            UUID excludedTermId,
            String code,
            String name
    ) {
        Integer count;

        if (excludedTermId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM operational_terms
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
                    FROM operational_terms
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
                    excludedTermId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A term with this code or name "
                            + "already exists."
            );
        }
    }

    private TermResponse mapTerm(
            ResultSet resultSet
    ) throws SQLException {
        return new TermResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("code"),
                resultSet.getString("name"),
                resultSet.getObject(
                        "start_date",
                        java.time.LocalDate.class
                ),
                resultSet.getObject(
                        "end_date",
                        java.time.LocalDate.class
                ),
                TermStatus.valueOf(
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
}
