package com.academy.platform.reporting;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import com.academy.platform.attendance.AttendanceReportingService;
import com.academy.platform.attendance.StudentAttendanceSummaryResponse;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.evaluation.EvaluationReportingService;
import com.academy.platform.evaluation.StudentDevelopmentSummaryResponse;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentProgressReportService {

    private final JdbcTemplate jdbcTemplate;

    private final AttendanceReportingService
            attendanceReportingService;

    private final EvaluationReportingService
            evaluationReportingService;

    public StudentProgressReportService(
            JdbcTemplate jdbcTemplate,
            AttendanceReportingService
                    attendanceReportingService,
            EvaluationReportingService
                    evaluationReportingService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.attendanceReportingService =
                attendanceReportingService;

        this.evaluationReportingService =
                evaluationReportingService;
    }

    @Transactional(readOnly = true)
    public StudentProgressReportResponse
    generateStudentProgress(
            AuthenticatedUser actor,
            UUID studentId,
            UUID requestedGroupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        validateDateRange(dateFrom, dateTo);

        StudentDevelopmentSummaryResponse development =
                evaluationReportingService
                        .findStudentDevelopment(
                                actor,
                                studentId,
                                requestedGroupId,
                                dateFrom,
                                dateTo
                        );

        UUID effectiveGroupId =
                requestedGroupId != null
                        ? requestedGroupId
                        : development.groupId();

        StudentAttendanceSummaryResponse attendance =
                attendanceReportingService
                        .findStudentAttendance(
                                actor,
                                studentId,
                                dateFrom,
                                dateTo,
                                effectiveGroupId,
                                null
                        );

        CompletedLessonsSummaryResponse lessons =
                findCompletedLessons(
                        actor.organizationId(),
                        studentId,
                        effectiveGroupId,
                        dateFrom,
                        dateTo
                );

        return new StudentProgressReportResponse(
                studentId,
                attendance.studentNumber(),
                attendance.firstName(),
                attendance.lastName(),

                effectiveGroupId,
                development.groupCode(),
                development.groupName(),

                dateFrom,
                dateTo,

                attendance,
                development,
                lessons,

                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }

    private CompletedLessonsSummaryResponse
    findCompletedLessons(
            UUID organizationId,
            UUID studentId,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        LessonCounts counts = jdbcTemplate.query(
                """
                SELECT
                    COUNT(DISTINCT ls.id) FILTER (
                        WHERE ls.status = 'COMPLETED'
                    ) AS completed_sessions,

                    COUNT(DISTINCT ls.id) FILTER (
                        WHERE ls.status = 'COMPLETED'
                          AND ar.status IN (
                              'PRESENT',
                              'LATE'
                          )
                    ) AS attended_sessions,

                    COUNT(DISTINCT ls.id) FILTER (
                        WHERE ls.status = 'COMPLETED'
                          AND ar.status IN (
                              'ABSENT',
                              'EXCUSED'
                          )
                    ) AS missed_sessions,

                    COUNT(DISTINCT ls.id) FILTER (
                        WHERE ls.status = 'COMPLETED'
                          AND ar.id IS NULL
                    ) AS no_attendance_sessions

                FROM group_enrollments ge

                JOIN lesson_sessions ls
                    ON ls.group_id = ge.group_id
                   AND ls.organization_id =
                       ge.organization_id

                LEFT JOIN attendance_records ar
                    ON ar.session_id = ls.id
                   AND ar.student_id = ge.student_id
                   AND ar.organization_id =
                       ge.organization_id

                WHERE ge.organization_id = ?
                  AND ge.student_id = ?
                  AND (
                      ?::UUID IS NULL
                      OR ge.group_id = ?::UUID
                  )

                  AND ge.status <> 'CANCELLED'

                  AND ge.enrolled_at <=
                      ls.scheduled_start::DATE

                  AND (
                      ge.ended_at IS NULL
                      OR ge.ended_at >=
                         ls.scheduled_start::DATE
                  )

                  AND (
                      ?::DATE IS NULL
                      OR ls.scheduled_start::DATE
                         >= ?::DATE
                  )

                  AND (
                      ?::DATE IS NULL
                      OR ls.scheduled_start::DATE
                         <= ?::DATE
                  )
                """,
                (resultSet, rowNumber) ->
                        new LessonCounts(
                                resultSet.getInt(
                                        "completed_sessions"
                                ),
                                resultSet.getInt(
                                        "attended_sessions"
                                ),
                                resultSet.getInt(
                                        "missed_sessions"
                                ),
                                resultSet.getInt(
                                        "no_attendance_sessions"
                                )
                        ),
                organizationId,
                studentId,
                groupId,
                groupId,
                dateFrom,
                dateFrom,
                dateTo,
                dateTo
        ).stream().findFirst().orElse(
                new LessonCounts(0, 0, 0, 0)
        );

        return new CompletedLessonsSummaryResponse(
                counts.completed(),
                counts.attended(),
                counts.missed(),
                counts.noAttendance()
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

    private record LessonCounts(
            int completed,
            int attended,
            int missed,
            int noAttendance
    ) {
    }
}
