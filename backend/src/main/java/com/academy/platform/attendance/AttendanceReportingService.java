package com.academy.platform.attendance;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ResourceNotFoundException;

@Service
public class AttendanceReportingService {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public AttendanceReportingService(
            NamedParameterJdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public StudentAttendanceSummaryResponse
            findStudentAttendance(
                    AuthenticatedUser actor,
                    UUID studentId,
                    LocalDate dateFrom,
                    LocalDate dateTo,
                    UUID groupId,
                    UUID termId
            ) {
        StudentRecord student = findStudent(
                actor.organizationId(),
                studentId
        );

        validateStudentAccess(
                actor,
                studentId
        );

        validateDateRange(dateFrom, dateTo);

        List<StudentAttendanceItemResponse> records
                = findStudentAttendanceRecords(
                        actor.organizationId(),
                        studentId,
                        dateFrom,
                        dateTo,
                        groupId,
                        termId
                );

        AttendanceTotals totals
                = calculateTotals(records);

        return new StudentAttendanceSummaryResponse(
                student.id(),
                student.studentNumber(),
                student.firstName(),
                student.lastName(),
                dateFrom,
                dateTo,
                groupId,
                termId,
                totals.total(),
                totals.present(),
                totals.late(),
                totals.absent(),
                totals.excused(),
                totals.attended(),
                totals.denominator(),
                totals.percentage(),
                records
        );
    }

    @Transactional(readOnly = true)
    public GroupAttendanceSummaryResponse
            findGroupAttendance(
                    AuthenticatedUser actor,
                    UUID groupId,
                    LocalDate dateFrom,
                    LocalDate dateTo
            ) {
        validateDateRange(dateFrom, dateTo);

        GroupRecord group = findGroup(
                actor.organizationId(),
                groupId
        );

        validateGroupAccess(
                actor,
                groupId,
                dateFrom,
                dateTo
        );

        List<GroupAttendanceRecord> records
                = findGroupAttendanceRecords(
                        actor.organizationId(),
                        groupId,
                        dateFrom,
                        dateTo
                );

        Map<UUID, MutableStudentSummary> summaries = new LinkedHashMap<>();

        for (GroupAttendanceRecord record : records) {
            MutableStudentSummary summary
                    = summaries.computeIfAbsent(
                            record.studentId(),
                            ignored
                            -> new MutableStudentSummary(
                                    record.studentId(),
                                    record.studentNumber(),
                                    record.firstName(),
                                    record.lastName()
                            )
                    );

            summary.add(record.status());
        }

        List<GroupStudentAttendanceSummaryResponse> studentSummaries
                = summaries.values()
                        .stream()
                        .map(
                                MutableStudentSummary::toResponse
                        )
                        .toList();

        AttendanceTotals totals
                = calculateGroupTotals(records);

        int finalizedSessionCount
                = countFinalizedSessions(
                        actor.organizationId(),
                        groupId,
                        dateFrom,
                        dateTo
                );

        return new GroupAttendanceSummaryResponse(
                group.id(),
                group.code(),
                group.name(),
                group.programId(),
                group.programName(),
                group.termId(),
                group.termCode(),
                group.termName(),
                dateFrom,
                dateTo,
                finalizedSessionCount,
                records.size(),
                totals.present(),
                totals.late(),
                totals.absent(),
                totals.excused(),
                totals.attended(),
                totals.denominator(),
                totals.percentage(),
                studentSummaries
        );
    }

    private List<StudentAttendanceItemResponse>
            findStudentAttendanceRecords(
                    UUID organizationId,
                    UUID studentId,
                    LocalDate dateFrom,
                    LocalDate dateTo,
                    UUID groupId,
                    UUID termId
            ) {
        StringBuilder sql = new StringBuilder(
                """
                SELECT
                    ar.id AS attendance_record_id,
                    ar.session_id,
                    ls.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    ag.term_id,
                    ot.code AS term_code,
                    ot.name AS term_name,
                    ls.title AS session_title,

                    (
                        ls.scheduled_start
                        AT TIME ZONE o.timezone
                    )::DATE AS session_date,

                    ls.scheduled_start,
                    ls.scheduled_end,
                    ar.status,
                    ar.arrival_time,
                    ar.departure_time,
                    ar.note,
                    ar.recorded_at,
                    ls.attendance_finalized_at

                FROM attendance_records ar

                JOIN lesson_sessions ls
                    ON ls.id = ar.session_id
                   AND ls.organization_id =
                       ar.organization_id

                JOIN academy_groups ag
                    ON ag.id = ls.group_id
                   AND ag.organization_id =
                       ls.organization_id

                JOIN operational_terms ot
                    ON ot.id = ag.term_id
                   AND ot.organization_id =
                       ag.organization_id

                JOIN organizations o
                    ON o.id = ar.organization_id

                WHERE ar.organization_id =
                      :organizationId

                  AND ar.student_id = :studentId

                  AND ls.attendance_finalized_at
                      IS NOT NULL

                  AND ar.status <> 'NOT_RECORDED'
                """
        );

        MapSqlParameterSource parameters
                = new MapSqlParameterSource()
                        .addValue(
                                "organizationId",
                                organizationId
                        )
                        .addValue(
                                "studentId",
                                studentId
                        );

        if (dateFrom != null) {
            sql.append(
                    """
                    AND (
                        ls.scheduled_start
                        AT TIME ZONE o.timezone
                    )::DATE >= :dateFrom
                    """
            );

            parameters.addValue(
                    "dateFrom",
                    dateFrom
            );
        }

        if (dateTo != null) {
            sql.append(
                    """
                    AND (
                        ls.scheduled_start
                        AT TIME ZONE o.timezone
                    )::DATE <= :dateTo
                    """
            );

            parameters.addValue(
                    "dateTo",
                    dateTo
            );
        }

        if (groupId != null) {
            sql.append(
                    """
                    AND ls.group_id = :groupId
                    """
            );

            parameters.addValue(
                    "groupId",
                    groupId
            );
        }

        if (termId != null) {
            sql.append(
                    """
                    AND ag.term_id = :termId
                    """
            );

            parameters.addValue(
                    "termId",
                    termId
            );
        }

        sql.append(
                """
                ORDER BY
                    ls.scheduled_start DESC,
                    ag.name
                """
        );

        return jdbcTemplate.query(
                sql.toString(),
                parameters,
                (resultSet, rowNumber)
                -> mapStudentAttendanceItem(
                        resultSet
                )
        );
    }

    private List<GroupAttendanceRecord>
            findGroupAttendanceRecords(
                    UUID organizationId,
                    UUID groupId,
                    LocalDate dateFrom,
                    LocalDate dateTo
            ) {
        StringBuilder sql = new StringBuilder(
                """
                SELECT
                    ar.student_id,
                    s.student_number,
                    s.first_name,
                    s.last_name,
                    ar.status

                FROM attendance_records ar

                JOIN lesson_sessions ls
                    ON ls.id = ar.session_id
                   AND ls.organization_id =
                       ar.organization_id

                JOIN students s
                    ON s.id = ar.student_id
                   AND s.organization_id =
                       ar.organization_id

                JOIN organizations o
                    ON o.id = ar.organization_id

                WHERE ar.organization_id =
                      :organizationId

                  AND ls.group_id = :groupId

                  AND ls.attendance_finalized_at
                      IS NOT NULL

                  AND ar.status <> 'NOT_RECORDED'
                """
        );

        MapSqlParameterSource parameters
                = new MapSqlParameterSource()
                        .addValue(
                                "organizationId",
                                organizationId
                        )
                        .addValue(
                                "groupId",
                                groupId
                        );

        appendDateFilters(
                sql,
                parameters,
                dateFrom,
                dateTo
        );

        sql.append(
                """
                ORDER BY
                    s.first_name,
                    s.last_name,
                    ls.scheduled_start
                """
        );

        return jdbcTemplate.query(
                sql.toString(),
                parameters,
                (resultSet, rowNumber)
                -> new GroupAttendanceRecord(
                        resultSet.getObject(
                                "student_id",
                                UUID.class
                        ),
                        resultSet.getString(
                                "student_number"
                        ),
                        resultSet.getString(
                                "first_name"
                        ),
                        resultSet.getString(
                                "last_name"
                        ),
                        AttendanceStatus.valueOf(
                                resultSet.getString(
                                        "status"
                                )
                        )
                )
        );
    }

    private int countFinalizedSessions(
            UUID organizationId,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        StringBuilder sql = new StringBuilder(
                """
                SELECT COUNT(*)

                FROM lesson_sessions ls

                JOIN organizations o
                    ON o.id = ls.organization_id

                WHERE ls.organization_id =
                      :organizationId

                  AND ls.group_id = :groupId

                  AND ls.attendance_finalized_at
                      IS NOT NULL
                """
        );

        MapSqlParameterSource parameters
                = new MapSqlParameterSource()
                        .addValue(
                                "organizationId",
                                organizationId
                        )
                        .addValue(
                                "groupId",
                                groupId
                        );

        appendDateFilters(
                sql,
                parameters,
                dateFrom,
                dateTo
        );

        Integer count = jdbcTemplate.queryForObject(
                sql.toString(),
                parameters,
                Integer.class
        );

        return count == null ? 0 : count;
    }

    private void appendDateFilters(
            StringBuilder sql,
            MapSqlParameterSource parameters,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        if (dateFrom != null) {
            sql.append(
                    """
                    AND (
                        ls.scheduled_start
                        AT TIME ZONE o.timezone
                    )::DATE >= :dateFrom
                    """
            );

            parameters.addValue(
                    "dateFrom",
                    dateFrom
            );
        }

        if (dateTo != null) {
            sql.append(
                    """
                    AND (
                        ls.scheduled_start
                        AT TIME ZONE o.timezone
                    )::DATE <= :dateTo
                    """
            );

            parameters.addValue(
                    "dateTo",
                    dateTo
            );
        }
    }

    private StudentRecord findStudent(
            UUID organizationId,
            UUID studentId
    ) {
        MapSqlParameterSource parameters
                = new MapSqlParameterSource()
                        .addValue(
                                "organizationId",
                                organizationId
                        )
                        .addValue(
                                "studentId",
                                studentId
                        );

        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    student_number,
                    first_name,
                    last_name
                FROM students
                WHERE id = :studentId
                  AND organization_id =
                      :organizationId
                  AND status <> 'ARCHIVED'
                """,
                parameters,
                (resultSet, rowNumber)
                -> new StudentRecord(
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getString(
                                "student_number"
                        ),
                        resultSet.getString(
                                "first_name"
                        ),
                        resultSet.getString(
                                "last_name"
                        )
                )
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Student was not found."
                )
        );
    }

    private GroupRecord findGroup(
            UUID organizationId,
            UUID groupId
    ) {
        MapSqlParameterSource parameters
                = new MapSqlParameterSource()
                        .addValue(
                                "organizationId",
                                organizationId
                        )
                        .addValue(
                                "groupId",
                                groupId
                        );

        return jdbcTemplate.query(
                """
                SELECT
                    ag.id,
                    ag.code,
                    ag.name,
                    ag.program_id,
                    p.name AS program_name,
                    ag.term_id,
                    ot.code AS term_code,
                    ot.name AS term_name

                FROM academy_groups ag

                JOIN programs p
                    ON p.id = ag.program_id
                   AND p.organization_id =
                       ag.organization_id

                JOIN operational_terms ot
                    ON ot.id = ag.term_id
                   AND ot.organization_id =
                       ag.organization_id

                WHERE ag.id = :groupId
                  AND ag.organization_id =
                      :organizationId
                """,
                parameters,
                (resultSet, rowNumber)
                -> new GroupRecord(
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getString("code"),
                        resultSet.getString("name"),
                        resultSet.getObject(
                                "program_id",
                                UUID.class
                        ),
                        resultSet.getString(
                                "program_name"
                        ),
                        resultSet.getObject(
                                "term_id",
                                UUID.class
                        ),
                        resultSet.getString(
                                "term_code"
                        ),
                        resultSet.getString(
                                "term_name"
                        )
                )
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Group was not found."
                )
        );
    }

    private void validateStudentAccess(
            AuthenticatedUser actor,
            UUID studentId
    ) {
        if (isOrganizationAdministrator(actor)) {
            return;
        }

        if (actor.hasPermission(
                "guardian.linked-students.read"
        )) {
            validateGuardianStudentAccess(
                    actor,
                    studentId
            );

            return;
        }

        if (actor.hasPermission("attendance.read")) {
            validateInstructorStudentAccess(
                    actor,
                    studentId
            );

            return;
        }

        throw new ResourceNotFoundException(
                "Student was not found."
        );
    }

    private void validateGuardianStudentAccess(
            AuthenticatedUser actor,
            UUID studentId
    ) {
        MapSqlParameterSource parameters
                = new MapSqlParameterSource()
                        .addValue(
                                "organizationId",
                                actor.organizationId()
                        )
                        .addValue(
                                "membershipId",
                                actor.membershipId()
                        )
                        .addValue(
                                "studentId",
                                studentId
                        );

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)

                FROM guardians g

                JOIN student_guardians sg
                    ON sg.guardian_id = g.id
                   AND sg.organization_id =
                       g.organization_id

                WHERE g.organization_id =
                      :organizationId

                  AND g.membership_id =
                      :membershipId

                  AND g.status = 'ACTIVE'

                  AND sg.student_id = :studentId
                """,
                parameters,
                Integer.class
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Student was not found."
            );
        }
    }

    private void validateInstructorStudentAccess(
            AuthenticatedUser actor,
            UUID studentId
    ) {
        UUID staffId = findCurrentStaffId(actor);

        MapSqlParameterSource parameters
                = new MapSqlParameterSource()
                        .addValue(
                                "organizationId",
                                actor.organizationId()
                        )
                        .addValue(
                                "studentId",
                                studentId
                        )
                        .addValue(
                                "staffId",
                                staffId
                        );

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(DISTINCT ge.group_id)

                FROM group_enrollments ge

                JOIN group_staff_assignments gsa
                    ON gsa.group_id = ge.group_id
                   AND gsa.organization_id =
                       ge.organization_id

                WHERE ge.organization_id =
                      :organizationId

                  AND ge.student_id = :studentId

                  AND gsa.staff_id = :staffId

                  AND ge.status <> 'CANCELLED'

                  AND gsa.status <> 'CANCELLED'

                  AND gsa.start_date <=
                      COALESCE(
                          ge.ended_at,
                          CURRENT_DATE
                      )

                  AND (
                      gsa.end_date IS NULL
                      OR gsa.end_date >=
                         ge.enrolled_at
                  )
                """,
                parameters,
                Integer.class
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Student was not found."
            );
        }
    }

    private void validateGroupAccess(
            AuthenticatedUser actor,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        if (isOrganizationAdministrator(actor)) {
            return;
        }

        UUID staffId = findCurrentStaffId(actor);

        StringBuilder sql = new StringBuilder(
                """
                SELECT COUNT(*)
                FROM group_staff_assignments
                WHERE organization_id =
                      :organizationId
                  AND group_id = :groupId
                  AND staff_id = :staffId
                  AND status <> 'CANCELLED'
                """
        );

        MapSqlParameterSource parameters
                = new MapSqlParameterSource()
                        .addValue(
                                "organizationId",
                                actor.organizationId()
                        )
                        .addValue(
                                "groupId",
                                groupId
                        )
                        .addValue(
                                "staffId",
                                staffId
                        );

        if (dateTo != null) {
            sql.append(
                    """
                    AND start_date <= :dateTo
                    """
            );

            parameters.addValue(
                    "dateTo",
                    dateTo
            );
        }

        if (dateFrom != null) {
            sql.append(
                    """
                    AND (
                        end_date IS NULL
                        OR end_date >= :dateFrom
                    )
                    """
            );

            parameters.addValue(
                    "dateFrom",
                    dateFrom
            );
        }

        Integer count = jdbcTemplate.queryForObject(
                sql.toString(),
                parameters,
                Integer.class
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Group was not found."
            );
        }
    }

    private UUID findCurrentStaffId(
            AuthenticatedUser actor
    ) {
        MapSqlParameterSource parameters
                = new MapSqlParameterSource()
                        .addValue(
                                "organizationId",
                                actor.organizationId()
                        )
                        .addValue(
                                "membershipId",
                                actor.membershipId()
                        );

        return jdbcTemplate.query(
                """
                SELECT id
                FROM staff_members
                WHERE organization_id =
                      :organizationId
                  AND membership_id =
                      :membershipId
                  AND employment_status = 'ACTIVE'
                """,
                parameters,
                (resultSet, rowNumber)
                -> resultSet.getObject(
                        "id",
                        UUID.class
                )
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Attendance report was not found."
                )
        );
    }

    private boolean isOrganizationAdministrator(
            AuthenticatedUser actor
    ) {
        return actor.roles().contains(
                "ORGANIZATION_ADMIN"
        );
    }

    private void validateDateRange(
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        if (dateFrom != null
                && dateTo != null
                && dateTo.isBefore(dateFrom)) {
            throw new BusinessRuleException(
                    "Date to cannot be before date from."
            );
        }
    }

    private AttendanceTotals calculateTotals(
            List<StudentAttendanceItemResponse> records
    ) {
        int present = countStatus(
                records,
                AttendanceStatus.PRESENT
        );

        int late = countStatus(
                records,
                AttendanceStatus.LATE
        );

        int absent = countStatus(
                records,
                AttendanceStatus.ABSENT
        );

        int excused = countStatus(
                records,
                AttendanceStatus.EXCUSED
        );

        return createTotals(
                records.size(),
                present,
                late,
                absent,
                excused
        );
    }

    private AttendanceTotals calculateGroupTotals(
            List<GroupAttendanceRecord> records
    ) {
        int present = (int) records.stream()
                .filter(record
                        -> record.status()
                == AttendanceStatus.PRESENT
                )
                .count();

        int late = (int) records.stream()
                .filter(record
                        -> record.status()
                == AttendanceStatus.LATE
                )
                .count();

        int absent = (int) records.stream()
                .filter(record
                        -> record.status()
                == AttendanceStatus.ABSENT
                )
                .count();

        int excused = (int) records.stream()
                .filter(record
                        -> record.status()
                == AttendanceStatus.EXCUSED
                )
                .count();

        return createTotals(
                records.size(),
                present,
                late,
                absent,
                excused
        );
    }

    private AttendanceTotals createTotals(
            int total,
            int present,
            int late,
            int absent,
            int excused
    ) {
        int attended = present + late;

        int denominator
                = present + late + absent;

        double percentage
                = denominator == 0
                        ? 0.0
                        : Math.round(
                                ((double) attended
                                / denominator) * 10000.0
                        ) / 100.0;

        return new AttendanceTotals(
                total,
                present,
                late,
                absent,
                excused,
                attended,
                denominator,
                percentage
        );
    }

    private int countStatus(
            List<StudentAttendanceItemResponse> records,
            AttendanceStatus status
    ) {
        return (int) records.stream()
                .filter(record
                        -> record.status() == status
                )
                .count();
    }

    private StudentAttendanceItemResponse
            mapStudentAttendanceItem(
                    ResultSet resultSet
            ) throws SQLException {
        return new StudentAttendanceItemResponse(
                resultSet.getObject(
                        "attendance_record_id",
                        UUID.class
                ),
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
                resultSet.getObject(
                        "term_id",
                        UUID.class
                ),
                resultSet.getString(
                        "term_code"
                ),
                resultSet.getString(
                        "term_name"
                ),
                resultSet.getString(
                        "session_title"
                ),
                resultSet.getObject(
                        "session_date",
                        LocalDate.class
                ),
                resultSet.getObject(
                        "scheduled_start",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "scheduled_end",
                        OffsetDateTime.class
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
                resultSet.getString("note"),
                resultSet.getObject(
                        "recorded_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "attendance_finalized_at",
                        OffsetDateTime.class
                )
        );
    }

    private record StudentRecord(
            UUID id,
            String studentNumber,
            String firstName,
            String lastName
            ) {

    }

    private record GroupRecord(
            UUID id,
            String code,
            String name,
            UUID programId,
            String programName,
            UUID termId,
            String termCode,
            String termName
            ) {

    }

    private record GroupAttendanceRecord(
            UUID studentId,
            String studentNumber,
            String firstName,
            String lastName,
            AttendanceStatus status
            ) {

    }

    private record AttendanceTotals(
            int total,
            int present,
            int late,
            int absent,
            int excused,
            int attended,
            int denominator,
            double percentage
            ) {

    }

    private static final class MutableStudentSummary {

        private final UUID studentId;
        private final String studentNumber;
        private final String firstName;
        private final String lastName;

        private int present;
        private int late;
        private int absent;
        private int excused;

        private MutableStudentSummary(
                UUID studentId,
                String studentNumber,
                String firstName,
                String lastName
        ) {
            this.studentId = studentId;
            this.studentNumber = studentNumber;
            this.firstName = firstName;
            this.lastName = lastName;
        }

        private void add(AttendanceStatus status) {
            switch (status) {
                case PRESENT ->
                    present++;
                case LATE ->
                    late++;
                case ABSENT ->
                    absent++;
                case EXCUSED ->
                    excused++;
                case NOT_RECORDED -> {
                    // Finalized reports exclude this status.
                }
            }
        }

        private GroupStudentAttendanceSummaryResponse
                toResponse() {
            int attended = present + late;
            int denominator
                    = present + late + absent;

            double percentage
                    = denominator == 0
                            ? 0.0
                            : Math.round(
                                    ((double) attended
                                    / denominator) * 10000.0
                            ) / 100.0;

            return new GroupStudentAttendanceSummaryResponse(
                    studentId,
                    studentNumber,
                    firstName,
                    lastName,
                    present + late + absent + excused,
                    present,
                    late,
                    absent,
                    excused,
                    attended,
                    denominator,
                    percentage
            );
        }
    }
}
