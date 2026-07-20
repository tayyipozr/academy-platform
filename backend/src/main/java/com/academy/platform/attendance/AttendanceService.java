package com.academy.platform.attendance;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttendanceService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public AttendanceService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional
    public SessionAttendanceResponse initializeAttendance(
            AuthenticatedUser actor,
            UUID sessionId
    ) {
        SessionRecord session = findSession(
                actor.organizationId(),
                sessionId,
                true
        );

        validateAttendanceAccess(actor, session);
        validateSessionAcceptsAttendance(session);

        if (session.attendanceFinalizedAt() != null) {
            return findAttendance(
                    actor,
                    sessionId
            );
        }

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO attendance_records
                (
                    id,
                    organization_id,
                    session_id,
                    student_id,
                    status,
                    arrival_time,
                    departure_time,
                    note,
                    recorded_by,
                    recorded_at,
                    created_at,
                    updated_at,
                    version
                )
                SELECT
                    gen_random_uuid(),
                    ge.organization_id,
                    ?,
                    ge.student_id,
                    'NOT_RECORDED',
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    ?,
                    ?,
                    0

                FROM group_enrollments ge

                JOIN students s
                    ON s.id = ge.student_id
                   AND s.organization_id =
                       ge.organization_id

                WHERE ge.organization_id = ?
                  AND ge.group_id = ?
                  AND ge.enrolled_at <= ?
                  AND (
                      ge.ended_at IS NULL
                      OR ge.ended_at >= ?
                  )
                  AND ge.status <> 'CANCELLED'
                  AND s.status <> 'ARCHIVED'

                ON CONFLICT (
                    organization_id,
                    session_id,
                    student_id
                )
                DO NOTHING
                """,
                sessionId,
                now,
                now,
                actor.organizationId(),
                session.groupId(),
                session.sessionDate(),
                session.sessionDate()
        );

        auditService.record(
                actor,
                "ATTENDANCE_ROSTER_INITIALIZED",
                "LESSON_SESSION",
                sessionId,
                "Attendance roster initialized."
        );

        return findAttendance(actor, sessionId);
    }

    @Transactional(readOnly = true)
    public SessionAttendanceResponse findAttendance(
            AuthenticatedUser actor,
            UUID sessionId
    ) {
        SessionRecord session = findSession(
                actor.organizationId(),
                sessionId,
                false
        );

        validateAttendanceAccess(actor, session);

        List<AttendanceRecordResponse> records =
                jdbcTemplate.query(
                        """
                        SELECT
                            ar.id,
                            ar.session_id,
                            ar.student_id,
                            s.student_number,
                            s.first_name,
                            s.last_name,
                            ar.status,
                            ar.arrival_time,
                            ar.departure_time,
                            ar.note,
                            ar.recorded_by,
                            ar.recorded_at,
                            ar.updated_at

                        FROM attendance_records ar

                        JOIN students s
                            ON s.id = ar.student_id
                           AND s.organization_id =
                               ar.organization_id

                        WHERE ar.organization_id = ?
                          AND ar.session_id = ?

                        ORDER BY
                            s.first_name,
                            s.last_name,
                            s.student_number
                        """,
                        (resultSet, rowNumber) ->
                                mapAttendanceRecord(resultSet),
                        actor.organizationId(),
                        sessionId
                );

        return createResponse(session, records);
    }

    @Transactional
    public SessionAttendanceResponse saveAttendance(
            AuthenticatedUser actor,
            UUID sessionId,
            SaveAttendanceRequest request
    ) {
        SessionRecord session = findSession(
                actor.organizationId(),
                sessionId,
                true
        );

        validateAttendanceAccess(actor, session);
        validateSessionAcceptsAttendance(session);

        if (session.attendanceFinalizedAt() != null) {
            throw new BusinessRuleException(
                    "Finalized attendance cannot be modified."
            );
        }

        validateUniqueStudents(request.records());

        Set<UUID> rosterStudentIds =
                findRosterStudentIds(
                        actor.organizationId(),
                        sessionId
                );

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        for (AttendanceRecordRequest record
                : request.records()) {

            if (!rosterStudentIds.contains(
                    record.studentId()
            )) {
                throw new BusinessRuleException(
                        "One or more students are not part "
                                + "of the session attendance roster."
                );
            }

            validateRecord(record);

            int updatedRows = jdbcTemplate.update(
                    """
                    UPDATE attendance_records
                    SET
                        status = ?,
                        arrival_time = ?,
                        departure_time = ?,
                        note = ?,
                        recorded_by = ?,
                        recorded_at = ?,
                        updated_at = ?,
                        version = version + 1
                    WHERE organization_id = ?
                      AND session_id = ?
                      AND student_id = ?
                    """,
                    record.status().name(),
                    record.arrivalTime(),
                    record.departureTime(),
                    normalizeNullable(record.note()),
                    record.status()
                            == AttendanceStatus.NOT_RECORDED
                            ? null
                            : actor.userId(),
                    record.status()
                            == AttendanceStatus.NOT_RECORDED
                            ? null
                            : now,
                    now,
                    actor.organizationId(),
                    sessionId,
                    record.studentId()
            );

            if (updatedRows == 0) {
                throw new ResourceNotFoundException(
                        "Attendance record was not found."
                );
            }
        }

        auditService.record(
                actor,
                "ATTENDANCE_SAVED",
                "LESSON_SESSION",
                sessionId,
                request.records().size()
                        + " attendance records updated."
        );

        return findAttendance(actor, sessionId);
    }

    @Transactional
    public SessionAttendanceResponse finalizeAttendance(
            AuthenticatedUser actor,
            UUID sessionId
    ) {
        SessionRecord session = findSession(
                actor.organizationId(),
                sessionId,
                true
        );

        validateAttendanceAccess(actor, session);
        validateSessionAcceptsAttendance(session);

        if (session.attendanceFinalizedAt() != null) {
            return findAttendance(actor, sessionId);
        }

        Integer totalCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM attendance_records
                WHERE organization_id = ?
                  AND session_id = ?
                """,
                Integer.class,
                actor.organizationId(),
                sessionId
        );

        if (totalCount == null || totalCount == 0) {
            throw new BusinessRuleException(
                    "Attendance roster is empty. Initialize "
                            + "attendance before finalization."
            );
        }

        Integer notRecordedCount =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM attendance_records
                        WHERE organization_id = ?
                          AND session_id = ?
                          AND status = 'NOT_RECORDED'
                        """,
                        Integer.class,
                        actor.organizationId(),
                        sessionId
                );

        if (notRecordedCount != null
                && notRecordedCount > 0) {
            throw new BusinessRuleException(
                    "Attendance cannot be finalized while "
                            + notRecordedCount
                            + " records remain unrecorded."
            );
        }

        OffsetDateTime finalizedAt =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE lesson_sessions
                SET
                    attendance_finalized_at = ?,
                    attendance_finalized_by = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                  AND attendance_finalized_at IS NULL
                """,
                finalizedAt,
                actor.userId(),
                finalizedAt,
                sessionId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "ATTENDANCE_FINALIZED",
                "LESSON_SESSION",
                sessionId,
                "Session attendance finalized."
        );

        return findAttendance(actor, sessionId);
    }

    private SessionRecord findSession(
            UUID organizationId,
            UUID sessionId,
            boolean lockForUpdate
    ) {
        String sql = """
                SELECT
                    ls.id,
                    ls.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    ls.title,
                    ls.scheduled_start,
                    ls.scheduled_end,
                    ls.status,
                    ls.attendance_finalized_at,
                    ls.attendance_finalized_by

                FROM lesson_sessions ls

                JOIN academy_groups ag
                    ON ag.id = ls.group_id
                   AND ag.organization_id =
                       ls.organization_id

                WHERE ls.id = ?
                  AND ls.organization_id = ?
                """
                + (lockForUpdate ? " FOR UPDATE" : "");

        return jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) ->
                        new SessionRecord(
                                resultSet.getObject(
                                        "id",
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
                                resultSet.getString("status"),
                                resultSet.getObject(
                                        "attendance_finalized_at",
                                        OffsetDateTime.class
                                ),
                                resultSet.getObject(
                                        "attendance_finalized_by",
                                        UUID.class
                                )
                        ),
                sessionId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Session was not found."
                )
        );
    }

    private void validateSessionAcceptsAttendance(
            SessionRecord session
    ) {
        if ("CANCELLED".equals(session.status())) {
            throw new BusinessRuleException(
                    "Attendance cannot be recorded for "
                            + "a cancelled session."
            );
        }

        if ("POSTPONED".equals(session.status())) {
            throw new BusinessRuleException(
                    "Attendance cannot be recorded for "
                            + "a postponed session."
            );
        }
    }

    private void validateAttendanceAccess(
            AuthenticatedUser actor,
            SessionRecord session
    ) {
        if (actor.roles().contains(
                "ORGANIZATION_ADMIN"
        )) {
            return;
        }

        UUID staffId = findCurrentStaffId(actor);

        Integer count = jdbcTemplate.queryForObject(
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
                session.sessionDate(),
                session.sessionDate()
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Session was not found."
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
                (resultSet, rowNumber) ->
                        resultSet.getObject(
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
    }

    private Set<UUID> findRosterStudentIds(
            UUID organizationId,
            UUID sessionId
    ) {
        return new HashSet<>(
                jdbcTemplate.queryForList(
                        """
                        SELECT student_id
                        FROM attendance_records
                        WHERE organization_id = ?
                          AND session_id = ?
                        """,
                        UUID.class,
                        organizationId,
                        sessionId
                )
        );
    }

    private void validateUniqueStudents(
            List<AttendanceRecordRequest> records
    ) {
        Set<UUID> studentIds = new HashSet<>();

        for (AttendanceRecordRequest record
                : records) {
            if (!studentIds.add(record.studentId())) {
                throw new BusinessRuleException(
                        "A student cannot appear more than "
                                + "once in an attendance request."
                );
            }
        }
    }

    private void validateRecord(
            AttendanceRecordRequest record
    ) {
        if (record.departureTime() != null
                && record.arrivalTime() != null
                && record.departureTime()
                .isBefore(record.arrivalTime())) {
            throw new BusinessRuleException(
                    "Departure time cannot be before "
                            + "arrival time."
            );
        }

        if (record.status()
                == AttendanceStatus.LATE
                && record.arrivalTime() == null) {
            throw new BusinessRuleException(
                    "Arrival time is required when "
                            + "attendance status is LATE."
            );
        }

        if (
                (
                        record.status()
                                == AttendanceStatus.ABSENT
                        || record.status()
                                == AttendanceStatus.EXCUSED
                        || record.status()
                                == AttendanceStatus.NOT_RECORDED
                )
                && (
                        record.arrivalTime() != null
                        || record.departureTime() != null
                )
        ) {
            throw new BusinessRuleException(
                    "Absent, excused, or unrecorded students "
                            + "cannot have arrival or departure times."
            );
        }
    }

    private SessionAttendanceResponse createResponse(
            SessionRecord session,
            List<AttendanceRecordResponse> records
    ) {
        int recordedCount = (int) records.stream()
                .filter(record ->
                        record.status()
                                != AttendanceStatus.NOT_RECORDED
                )
                .count();

        int notRecordedCount = countStatus(
                records,
                AttendanceStatus.NOT_RECORDED
        );

        int presentCount = countStatus(
                records,
                AttendanceStatus.PRESENT
        );

        int absentCount = countStatus(
                records,
                AttendanceStatus.ABSENT
        );

        int lateCount = countStatus(
                records,
                AttendanceStatus.LATE
        );

        int excusedCount = countStatus(
                records,
                AttendanceStatus.EXCUSED
        );

        return new SessionAttendanceResponse(
                session.id(),
                session.groupId(),
                session.groupCode(),
                session.groupName(),
                session.title(),
                session.scheduledStart(),
                session.scheduledEnd(),
                session.status(),
                session.attendanceFinalizedAt() != null,
                session.attendanceFinalizedAt(),
                session.attendanceFinalizedBy(),
                records.size(),
                recordedCount,
                notRecordedCount,
                presentCount,
                absentCount,
                lateCount,
                excusedCount,
                records
        );
    }

    private int countStatus(
            List<AttendanceRecordResponse> records,
            AttendanceStatus status
    ) {
        return (int) records.stream()
                .filter(record ->
                        record.status() == status
                )
                .count();
    }

    private AttendanceRecordResponse mapAttendanceRecord(
            ResultSet resultSet
    ) throws SQLException {
        return new AttendanceRecordResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "session_id",
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
                resultSet.getString("note"),
                resultSet.getObject(
                        "recorded_by",
                        UUID.class
                ),
                resultSet.getObject(
                        "recorded_at",
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

    private record SessionRecord(
            UUID id,
            UUID groupId,
            String groupCode,
            String groupName,
            String title,
            OffsetDateTime scheduledStart,
            OffsetDateTime scheduledEnd,
            String status,
            OffsetDateTime attendanceFinalizedAt,
            UUID attendanceFinalizedBy
    ) {
        LocalDate sessionDate() {
            return scheduledStart.toLocalDate();
        }
    }
}
