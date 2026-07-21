package com.academy.platform.media;

import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MediaAccessService {

    private final JdbcTemplate jdbcTemplate;

    public MediaAccessService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public void authorizeMediaRead(
            AuthenticatedUser actor,
            UUID mediaId
    ) {
        if (isAdministrator(actor)) {
            ensureMediaExists(
                    actor.organizationId(),
                    mediaId
            );

            return;
        }

        if (isGuardian(actor)) {
            authorizeGuardianMediaRead(
                    actor,
                    mediaId
            );

            return;
        }

        authorizeInstructorMediaRead(
                actor,
                mediaId
        );
    }

    @Transactional(readOnly = true)
    public void authorizeTargetRead(
            AuthenticatedUser actor,
            MediaTargetType targetType,
            UUID targetId
    ) {
        if (isAdministrator(actor)) {
            ensureTargetExists(
                    actor.organizationId(),
                    targetType,
                    targetId
            );

            return;
        }

        if (isGuardian(actor)) {
            authorizeGuardianTargetRead(
                    actor,
                    targetType,
                    targetId
            );

            return;
        }

        authorizeInstructorTargetRead(
                actor,
                targetType,
                targetId
        );
    }

    private void authorizeGuardianMediaRead(
            AuthenticatedUser actor,
            UUID mediaId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(DISTINCT ml.id)

                FROM media_links ml

                JOIN media_files mf
                    ON mf.id = ml.media_id
                   AND mf.organization_id =
                       ml.organization_id

                JOIN guardians g
                    ON g.organization_id =
                       ml.organization_id
                   AND g.membership_id = ?

                JOIN student_guardians sg
                    ON sg.guardian_id = g.id
                   AND sg.organization_id =
                       g.organization_id

                LEFT JOIN lesson_sessions ls
                    ON ls.id = ml.session_id
                   AND ls.organization_id =
                       ml.organization_id

                LEFT JOIN student_evaluations se
                    ON se.id = ml.evaluation_id
                   AND se.organization_id =
                       ml.organization_id

                LEFT JOIN organizations o
                    ON o.id = ml.organization_id

                WHERE ml.organization_id = ?
                  AND ml.media_id = ?
                  AND mf.status = 'AVAILABLE'
                  AND g.status = 'ACTIVE'

                  AND (
                      (
                          ml.purpose = 'INTERNAL'
                          AND
                          sg.internal_media_consent = TRUE
                      )
                      OR
                      (
                          ml.purpose = 'MARKETING'
                          AND
                          sg.marketing_media_consent = TRUE
                      )
                  )

                  AND (
                      ml.student_id = sg.student_id

                      OR EXISTS (
                          SELECT 1
                          FROM group_enrollments ge
                          WHERE ml.group_id IS NOT NULL
                            AND ge.organization_id =
                                ml.organization_id
                            AND ge.group_id =
                                ml.group_id
                            AND ge.student_id =
                                sg.student_id
                            AND ge.status <>
                                'CANCELLED'
                      )

                      OR EXISTS (
                          SELECT 1
                          FROM group_enrollments ge
                          WHERE ml.session_id IS NOT NULL
                            AND ge.organization_id =
                                ml.organization_id
                            AND ge.group_id =
                                ls.group_id
                            AND ge.student_id =
                                sg.student_id
                            AND ge.status <>
                                'CANCELLED'
                            AND ge.enrolled_at <=
                                (
                                    ls.scheduled_start
                                    AT TIME ZONE
                                    o.timezone
                                )::DATE
                            AND (
                                ge.ended_at IS NULL
                                OR ge.ended_at >=
                                   (
                                       ls.scheduled_start
                                       AT TIME ZONE
                                       o.timezone
                                   )::DATE
                            )
                      )

                      OR (
                          ml.evaluation_id IS NOT NULL
                          AND se.student_id =
                              sg.student_id
                          AND se.status = 'PUBLISHED'
                      )
                  )
                """,
                Integer.class,
                actor.membershipId(),
                actor.organizationId(),
                mediaId
        );

        requireAccess(count);
    }

    private void authorizeGuardianTargetRead(
            AuthenticatedUser actor,
            MediaTargetType targetType,
            UUID targetId
    ) {
        Integer count = switch (targetType) {
            case STUDENT ->
                    countGuardianStudentAccess(
                            actor,
                            targetId
                    );

            case GROUP ->
                    countGuardianGroupAccess(
                            actor,
                            targetId
                    );

            case SESSION ->
                    countGuardianSessionAccess(
                            actor,
                            targetId
                    );

            case EVALUATION ->
                    countGuardianEvaluationAccess(
                            actor,
                            targetId
                    );
        };

        requireAccess(count);
    }

    private Integer countGuardianStudentAccess(
            AuthenticatedUser actor,
            UUID studentId
    ) {
        return jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)

                FROM guardians g

                JOIN student_guardians sg
                    ON sg.guardian_id = g.id
                   AND sg.organization_id =
                       g.organization_id

                WHERE g.organization_id = ?
                  AND g.membership_id = ?
                  AND g.status = 'ACTIVE'
                  AND sg.student_id = ?
                  AND (
                      sg.internal_media_consent = TRUE
                      OR sg.marketing_media_consent = TRUE
                  )
                """,
                Integer.class,
                actor.organizationId(),
                actor.membershipId(),
                studentId
        );
    }

    private Integer countGuardianGroupAccess(
            AuthenticatedUser actor,
            UUID groupId
    ) {
        return jdbcTemplate.queryForObject(
                """
                SELECT COUNT(DISTINCT ge.id)

                FROM guardians g

                JOIN student_guardians sg
                    ON sg.guardian_id = g.id
                   AND sg.organization_id =
                       g.organization_id

                JOIN group_enrollments ge
                    ON ge.student_id = sg.student_id
                   AND ge.organization_id =
                       sg.organization_id

                WHERE g.organization_id = ?
                  AND g.membership_id = ?
                  AND g.status = 'ACTIVE'
                  AND ge.group_id = ?
                  AND ge.status <> 'CANCELLED'
                  AND (
                      sg.internal_media_consent = TRUE
                      OR sg.marketing_media_consent = TRUE
                  )
                """,
                Integer.class,
                actor.organizationId(),
                actor.membershipId(),
                groupId
        );
    }

    private Integer countGuardianSessionAccess(
            AuthenticatedUser actor,
            UUID sessionId
    ) {
        return jdbcTemplate.queryForObject(
                """
                SELECT COUNT(DISTINCT ge.id)

                FROM guardians g

                JOIN student_guardians sg
                    ON sg.guardian_id = g.id
                   AND sg.organization_id =
                       g.organization_id

                JOIN lesson_sessions ls
                    ON ls.organization_id =
                       sg.organization_id
                   AND ls.id = ?

                JOIN organizations o
                    ON o.id = ls.organization_id

                JOIN group_enrollments ge
                    ON ge.organization_id =
                       ls.organization_id
                   AND ge.group_id = ls.group_id
                   AND ge.student_id =
                       sg.student_id

                WHERE g.organization_id = ?
                  AND g.membership_id = ?
                  AND g.status = 'ACTIVE'
                  AND ge.status <> 'CANCELLED'
                  AND ge.enrolled_at <=
                      (
                          ls.scheduled_start
                          AT TIME ZONE o.timezone
                      )::DATE
                  AND (
                      ge.ended_at IS NULL
                      OR ge.ended_at >=
                         (
                             ls.scheduled_start
                             AT TIME ZONE o.timezone
                         )::DATE
                  )
                  AND (
                      sg.internal_media_consent = TRUE
                      OR sg.marketing_media_consent = TRUE
                  )
                """,
                Integer.class,
                sessionId,
                actor.organizationId(),
                actor.membershipId()
        );
    }

    private Integer countGuardianEvaluationAccess(
            AuthenticatedUser actor,
            UUID evaluationId
    ) {
        return jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)

                FROM guardians g

                JOIN student_guardians sg
                    ON sg.guardian_id = g.id
                   AND sg.organization_id =
                       g.organization_id

                JOIN student_evaluations se
                    ON se.student_id = sg.student_id
                   AND se.organization_id =
                       sg.organization_id

                WHERE g.organization_id = ?
                  AND g.membership_id = ?
                  AND g.status = 'ACTIVE'
                  AND se.id = ?
                  AND se.status = 'PUBLISHED'
                  AND (
                      sg.internal_media_consent = TRUE
                      OR sg.marketing_media_consent = TRUE
                  )
                """,
                Integer.class,
                actor.organizationId(),
                actor.membershipId(),
                evaluationId
        );
    }

    private void authorizeInstructorMediaRead(
            AuthenticatedUser actor,
            UUID mediaId
    ) {
        Integer ownUploadCount =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM media_files
                        WHERE organization_id = ?
                          AND id = ?
                          AND uploaded_by = ?
                          AND status <> 'DELETED'
                        """,
                        Integer.class,
                        actor.organizationId(),
                        mediaId,
                        actor.userId()
                );

        if (ownUploadCount != null
                && ownUploadCount > 0) {
            return;
        }

        UUID staffId = findCurrentStaffId(actor);

        Integer linkedCount =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(DISTINCT ml.id)

                        FROM media_links ml

                        LEFT JOIN lesson_sessions ls
                            ON ls.id = ml.session_id
                           AND ls.organization_id =
                               ml.organization_id

                        LEFT JOIN student_evaluations se
                            ON se.id =
                               ml.evaluation_id
                           AND se.organization_id =
                               ml.organization_id

                        WHERE ml.organization_id = ?
                          AND ml.media_id = ?

                          AND (
                              EXISTS (
                                  SELECT 1

                                  FROM group_enrollments ge

                                  JOIN group_staff_assignments
                                      gsa
                                    ON gsa.group_id =
                                       ge.group_id
                                   AND gsa.organization_id =
                                       ge.organization_id

                                  WHERE ml.student_id
                                        IS NOT NULL
                                    AND ge.student_id =
                                        ml.student_id
                                    AND ge.organization_id =
                                        ml.organization_id
                                    AND gsa.staff_id = ?
                                    AND ge.status <>
                                        'CANCELLED'
                                    AND gsa.status <>
                                        'CANCELLED'
                              )

                              OR EXISTS (
                                  SELECT 1
                                  FROM group_staff_assignments
                                      gsa
                                  WHERE ml.group_id
                                        IS NOT NULL
                                    AND gsa.organization_id =
                                        ml.organization_id
                                    AND gsa.group_id =
                                        ml.group_id
                                    AND gsa.staff_id = ?
                                    AND gsa.status =
                                        'ACTIVE'
                              )

                              OR EXISTS (
                                  SELECT 1
                                  FROM group_staff_assignments
                                      gsa
                                  WHERE ml.session_id
                                        IS NOT NULL
                                    AND gsa.organization_id =
                                        ml.organization_id
                                    AND gsa.group_id =
                                        ls.group_id
                                    AND gsa.staff_id = ?
                                    AND gsa.status <>
                                        'CANCELLED'
                                    AND gsa.start_date <=
                                        ls.scheduled_start::DATE
                                    AND (
                                        gsa.end_date IS NULL
                                        OR gsa.end_date >=
                                           ls.scheduled_start::DATE
                                    )
                              )

                              OR EXISTS (
                                  SELECT 1
                                  FROM group_staff_assignments
                                      gsa
                                  WHERE ml.evaluation_id
                                        IS NOT NULL
                                    AND gsa.organization_id =
                                        ml.organization_id
                                    AND gsa.group_id =
                                        se.group_id
                                    AND gsa.staff_id = ?
                                    AND gsa.status <>
                                        'CANCELLED'
                                    AND gsa.start_date <=
                                        se.evaluation_date
                                    AND (
                                        gsa.end_date IS NULL
                                        OR gsa.end_date >=
                                           se.evaluation_date
                                    )
                              )
                          )
                        """,
                        Integer.class,
                        actor.organizationId(),
                        mediaId,
                        staffId,
                        staffId,
                        staffId,
                        staffId
                );

        requireAccess(linkedCount);
    }

    private void authorizeInstructorTargetRead(
            AuthenticatedUser actor,
            MediaTargetType targetType,
            UUID targetId
    ) {
        UUID staffId = findCurrentStaffId(actor);

        Integer count = switch (targetType) {
            case STUDENT ->
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(DISTINCT ge.group_id)
                            FROM group_enrollments ge

                            JOIN group_staff_assignments gsa
                              ON gsa.group_id =
                                 ge.group_id
                             AND gsa.organization_id =
                                 ge.organization_id

                            WHERE ge.organization_id = ?
                              AND ge.student_id = ?
                              AND gsa.staff_id = ?
                              AND ge.status <>
                                  'CANCELLED'
                              AND gsa.status <>
                                  'CANCELLED'
                            """,
                            Integer.class,
                            actor.organizationId(),
                            targetId,
                            staffId
                    );

            case GROUP ->
                    countStaffGroupAccess(
                            actor.organizationId(),
                            targetId,
                            staffId
                    );

            case SESSION ->
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(*)

                            FROM lesson_sessions ls

                            JOIN group_staff_assignments gsa
                              ON gsa.group_id =
                                 ls.group_id
                             AND gsa.organization_id =
                                 ls.organization_id

                            WHERE ls.organization_id = ?
                              AND ls.id = ?
                              AND gsa.staff_id = ?
                              AND gsa.status <>
                                  'CANCELLED'
                              AND gsa.start_date <=
                                  ls.scheduled_start::DATE
                              AND (
                                  gsa.end_date IS NULL
                                  OR gsa.end_date >=
                                     ls.scheduled_start::DATE
                              )
                            """,
                            Integer.class,
                            actor.organizationId(),
                            targetId,
                            staffId
                    );

            case EVALUATION ->
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(*)

                            FROM student_evaluations se

                            JOIN group_staff_assignments gsa
                              ON gsa.group_id =
                                 se.group_id
                             AND gsa.organization_id =
                                 se.organization_id

                            WHERE se.organization_id = ?
                              AND se.id = ?
                              AND gsa.staff_id = ?
                              AND gsa.status <>
                                  'CANCELLED'
                              AND gsa.start_date <=
                                  se.evaluation_date
                              AND (
                                  gsa.end_date IS NULL
                                  OR gsa.end_date >=
                                     se.evaluation_date
                              )
                            """,
                            Integer.class,
                            actor.organizationId(),
                            targetId,
                            staffId
                    );
        };

        requireAccess(count);
    }

    private Integer countStaffGroupAccess(
            UUID organizationId,
            UUID groupId,
            UUID staffId
    ) {
        return jdbcTemplate.queryForObject(
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
                () -> notFound()
        );
    }

    private void ensureMediaExists(
            UUID organizationId,
            UUID mediaId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM media_files
                WHERE organization_id = ?
                  AND id = ?
                  AND status <> 'DELETED'
                """,
                Integer.class,
                organizationId,
                mediaId
        );

        requireAccess(count);
    }

    private void ensureTargetExists(
            UUID organizationId,
            MediaTargetType type,
            UUID targetId
    ) {
        String table = switch (type) {
            case STUDENT -> "students";
            case GROUP -> "academy_groups";
            case SESSION -> "lesson_sessions";
            case EVALUATION ->
                    "student_evaluations";
        };

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM %s
                WHERE organization_id = ?
                  AND id = ?
                """.formatted(table),
                Integer.class,
                organizationId,
                targetId
        );

        requireAccess(count);
    }

    private void requireAccess(Integer count) {
        if (count == null || count == 0) {
            throw notFound();
        }
    }

    private ResourceNotFoundException notFound() {
        return new ResourceNotFoundException(
                "Media file was not found."
        );
    }

    private boolean isAdministrator(
            AuthenticatedUser actor
    ) {
        return actor.roles().contains(
                "ORGANIZATION_ADMIN"
        );
    }

    private boolean isGuardian(
            AuthenticatedUser actor
    ) {
        return actor.roles().contains("GUARDIAN");
    }
}
