package com.academy.platform.scheduling;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ConflictException;
import com.academy.platform.common.ResourceNotFoundException;

@Service
public class SessionService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public SessionService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional
    public SessionResponse createManualSession(
            AuthenticatedUser actor,
            CreateSessionRequest request
    ) {
        validateSessionTimes(
                request.scheduledStart(),
                request.scheduledEnd()
        );

        validateGroup(
                actor.organizationId(),
                request.groupId()
        );

        validateActorCanAccessGroup(
                actor,
                request.groupId(),
                request.scheduledStart().toLocalDate()
        );

        CurriculumReference curriculum
                = resolveCurriculum(
                        actor.organizationId(),
                        request.groupId(),
                        request.curriculumUnitId()
                );

        validateLeadStaff(
                actor.organizationId(),
                request.groupId(),
                request.leadStaffId()
        );

        UUID sessionId = UUID.randomUUID();

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        try {
            jdbcTemplate.update(
                    """
                    INSERT INTO lesson_sessions
                    (
                        id,
                        organization_id,
                        group_id,
                        schedule_rule_id,
                        curriculum_assignment_id,
                        curriculum_id,
                        curriculum_unit_id,
                        lead_staff_id,
                        title,
                        description,
                        scheduled_start,
                        scheduled_end,
                        location,
                        status,
                        created_by,
                        created_at,
                        updated_at,
                        version
                    )
                    VALUES (
                        ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, 'SCHEDULED', ?, ?, ?, 0
                    )
                    """,
                    sessionId,
                    actor.organizationId(),
                    request.groupId(),
                    curriculum.assignmentId(),
                    curriculum.curriculumId(),
                    request.curriculumUnitId(),
                    request.leadStaffId(),
                    request.title().trim(),
                    normalizeNullable(request.description()),
                    request.scheduledStart(),
                    request.scheduledEnd(),
                    normalizeNullable(request.location()),
                    actor.userId(),
                    now,
                    now
            );
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException(
                    "The group already has a session "
                    + "at the selected time."
            );
        }

        auditService.record(
                actor,
                "SESSION_CREATED",
                "LESSON_SESSION",
                sessionId,
                "Manual session created."
        );

        return findSession(
                actor.organizationId(),
                sessionId
        );
    }

    @Transactional
    public SessionResponse createGeneratedSession(
            AuthenticatedUser actor,
            ScheduleRuleResponse rule,
            OffsetDateTime start,
            OffsetDateTime end
    ) {
        UUID sessionId = UUID.randomUUID();

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        try {
            int inserted = jdbcTemplate.update(
                    """
                    INSERT INTO lesson_sessions
                    (
                        id,
                        organization_id,
                        group_id,
                        schedule_rule_id,
                        curriculum_assignment_id,
                        curriculum_id,
                        curriculum_unit_id,
                        lead_staff_id,
                        title,
                        description,
                        scheduled_start,
                        scheduled_end,
                        location,
                        status,
                        created_by,
                        created_at,
                        updated_at,
                        version
                    )
                    VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, 'SCHEDULED', ?, ?, ?, 0
                    )
                    ON CONFLICT DO NOTHING
                    """,
                    sessionId,
                    actor.organizationId(),
                    rule.groupId(),
                    rule.id(),
                    rule.curriculumAssignmentId(),
                    rule.curriculumId(),
                    rule.curriculumUnitId(),
                    rule.leadStaffId(),
                    rule.title(),
                    rule.description(),
                    start,
                    end,
                    rule.location(),
                    actor.userId(),
                    now,
                    now
            );

            if (inserted == 0) {
                return null;
            }
        } catch (DataIntegrityViolationException exception) {
            return null;
        }

        return findSession(
                actor.organizationId(),
                sessionId
        );
    }

    private boolean isOrganizationAdministrator(
            AuthenticatedUser actor
    ) {
        return actor.roles().contains(
                "ORGANIZATION_ADMIN"
        );
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> findSessions(
            AuthenticatedUser actor,
            UUID groupId,
            UUID staffId,
            SessionStatus status,
            OffsetDateTime dateFrom,
            OffsetDateTime dateTo
    ) {

        boolean organizationAdministrator
                = isOrganizationAdministrator(actor);

        UUID currentStaffId = organizationAdministrator
                ? null
                : findCurrentStaffId(actor);

        return jdbcTemplate.query(
                """
                SELECT
                    ls.id,
                    ls.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    ls.schedule_rule_id,
                    ls.curriculum_assignment_id,
                    ls.curriculum_id,
                    ls.curriculum_unit_id,
                    cu.code AS curriculum_unit_code,
                    cu.title AS curriculum_unit_title,
                    ls.lead_staff_id,

                    CASE
                        WHEN sm.id IS NULL THEN NULL
                        ELSE CONCAT(
                            om.display_first_name,
                            ' ',
                            om.display_last_name
                        )
                    END AS lead_staff_name,

                    ls.title,
                    ls.description,
                    ls.scheduled_start,
                    ls.scheduled_end,
                    ls.location,
                    ls.status,
                    ls.completion_notes,
                    ls.cancellation_reason,
                    ls.completed_at,
                    ls.cancelled_at,
                    ls.created_at,
                    ls.updated_at

                FROM lesson_sessions ls

                JOIN academy_groups ag
                    ON ag.id = ls.group_id
                   AND ag.organization_id =
                       ls.organization_id

                LEFT JOIN curriculum_units cu
                    ON cu.id = ls.curriculum_unit_id
                   AND cu.curriculum_id =
                       ls.curriculum_id
                   AND cu.organization_id =
                       ls.organization_id

                LEFT JOIN staff_members sm
                    ON sm.id = ls.lead_staff_id
                   AND sm.organization_id =
                       ls.organization_id

                LEFT JOIN organization_memberships om
                    ON om.id = sm.membership_id
                   AND om.organization_id =
                       sm.organization_id

                WHERE ls.organization_id = ?

                  AND (
                      ?::UUID IS NULL
                      OR ls.group_id = ?::UUID
                  )

                  AND (
                      ?::UUID IS NULL
                      OR ls.lead_staff_id = ?::UUID
                  )

                  AND (
                      ?::VARCHAR IS NULL
                      OR ls.status = ?::VARCHAR
                  )

                  AND (
                      ?::TIMESTAMPTZ IS NULL
                      OR ls.scheduled_start >=
                         ?::TIMESTAMPTZ
                  )

                  AND (
                      ?::TIMESTAMPTZ IS NULL
                      OR ls.scheduled_start <=
                         ?::TIMESTAMPTZ
                  )

                  AND (
                      ? = TRUE
                      OR ls.lead_staff_id = ?::UUID
                      OR EXISTS (
                          SELECT 1
                          FROM group_staff_assignments gsa
                          WHERE gsa.organization_id =
                                    ls.organization_id
                            AND gsa.group_id = ls.group_id
                            AND gsa.staff_id = ?::UUID
                            AND gsa.status = 'ACTIVE'
                            AND gsa.start_date <=
                                ls.scheduled_start::DATE
                            AND (
                                gsa.end_date IS NULL
                                OR gsa.end_date >=
                                   ls.scheduled_start::DATE
                            )
                      )
                  )

                ORDER BY ls.scheduled_start
                """,
                (resultSet, rowNumber)
                -> mapSession(resultSet),
                actor.organizationId(),
                groupId,
                groupId,
                staffId,
                staffId,
                status == null ? null : status.name(),
                status == null ? null : status.name(),
                dateFrom,
                dateFrom,
                dateTo,
                dateTo,
                organizationAdministrator,
                currentStaffId,
                currentStaffId
        );
    }

    @Transactional(readOnly = true)
    public SessionResponse findSession(
            UUID organizationId,
            UUID sessionId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    ls.id,
                    ls.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    ls.schedule_rule_id,
                    ls.curriculum_assignment_id,
                    ls.curriculum_id,
                    ls.curriculum_unit_id,
                    cu.code AS curriculum_unit_code,
                    cu.title AS curriculum_unit_title,
                    ls.lead_staff_id,

                    CASE
                        WHEN sm.id IS NULL THEN NULL
                        ELSE CONCAT(
                            om.display_first_name,
                            ' ',
                            om.display_last_name
                        )
                    END AS lead_staff_name,

                    ls.title,
                    ls.description,
                    ls.scheduled_start,
                    ls.scheduled_end,
                    ls.location,
                    ls.status,
                    ls.completion_notes,
                    ls.cancellation_reason,
                    ls.completed_at,
                    ls.cancelled_at,
                    ls.created_at,
                    ls.updated_at

                FROM lesson_sessions ls

                JOIN academy_groups ag
                    ON ag.id = ls.group_id
                   AND ag.organization_id =
                       ls.organization_id

                LEFT JOIN curriculum_units cu
                    ON cu.id = ls.curriculum_unit_id
                   AND cu.curriculum_id =
                       ls.curriculum_id
                   AND cu.organization_id =
                       ls.organization_id

                LEFT JOIN staff_members sm
                    ON sm.id = ls.lead_staff_id
                   AND sm.organization_id =
                       ls.organization_id

                LEFT JOIN organization_memberships om
                    ON om.id = sm.membership_id
                   AND om.organization_id =
                       sm.organization_id

                WHERE ls.id = ?
                  AND ls.organization_id = ?
                """,
                (resultSet, rowNumber)
                -> mapSession(resultSet),
                sessionId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Session was not found."
                )
        );
    }

    @Transactional
    public SessionResponse rescheduleSession(
            AuthenticatedUser actor,
            UUID sessionId,
            RescheduleSessionRequest request
    ) {
        SessionResponse existing = findSession(
                actor.organizationId(),
                sessionId
        );

        validateActorCanAccessGroup(
                actor,
                existing.groupId(),
                existing.scheduledStart()
                        .toLocalDate()
        );

        validateActorCanAccessGroup(
                actor,
                existing.groupId(),
                request.scheduledStart()
                        .toLocalDate()
        );

        if (existing.status()
                == SessionStatus.COMPLETED
                || existing.status()
                == SessionStatus.CANCELLED) {
            throw new BusinessRuleException(
                    "Completed or cancelled sessions "
                    + "cannot be rescheduled."
            );
        }

        validateSessionTimes(
                request.scheduledStart(),
                request.scheduledEnd()
        );

        try {
            jdbcTemplate.update(
                    """
                    UPDATE lesson_sessions
                    SET
                        scheduled_start = ?,
                        scheduled_end = ?,
                        location = ?,
                        status = 'SCHEDULED',
                        updated_at = ?,
                        version = version + 1
                    WHERE id = ?
                      AND organization_id = ?
                    """,
                    request.scheduledStart(),
                    request.scheduledEnd(),
                    normalizeNullable(request.location()),
                    OffsetDateTime.now(ZoneOffset.UTC),
                    sessionId,
                    actor.organizationId()
            );
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException(
                    "The group already has a session "
                    + "at the selected time."
            );
        }

        auditService.record(
                actor,
                "SESSION_RESCHEDULED",
                "LESSON_SESSION",
                sessionId,
                "Session rescheduled."
        );

        return findSession(
                actor.organizationId(),
                sessionId
        );
    }

    @Transactional
    public SessionResponse updateStatus(
            AuthenticatedUser actor,
            UUID sessionId,
            UpdateSessionStatusRequest request
    ) {
        SessionResponse existing = findSession(
                actor.organizationId(),
                sessionId
        );

        validateActorCanAccessGroup(
                actor,
                existing.groupId(),
                existing.scheduledStart()
                        .toLocalDate()
        );

        validateStatusTransition(
                existing.status(),
                request.status()
        );

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        OffsetDateTime completedAt
                = request.status()
                == SessionStatus.COMPLETED
                        ? now
                        : null;

        OffsetDateTime cancelledAt
                = request.status()
                == SessionStatus.CANCELLED
                        ? now
                        : null;

        if (request.status()
                == SessionStatus.CANCELLED
                && (request.cancellationReason() == null
                || request.cancellationReason().isBlank())) {
            throw new BusinessRuleException(
                    "A cancellation reason is required."
            );
        }

        jdbcTemplate.update(
                """
                UPDATE lesson_sessions
                SET
                    status = ?,
                    completion_notes = ?,
                    cancellation_reason = ?,
                    completed_at = ?,
                    cancelled_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                request.status().name(),
                normalizeNullable(
                        request.completionNotes()
                ),
                normalizeNullable(
                        request.cancellationReason()
                ),
                completedAt,
                cancelledAt,
                now,
                sessionId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "SESSION_STATUS_UPDATED",
                "LESSON_SESSION",
                sessionId,
                "Session status changed from "
                + existing.status()
                + " to " + request.status()
        );

        return findSession(
                actor.organizationId(),
                sessionId
        );
    }

    private void validateGroup(
            UUID organizationId,
            UUID groupId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM academy_groups
                WHERE id = ?
                  AND organization_id = ?
                  AND status IN ('DRAFT', 'ACTIVE')
                """,
                Integer.class,
                groupId,
                organizationId
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected group is invalid "
                    + "or unavailable."
            );
        }
    }

    private CurriculumReference resolveCurriculum(
            UUID organizationId,
            UUID groupId,
            UUID unitId
    ) {
        if (unitId == null) {
            return CurriculumReference.empty();
        }

        return jdbcTemplate.query(
                """
                SELECT
                    gca.id AS assignment_id,
                    gca.curriculum_id
                FROM group_curriculum_assignments gca
                JOIN curriculum_units cu
                  ON cu.curriculum_id =
                     gca.curriculum_id
                 AND cu.organization_id =
                     gca.organization_id
                WHERE gca.organization_id = ?
                  AND gca.group_id = ?
                  AND gca.status = 'ACTIVE'
                  AND cu.id = ?
                """,
                (resultSet, rowNumber)
                -> new CurriculumReference(
                        resultSet.getObject(
                                "assignment_id",
                                UUID.class
                        ),
                        resultSet.getObject(
                                "curriculum_id",
                                UUID.class
                        )
                ),
                organizationId,
                groupId,
                unitId
        ).stream().findFirst().orElseThrow(
                () -> new BusinessRuleException(
                        "The selected curriculum unit is "
                        + "not available for this group."
                )
        );
    }

    private void validateLeadStaff(
            UUID organizationId,
            UUID groupId,
            UUID staffId
    ) {
        if (staffId == null) {
            return;
        }

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_staff_assignments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND staff_id = ?
                  AND status = 'ACTIVE'
                """,
                Integer.class,
                organizationId,
                groupId,
                staffId
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected instructor is not "
                    + "assigned to the group."
            );
        }
    }

    private UUID findCurrentStaffId(
            AuthenticatedUser actor
    ) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM staff_members
                WHERE organization_id = ?
                  AND membership_id = ?
                  AND employment_status = 'ACTIVE'
                """,
                (resultSet, rowNumber)
                -> resultSet.getObject(
                        "id",
                        UUID.class
                ),
                actor.organizationId(),
                actor.membershipId()
        ).stream().findFirst().orElseThrow(
                () -> new BusinessRuleException(
                        "The current account has no active "
                        + "staff profile."
                )
        );
    }

    private void validateSessionTimes(
            OffsetDateTime start,
            OffsetDateTime end
    ) {
        if (!end.isAfter(start)) {
            throw new BusinessRuleException(
                    "Session end time must be after start time."
            );
        }
    }

    private void validateStatusTransition(
            SessionStatus current,
            SessionStatus target
    ) {
        if (current == target) {
            return;
        }

        boolean allowed = switch (current) {
            case SCHEDULED ->
                target == SessionStatus.IN_PROGRESS
                || target == SessionStatus.POSTPONED
                || target == SessionStatus.CANCELLED;

            case POSTPONED ->
                target == SessionStatus.SCHEDULED
                || target == SessionStatus.CANCELLED;

            case IN_PROGRESS ->
                target == SessionStatus.COMPLETED
                || target == SessionStatus.CANCELLED;

            case COMPLETED, CANCELLED ->
                false;
        };

        if (!allowed) {
            throw new BusinessRuleException(
                    "Session status cannot change from "
                    + current + " to " + target + "."
            );
        }
    }

    private SessionResponse mapSession(
            ResultSet resultSet
    ) throws SQLException {
        return new SessionResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getString("group_code"),
                resultSet.getString("group_name"),
                resultSet.getObject(
                        "schedule_rule_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "curriculum_assignment_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "curriculum_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "curriculum_unit_id",
                        UUID.class
                ),
                resultSet.getString(
                        "curriculum_unit_code"
                ),
                resultSet.getString(
                        "curriculum_unit_title"
                ),
                resultSet.getObject(
                        "lead_staff_id",
                        UUID.class
                ),
                resultSet.getString("lead_staff_name"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getObject(
                        "scheduled_start",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "scheduled_end",
                        OffsetDateTime.class
                ),
                resultSet.getString("location"),
                SessionStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getString(
                        "completion_notes"
                ),
                resultSet.getString(
                        "cancellation_reason"
                ),
                resultSet.getObject(
                        "completed_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "cancelled_at",
                        OffsetDateTime.class
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

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private record CurriculumReference(
            UUID assignmentId,
            UUID curriculumId
            ) {

        static CurriculumReference empty() {
            return new CurriculumReference(null, null);
        }
    }

    @Transactional(readOnly = true)
    public SessionResponse findAccessibleSession(
            AuthenticatedUser actor,
            UUID sessionId
    ) {
        SessionResponse session = findSession(
                actor.organizationId(),
                sessionId
        );

        validateActorCanAccessGroup(
                actor,
                session.groupId(),
                session.scheduledStart()
                        .toLocalDate()
        );

        return session;
    }

    private void validateActorCanAccessGroup(
            AuthenticatedUser actor,
            UUID groupId,
            java.time.LocalDate operationDate
    ) {
        if (isOrganizationAdministrator(actor)) {
            return;
        }

        UUID staffId = findCurrentStaffId(actor);

        Integer assignmentCount
                = jdbcTemplate.queryForObject(
                        """
                    SELECT COUNT(*)
                    FROM group_staff_assignments
                    WHERE organization_id = ?
                      AND group_id = ?
                      AND staff_id = ?
                      AND status = 'ACTIVE'
                      AND start_date <= ?
                      AND (
                          end_date IS NULL
                          OR end_date >= ?
                      )
                    """,
                        Integer.class,
                        actor.organizationId(),
                        groupId,
                        staffId,
                        operationDate,
                        operationDate
                );

        if (assignmentCount == null
                || assignmentCount == 0) {
            throw new ResourceNotFoundException(
                    "Session was not found."
            );
        }
    }
}
