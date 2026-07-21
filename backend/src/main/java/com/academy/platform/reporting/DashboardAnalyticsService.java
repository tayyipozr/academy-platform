package com.academy.platform.reporting;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardAnalyticsService {

    private static final int UPCOMING_SESSION_LIMIT = 10;

    private final JdbcTemplate jdbcTemplate;

    public DashboardAnalyticsService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(
            AuthenticatedUser actor
    ) {
        boolean administrator =
                isAdministrator(actor);

        UUID staffId = administrator
                ? null
                : findCurrentStaffId(actor);

        long activeStudents = countActiveStudents(
                actor.organizationId(),
                administrator,
                staffId
        );

        long activeGroups = countActiveGroups(
                actor.organizationId(),
                administrator,
                staffId
        );

        long activeStaff = administrator
                ? countActiveStaff(
                        actor.organizationId()
                )
                : 1;

        long upcomingSessions = countUpcomingSessions(
                actor.organizationId(),
                administrator,
                staffId
        );

        long missingAttendance =
                countSessionsMissingAttendance(
                        actor.organizationId(),
                        administrator,
                        staffId
                );

        EvaluationCounts evaluationCounts =
                countEvaluations(
                        actor.organizationId(),
                        administrator,
                        staffId
                );

        long activeCurricula = countActiveCurricula(
                actor.organizationId(),
                administrator,
                staffId
        );

        List<UpcomingSessionSummaryResponse>
                upcoming =
                findUpcomingSessions(
                        actor.organizationId(),
                        administrator,
                        staffId
                );

        return new DashboardSummaryResponse(
                administrator
                        ? "ADMINISTRATOR"
                        : "INSTRUCTOR",

                activeStudents,
                activeGroups,
                activeStaff,

                upcomingSessions,
                missingAttendance,

                evaluationCounts.draft(),
                evaluationCounts.submitted(),
                evaluationCounts.published(),

                activeCurricula,

                OffsetDateTime.now(ZoneOffset.UTC),

                upcoming
        );
    }

    private long countActiveStudents(
            UUID organizationId,
            boolean administrator,
            UUID staffId
    ) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(DISTINCT s.id)

                FROM students s

                WHERE s.organization_id = ?
                  AND s.status = 'ACTIVE'

                  AND (
                      ? = TRUE

                      OR EXISTS (
                          SELECT 1

                          FROM group_enrollments ge

                          JOIN group_staff_assignments gsa
                            ON gsa.group_id = ge.group_id
                           AND gsa.organization_id =
                               ge.organization_id

                          WHERE ge.organization_id =
                                s.organization_id

                            AND ge.student_id = s.id

                            AND ge.status = 'ACTIVE'

                            AND gsa.staff_id = ?

                            AND gsa.status = 'ACTIVE'
                      )
                  )
                """,
                Long.class,
                organizationId,
                administrator,
                staffId
        );

        return count == null ? 0 : count;
    }

    private long countActiveGroups(
            UUID organizationId,
            boolean administrator,
            UUID staffId
    ) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(DISTINCT ag.id)

                FROM academy_groups ag

                WHERE ag.organization_id = ?
                  AND ag.status IN ('DRAFT', 'ACTIVE')

                  AND (
                      ? = TRUE

                      OR EXISTS (
                          SELECT 1
                          FROM group_staff_assignments gsa
                          WHERE gsa.organization_id =
                                ag.organization_id
                            AND gsa.group_id = ag.id
                            AND gsa.staff_id = ?
                            AND gsa.status = 'ACTIVE'
                      )
                  )
                """,
                Long.class,
                organizationId,
                administrator,
                staffId
        );

        return count == null ? 0 : count;
    }

    private long countActiveStaff(
            UUID organizationId
    ) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM staff_members
                WHERE organization_id = ?
                  AND employment_status = 'ACTIVE'
                """,
                Long.class,
                organizationId
        );

        return count == null ? 0 : count;
    }

    private long countUpcomingSessions(
            UUID organizationId,
            boolean administrator,
            UUID staffId
    ) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)

                FROM lesson_sessions ls

                WHERE ls.organization_id = ?

                  AND ls.scheduled_start >=
                      CURRENT_TIMESTAMP

                  AND ls.status IN (
                      'SCHEDULED',
                      'IN_PROGRESS',
                      'POSTPONED'
                  )

                  AND (
                      ? = TRUE

                      OR ls.lead_staff_id = ?

                      OR EXISTS (
                          SELECT 1
                          FROM group_staff_assignments gsa
                          WHERE gsa.organization_id =
                                ls.organization_id
                            AND gsa.group_id = ls.group_id
                            AND gsa.staff_id = ?
                            AND gsa.status = 'ACTIVE'
                      )
                  )
                """,
                Long.class,
                organizationId,
                administrator,
                staffId,
                staffId
        );

        return count == null ? 0 : count;
    }

    private long countSessionsMissingAttendance(
            UUID organizationId,
            boolean administrator,
            UUID staffId
    ) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)

                FROM lesson_sessions ls

                WHERE ls.organization_id = ?

                  AND ls.scheduled_start <
                      CURRENT_TIMESTAMP

                  AND ls.status IN (
                      'SCHEDULED',
                      'IN_PROGRESS',
                      'COMPLETED'
                  )

                  AND ls.attendance_finalized_at
                      IS NULL

                  AND (
                      ? = TRUE

                      OR ls.lead_staff_id = ?

                      OR EXISTS (
                          SELECT 1
                          FROM group_staff_assignments gsa
                          WHERE gsa.organization_id =
                                ls.organization_id
                            AND gsa.group_id = ls.group_id
                            AND gsa.staff_id = ?
                            AND gsa.status = 'ACTIVE'
                      )
                  )
                """,
                Long.class,
                organizationId,
                administrator,
                staffId,
                staffId
        );

        return count == null ? 0 : count;
    }

    private EvaluationCounts countEvaluations(
            UUID organizationId,
            boolean administrator,
            UUID staffId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    COUNT(*) FILTER (
                        WHERE se.status = 'DRAFT'
                    ) AS draft_count,

                    COUNT(*) FILTER (
                        WHERE se.status = 'SUBMITTED'
                    ) AS submitted_count,

                    COUNT(*) FILTER (
                        WHERE se.status = 'PUBLISHED'
                    ) AS published_count

                FROM student_evaluations se

                WHERE se.organization_id = ?

                  AND (
                      ? = TRUE

                      OR EXISTS (
                          SELECT 1
                          FROM group_staff_assignments gsa
                          WHERE gsa.organization_id =
                                se.organization_id
                            AND gsa.group_id =
                                se.group_id
                            AND gsa.staff_id = ?
                            AND gsa.status <>
                                'CANCELLED'
                      )
                  )
                """,
                (resultSet, rowNumber) ->
                        new EvaluationCounts(
                                resultSet.getLong(
                                        "draft_count"
                                ),
                                resultSet.getLong(
                                        "submitted_count"
                                ),
                                resultSet.getLong(
                                        "published_count"
                                )
                        ),
                organizationId,
                administrator,
                staffId
        ).stream().findFirst().orElse(
                new EvaluationCounts(0, 0, 0)
        );
    }

    private long countActiveCurricula(
            UUID organizationId,
            boolean administrator,
            UUID staffId
    ) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(
                    DISTINCT gca.curriculum_id
                )

                FROM group_curriculum_assignments gca

                WHERE gca.organization_id = ?
                  AND gca.status = 'ACTIVE'

                  AND (
                      ? = TRUE

                      OR EXISTS (
                          SELECT 1
                          FROM group_staff_assignments gsa
                          WHERE gsa.organization_id =
                                gca.organization_id
                            AND gsa.group_id =
                                gca.group_id
                            AND gsa.staff_id = ?
                            AND gsa.status = 'ACTIVE'
                      )
                  )
                """,
                Long.class,
                organizationId,
                administrator,
                staffId
        );

        return count == null ? 0 : count;
    }

    private List<UpcomingSessionSummaryResponse>
    findUpcomingSessions(
            UUID organizationId,
            boolean administrator,
            UUID staffId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    ls.id AS session_id,
                    ls.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    ls.title,
                    ls.scheduled_start,
                    ls.scheduled_end,
                    ls.location,
                    ls.status,
                    ls.lead_staff_id,

                    CASE
                        WHEN sm.id IS NULL THEN NULL
                        ELSE CONCAT(
                            om.display_first_name,
                            ' ',
                            om.display_last_name
                        )
                    END AS lead_staff_name

                FROM lesson_sessions ls

                JOIN academy_groups ag
                    ON ag.id = ls.group_id
                   AND ag.organization_id =
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

                  AND ls.scheduled_start >=
                      CURRENT_TIMESTAMP

                  AND ls.status IN (
                      'SCHEDULED',
                      'IN_PROGRESS',
                      'POSTPONED'
                  )

                  AND (
                      ? = TRUE

                      OR ls.lead_staff_id = ?

                      OR EXISTS (
                          SELECT 1
                          FROM group_staff_assignments gsa
                          WHERE gsa.organization_id =
                                ls.organization_id
                            AND gsa.group_id = ls.group_id
                            AND gsa.staff_id = ?
                            AND gsa.status = 'ACTIVE'
                      )
                  )

                ORDER BY ls.scheduled_start

                LIMIT ?
                """,
                (resultSet, rowNumber) ->
                        new UpcomingSessionSummaryResponse(
                                resultSet.getObject(
                                        "session_id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "group_id",
                                        UUID.class
                                ),
                                resultSet.getString(
                                        "group_code"
                                ),
                                resultSet.getString(
                                        "group_name"
                                ),
                                resultSet.getString("title"),
                                resultSet.getObject(
                                        "scheduled_start",
                                        OffsetDateTime.class
                                ),
                                resultSet.getObject(
                                        "scheduled_end",
                                        OffsetDateTime.class
                                ),
                                resultSet.getString(
                                        "location"
                                ),
                                resultSet.getString("status"),
                                resultSet.getObject(
                                        "lead_staff_id",
                                        UUID.class
                                ),
                                resultSet.getString(
                                        "lead_staff_name"
                                )
                        ),
                organizationId,
                administrator,
                staffId,
                staffId,
                UPCOMING_SESSION_LIMIT
        );
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
                (resultSet, rowNumber) ->
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                actor.organizationId(),
                actor.membershipId()
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Dashboard data was not found."
                )
        );
    }

    private boolean isAdministrator(
            AuthenticatedUser actor
    ) {
        return actor.roles().contains(
                "ORGANIZATION_ADMIN"
        );
    }

    private record EvaluationCounts(
            long draft,
            long submitted,
            long published
    ) {
    }
}
