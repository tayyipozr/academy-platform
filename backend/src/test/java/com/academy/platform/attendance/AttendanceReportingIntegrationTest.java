package com.academy.platform.attendance;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

import com.academy.platform.IntegrationTestSupport;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.status;

class AttendanceReportingIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void studentSummaryUsesOnlyFinalizedAttendance()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createAttendanceStructure();

        mockMvc.perform(
                        get(
                                "/api/v1/students/{studentId}"
                                        + "/attendance-history",
                                structure.studentId()
                        )
                                .cookie(administrator)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath(
                                "$.totalFinalizedSessions"
                        ).value(3)
                )
                .andExpect(
                        jsonPath("$.presentCount")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.lateCount")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.absentCount")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.excusedCount")
                                .value(0)
                )
                .andExpect(
                        jsonPath(
                                "$.attendancePercentage"
                        ).value(66.67)
                );
    }

    @Test
    void excusedAttendanceIsExcludedFromPercentage()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createAttendanceStructure();

        createFinalizedAttendance(
                structure,
                "EXCUSED",
                "2026-10-05T15:00:00Z"
        );

        mockMvc.perform(
                        get(
                                "/api/v1/students/{studentId}"
                                        + "/attendance-history",
                                structure.studentId()
                        )
                                .cookie(administrator)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath(
                                "$.totalFinalizedSessions"
                        ).value(4)
                )
                .andExpect(
                        jsonPath("$.excusedCount")
                                .value(1)
                )
                .andExpect(
                        jsonPath(
                                "$.percentageDenominator"
                        ).value(3)
                )
                .andExpect(
                        jsonPath(
                                "$.attendancePercentage"
                        ).value(66.67)
                );
    }

    @Test
    void groupSummaryContainsPerStudentTotals()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createAttendanceStructure();

        mockMvc.perform(
                        get(
                                "/api/v1/groups/{groupId}"
                                        + "/attendance-summary",
                                structure.groupId()
                        )
                                .cookie(administrator)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath(
                                "$.finalizedSessionCount"
                        ).value(3)
                )
                .andExpect(
                        jsonPath(
                                "$.students[0].studentId"
                        ).value(
                                structure.studentId()
                                        .toString()
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.students[0]"
                                        + ".attendancePercentage"
                        ).value(66.67)
                );
    }

    private TestStructure
    createAttendanceStructure() {
        UUID organizationId =
                findOrganizationId();

        UUID adminUserId =
                findAdminUserId();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        UUID programId = UUID.randomUUID();
        UUID termId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO programs
                (
                    id, organization_id, code, name,
                    status, created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE', ?, ?, 0
                )
                """,
                programId,
                organizationId,
                "PRG-" + suffix,
                "Program " + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO operational_terms
                (
                    id, organization_id, code, name,
                    start_date, end_date, status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?,
                    '2026-09-01',
                    '2027-06-30',
                    'ACTIVE',
                    ?, ?, 0
                )
                """,
                termId,
                organizationId,
                "TERM-" + suffix,
                "Term " + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO academy_groups
                (
                    id, organization_id, program_id,
                    term_id, code, name, capacity,
                    status, created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, 20,
                    'ACTIVE', ?, ?, 0
                )
                """,
                groupId,
                organizationId,
                programId,
                termId,
                "GRP-" + suffix,
                "Group " + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO students
                (
                    id, organization_id, student_number,
                    first_name, last_name, status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, 'Report', 'Student',
                    'ACTIVE', ?, ?, 0
                )
                """,
                studentId,
                organizationId,
                "STU-" + suffix,
                now,
                now
        );

        TestStructure structure =
                new TestStructure(
                        organizationId,
                        groupId,
                        studentId,
                        adminUserId
                );

        createFinalizedAttendance(
                structure,
                "PRESENT",
                "2026-09-07T15:00:00Z"
        );

        createFinalizedAttendance(
                structure,
                "LATE",
                "2026-09-14T15:00:00Z"
        );

        createFinalizedAttendance(
                structure,
                "ABSENT",
                "2026-09-21T15:00:00Z"
        );

        createUnfinalizedAttendance(
                structure,
                "ABSENT",
                "2026-09-28T15:00:00Z"
        );

        return structure;
    }

    private void createFinalizedAttendance(
            TestStructure structure,
            String attendanceStatus,
            String startTime
    ) {
        createAttendance(
                structure,
                attendanceStatus,
                startTime,
                true
        );
    }

    private void createUnfinalizedAttendance(
            TestStructure structure,
            String attendanceStatus,
            String startTime
    ) {
        createAttendance(
                structure,
                attendanceStatus,
                startTime,
                false
        );
    }

    private void createAttendance(
            TestStructure structure,
            String attendanceStatus,
            String startTime,
            boolean finalized
    ) {
        UUID sessionId = UUID.randomUUID();

        OffsetDateTime start =
                OffsetDateTime.parse(startTime);

        OffsetDateTime end =
                start.plusHours(1);

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO lesson_sessions
                (
                    id,
                    organization_id,
                    group_id,
                    title,
                    scheduled_start,
                    scheduled_end,
                    status,
                    attendance_finalized_at,
                    attendance_finalized_by,
                    created_by,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, 'Report Session',
                    ?, ?, 'COMPLETED',
                    ?, ?, ?, ?, ?, 0
                )
                """,
                sessionId,
                structure.organizationId(),
                structure.groupId(),
                start,
                end,
                finalized ? now : null,
                finalized
                        ? structure.adminUserId()
                        : null,
                structure.adminUserId(),
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO attendance_records
                (
                    id,
                    organization_id,
                    session_id,
                    student_id,
                    status,
                    recorded_by,
                    recorded_at,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, 0
                )
                """,
                UUID.randomUUID(),
                structure.organizationId(),
                sessionId,
                structure.studentId(),
                attendanceStatus,
                structure.adminUserId(),
                now,
                now,
                now
        );
    }

    private UUID findOrganizationId() {
        return jdbcTemplate.queryForObject(
                """
                SELECT id
                FROM organizations
                WHERE slug = 'test-academy'
                """,
                UUID.class
        );
    }

    private UUID findAdminUserId() {
        return jdbcTemplate.queryForObject(
                """
                SELECT id
                FROM users
                WHERE LOWER(email) =
                    LOWER('admin@test.com')
                """,
                UUID.class
        );
    }

    private record TestStructure(
            UUID organizationId,
            UUID groupId,
            UUID studentId,
            UUID adminUserId
    ) {
    }
}
