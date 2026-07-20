package com.academy.platform.attendance;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ConflictException;
import com.academy.platform.common.ResourceNotFoundException;

@Service
public class AttendanceCorrectionService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public AttendanceCorrectionService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional
    public AttendanceCorrectionResponse openCorrection(
            AuthenticatedUser actor,
            UUID sessionId,
            String reason
    ) {
        SessionFinalizationRecord session
                = findFinalizedSessionForUpdate(
                        actor.organizationId(),
                        sessionId
                );

        validateCorrectionAccess(actor, session);

        if (session.finalizedAt() == null
                || session.finalizedBy() == null) {
            throw new BusinessRuleException(
                    "Only finalized attendance can be reopened."
            );
        }

        ensureNoOpenCorrection(
                actor.organizationId(),
                sessionId
        );

        UUID correctionId = UUID.randomUUID();

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO attendance_correction_batches
                (
                    id,
                    organization_id,
                    session_id,
                    status,
                    correction_reason,
                    previous_finalized_at,
                    previous_finalized_by,
                    opened_by,
                    opened_at,
                    completed_by,
                    completed_at,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    'OPEN',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    NULL,
                    NULL,
                    ?,
                    ?,
                    0
                )
                """,
                correctionId,
                actor.organizationId(),
                sessionId,
                reason.trim(),
                session.finalizedAt(),
                session.finalizedBy(),
                actor.userId(),
                now,
                now,
                now
        );

        jdbcTemplate.update(
                """
                UPDATE lesson_sessions
                SET
                    attendance_finalized_at = NULL,
                    attendance_finalized_by = NULL,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                now,
                sessionId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "ATTENDANCE_CORRECTION_OPENED",
                "ATTENDANCE_CORRECTION",
                correctionId,
                "Attendance reopened. Reason: "
                + reason.trim()
        );

        return findCorrection(
                actor,
                sessionId,
                correctionId
        );
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> findHistory(
            AuthenticatedUser actor,
            UUID sessionId
    ) {
        SessionFinalizationRecord session
                = findSession(
                        actor.organizationId(),
                        sessionId
                );

        validateCorrectionAccess(actor, session);

        List<CorrectionRecord> corrections
                = jdbcTemplate.query(
                        """
                        SELECT
                            acb.id,
                            acb.session_id,
                            acb.status,
                            acb.correction_reason,
                            acb.previous_finalized_at,
                            acb.previous_finalized_by,
                            acb.opened_by,

                            CONCAT(
                                opened_membership.display_first_name,
                                ' ',
                                opened_membership.display_last_name
                            ) AS opened_by_name,

                            acb.opened_at,
                            acb.completed_by,

                            CASE
                                WHEN completed_membership.id IS NULL
                                THEN NULL
                                ELSE CONCAT(
                                    completed_membership.display_first_name,
                                    ' ',
                                    completed_membership.display_last_name
                                )
                            END AS completed_by_name,

                            acb.completed_at

                        FROM attendance_correction_batches acb

                        JOIN users opened_user
                            ON opened_user.id = acb.opened_by

                        LEFT JOIN organization_memberships
                            opened_membership
                            ON opened_membership.user_id =
                               opened_user.id
                           AND opened_membership.organization_id =
                               acb.organization_id

                        LEFT JOIN users completed_user
                            ON completed_user.id =
                               acb.completed_by

                        LEFT JOIN organization_memberships
                            completed_membership
                            ON completed_membership.user_id =
                               completed_user.id
                           AND completed_membership.organization_id =
                               acb.organization_id

                        WHERE acb.organization_id = ?
                          AND acb.session_id = ?

                        ORDER BY acb.opened_at DESC
                        """,
                        (resultSet, rowNumber)
                        -> mapCorrectionRecord(
                                resultSet
                        ),
                        actor.organizationId(),
                        sessionId
                );

        return corrections.stream()
                .map(correction
                        -> createCorrectionResponse(
                        actor.organizationId(),
                        correction
                )
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public AttendanceCorrectionResponse findCorrection(
            AuthenticatedUser actor,
            UUID sessionId,
            UUID correctionId
    ) {
        SessionFinalizationRecord session
                = findSession(
                        actor.organizationId(),
                        sessionId
                );

        validateCorrectionAccess(actor, session);

        CorrectionRecord correction
                = jdbcTemplate.query(
                        """
                        SELECT
                            acb.id,
                            acb.session_id,
                            acb.status,
                            acb.correction_reason,
                            acb.previous_finalized_at,
                            acb.previous_finalized_by,
                            acb.opened_by,

                            CONCAT(
                                opened_membership.display_first_name,
                                ' ',
                                opened_membership.display_last_name
                            ) AS opened_by_name,

                            acb.opened_at,
                            acb.completed_by,

                            CASE
                                WHEN completed_membership.id IS NULL
                                THEN NULL
                                ELSE CONCAT(
                                    completed_membership.display_first_name,
                                    ' ',
                                    completed_membership.display_last_name
                                )
                            END AS completed_by_name,

                            acb.completed_at

                        FROM attendance_correction_batches acb

                        JOIN users opened_user
                            ON opened_user.id = acb.opened_by

                        LEFT JOIN organization_memberships
                            opened_membership
                            ON opened_membership.user_id =
                               opened_user.id
                           AND opened_membership.organization_id =
                               acb.organization_id

                        LEFT JOIN users completed_user
                            ON completed_user.id =
                               acb.completed_by

                        LEFT JOIN organization_memberships
                            completed_membership
                            ON completed_membership.user_id =
                               completed_user.id
                           AND completed_membership.organization_id =
                               acb.organization_id

                        WHERE acb.id = ?
                          AND acb.organization_id = ?
                          AND acb.session_id = ?
                        """,
                        (resultSet, rowNumber)
                        -> mapCorrectionRecord(
                                resultSet
                        ),
                        correctionId,
                        actor.organizationId(),
                        sessionId
                ).stream().findFirst().orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Attendance correction was not found."
                        )
                );

        return createCorrectionResponse(
                actor.organizationId(),
                correction
        );
    }

    @Transactional(readOnly = true)
    public UUID findOpenCorrectionId(
            UUID organizationId,
            UUID sessionId
    ) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM attendance_correction_batches
                WHERE organization_id = ?
                  AND session_id = ?
                  AND status = 'OPEN'
                """,
                (resultSet, rowNumber)
                -> resultSet.getObject(
                        "id",
                        UUID.class
                ),
                organizationId,
                sessionId
        ).stream().findFirst().orElse(null);
    }

    @Transactional(readOnly = true)
    public OpenCorrectionSummary findOpenCorrection(
            UUID organizationId,
            UUID sessionId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    correction_reason
                FROM attendance_correction_batches
                WHERE organization_id = ?
                  AND session_id = ?
                  AND status = 'OPEN'
                """,
                (resultSet, rowNumber)
                -> new OpenCorrectionSummary(
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getString(
                                "correction_reason"
                        )
                ),
                organizationId,
                sessionId
        ).stream().findFirst().orElse(null);
    }

    @Transactional
    public void recordChange(
            UUID organizationId,
            UUID correctionBatchId,
            UUID sessionId,
            ExistingAttendanceRecord previous,
            AttendanceRecordRequest updated,
            UUID actorUserId,
            OffsetDateTime changedAt
    ) {
        if (!attendanceChanged(previous, updated)) {
            return;
        }

        jdbcTemplate.update(
                """
                INSERT INTO attendance_change_history
                (
                    id,
                    organization_id,
                    correction_batch_id,
                    session_id,
                    attendance_record_id,
                    student_id,
                    previous_status,
                    new_status,
                    previous_arrival_time,
                    new_arrival_time,
                    previous_departure_time,
                    new_departure_time,
                    previous_note,
                    new_note,
                    changed_by,
                    changed_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?
                )
                """,
                UUID.randomUUID(),
                organizationId,
                correctionBatchId,
                sessionId,
                previous.id(),
                previous.studentId(),
                previous.status().name(),
                updated.status().name(),
                previous.arrivalTime(),
                updated.arrivalTime(),
                previous.departureTime(),
                updated.departureTime(),
                previous.note(),
                normalizeNullable(updated.note()),
                actorUserId,
                changedAt
        );
    }

    @Transactional
    public void completeOpenCorrection(
            UUID organizationId,
            UUID sessionId,
            UUID actorUserId,
            OffsetDateTime completedAt
    ) {
        jdbcTemplate.update(
                """
                UPDATE attendance_correction_batches
                SET
                    status = 'COMPLETED',
                    completed_by = ?,
                    completed_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE organization_id = ?
                  AND session_id = ?
                  AND status = 'OPEN'
                """,
                actorUserId,
                completedAt,
                completedAt,
                organizationId,
                sessionId
        );
    }

    private AttendanceCorrectionResponse
            createCorrectionResponse(
                    UUID organizationId,
                    CorrectionRecord correction
            ) {
        List<AttendanceChangeResponse> changes
                = findChanges(
                        organizationId,
                        correction.id()
                );

        return new AttendanceCorrectionResponse(
                correction.id(),
                correction.sessionId(),
                correction.status(),
                correction.reason(),
                correction.previousFinalizedAt(),
                correction.previousFinalizedBy(),
                correction.openedBy(),
                correction.openedByName(),
                correction.openedAt(),
                correction.completedBy(),
                correction.completedByName(),
                correction.completedAt(),
                changes.size(),
                changes
        );
    }

    private List<AttendanceChangeResponse> findChanges(
            UUID organizationId,
            UUID correctionId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    ach.id,
                    ach.attendance_record_id,
                    ach.student_id,
                    s.student_number,
                    s.first_name,
                    s.last_name,
                    ach.previous_status,
                    ach.new_status,
                    ach.previous_arrival_time,
                    ach.new_arrival_time,
                    ach.previous_departure_time,
                    ach.new_departure_time,
                    ach.previous_note,
                    ach.new_note,
                    ach.changed_by,

                    CONCAT(
                        om.display_first_name,
                        ' ',
                        om.display_last_name
                    ) AS changed_by_name,

                    ach.changed_at

                FROM attendance_change_history ach

                JOIN students s
                    ON s.id = ach.student_id
                   AND s.organization_id =
                       ach.organization_id

                JOIN users changed_user
                    ON changed_user.id =
                       ach.changed_by

                LEFT JOIN organization_memberships om
                    ON om.user_id = changed_user.id
                   AND om.organization_id =
                       ach.organization_id

                WHERE ach.organization_id = ?
                  AND ach.correction_batch_id = ?

                ORDER BY ach.changed_at, s.first_name,
                         s.last_name
                """,
                (resultSet, rowNumber)
                -> mapChange(resultSet),
                organizationId,
                correctionId
        );
    }

    private ExistingAttendanceRecord mapExistingRecord(
            ResultSet resultSet
    ) throws SQLException {
        return new ExistingAttendanceRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "student_id",
                        UUID.class
                ),
                AttendanceStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getObject(
                        "arrival_time",
                        LocalTime.class
                ),
                resultSet.getObject(
                        "departure_time",
                        LocalTime.class
                ),
                resultSet.getString("note")
        );
    }

    private AttendanceChangeResponse mapChange(
            ResultSet resultSet
    ) throws SQLException {
        return new AttendanceChangeResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "attendance_record_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "student_id",
                        UUID.class
                ),
                resultSet.getString(
                        "student_number"
                ),
                resultSet.getString("first_name"),
                resultSet.getString("last_name"),
                AttendanceStatus.valueOf(
                        resultSet.getString(
                                "previous_status"
                        )
                ),
                AttendanceStatus.valueOf(
                        resultSet.getString(
                                "new_status"
                        )
                ),
                resultSet.getObject(
                        "previous_arrival_time",
                        LocalTime.class
                ),
                resultSet.getObject(
                        "new_arrival_time",
                        LocalTime.class
                ),
                resultSet.getObject(
                        "previous_departure_time",
                        LocalTime.class
                ),
                resultSet.getObject(
                        "new_departure_time",
                        LocalTime.class
                ),
                resultSet.getString("previous_note"),
                resultSet.getString("new_note"),
                resultSet.getObject(
                        "changed_by",
                        UUID.class
                ),
                resultSet.getString(
                        "changed_by_name"
                ),
                resultSet.getObject(
                        "changed_at",
                        OffsetDateTime.class
                )
        );
    }

    private CorrectionRecord mapCorrectionRecord(
            ResultSet resultSet
    ) throws SQLException {
        return new CorrectionRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "session_id",
                        UUID.class
                ),
                AttendanceCorrectionStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getString(
                        "correction_reason"
                ),
                resultSet.getObject(
                        "previous_finalized_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "previous_finalized_by",
                        UUID.class
                ),
                resultSet.getObject(
                        "opened_by",
                        UUID.class
                ),
                resultSet.getString(
                        "opened_by_name"
                ),
                resultSet.getObject(
                        "opened_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "completed_by",
                        UUID.class
                ),
                resultSet.getString(
                        "completed_by_name"
                ),
                resultSet.getObject(
                        "completed_at",
                        OffsetDateTime.class
                )
        );
    }

    private void ensureNoOpenCorrection(
            UUID organizationId,
            UUID sessionId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM attendance_correction_batches
                WHERE organization_id = ?
                  AND session_id = ?
                  AND status = 'OPEN'
                """,
                Integer.class,
                organizationId,
                sessionId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "Attendance already has an open "
                    + "correction workflow."
            );
        }
    }

    private SessionFinalizationRecord
            findFinalizedSessionForUpdate(
                    UUID organizationId,
                    UUID sessionId
            ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    group_id,
                    scheduled_start,
                    status,
                    attendance_finalized_at,
                    attendance_finalized_by
                FROM lesson_sessions
                WHERE id = ?
                  AND organization_id = ?
                FOR UPDATE
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

    private SessionFinalizationRecord findSession(
            UUID organizationId,
            UUID sessionId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    group_id,
                    scheduled_start,
                    status,
                    attendance_finalized_at,
                    attendance_finalized_by
                FROM lesson_sessions
                WHERE id = ?
                  AND organization_id = ?
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

    private SessionFinalizationRecord mapSession(
            ResultSet resultSet
    ) throws SQLException {
        return new SessionFinalizationRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "scheduled_start",
                        OffsetDateTime.class
                ),
                resultSet.getString("status"),
                resultSet.getObject(
                        "attendance_finalized_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "attendance_finalized_by",
                        UUID.class
                )
        );
    }

    private void validateCorrectionAccess(
            AuthenticatedUser actor,
            SessionFinalizationRecord session
    ) {
        if (actor.roles().contains(
                "ORGANIZATION_ADMIN"
        )) {
            return;
        }

        UUID staffId = jdbcTemplate.query(
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
                () -> new ResourceNotFoundException(
                        "Session was not found."
                )
        );

        LocalDate sessionDate
                = session.scheduledStart()
                        .toLocalDate();

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
                        session.groupId(),
                        staffId,
                        sessionDate,
                        sessionDate
                );

        if (assignmentCount == null
                || assignmentCount == 0) {
            throw new ResourceNotFoundException(
                    "Session was not found."
            );
        }
    }

    private boolean attendanceChanged(
            ExistingAttendanceRecord previous,
            AttendanceRecordRequest updated
    ) {
        return previous.status()
                != updated.status()
                || !java.util.Objects.equals(
                        previous.arrivalTime(),
                        updated.arrivalTime()
                )
                || !java.util.Objects.equals(
                        previous.departureTime(),
                        updated.departureTime()
                )
                || !java.util.Objects.equals(
                        normalizeNullable(
                                previous.note()
                        ),
                        normalizeNullable(
                                updated.note()
                        )
                );
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    public ExistingAttendanceRecord
            findExistingAttendanceRecord(
                    UUID organizationId,
                    UUID sessionId,
                    UUID studentId
            ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    student_id,
                    status,
                    arrival_time,
                    departure_time,
                    note
                FROM attendance_records
                WHERE organization_id = ?
                  AND session_id = ?
                  AND student_id = ?
                """,
                (resultSet, rowNumber)
                -> mapExistingRecord(resultSet),
                organizationId,
                sessionId,
                studentId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Attendance record was not found."
                )
        );
    }

    public record ExistingAttendanceRecord(
            UUID id,
            UUID studentId,
            AttendanceStatus status,
            LocalTime arrivalTime,
            LocalTime departureTime,
            String note
            ) {

    }

    public record OpenCorrectionSummary(
            UUID id,
            String reason
            ) {

    }

    private record SessionFinalizationRecord(
            UUID id,
            UUID groupId,
            OffsetDateTime scheduledStart,
            String status,
            OffsetDateTime finalizedAt,
            UUID finalizedBy
            ) {

    }

    private record CorrectionRecord(
            UUID id,
            UUID sessionId,
            AttendanceCorrectionStatus status,
            String reason,
            OffsetDateTime previousFinalizedAt,
            UUID previousFinalizedBy,
            UUID openedBy,
            String openedByName,
            OffsetDateTime openedAt,
            UUID completedBy,
            String completedByName,
            OffsetDateTime completedAt
            ) {

    }
}
