package com.academy.platform.attendance;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.academy.platform.IntegrationTestSupport;

import jakarta.servlet.http.Cookie;

class AttendanceCorrectionIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void finalizedAttendanceCanBeCorrectedWithHistory()
            throws Exception {

        Cookie administrator
                = loginAsAdministrator();

        TestStructure structure
                = createFinalizedAttendance();

        mockMvc.perform(
                post(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance/corrections/open",
                        structure.sessionId()
                )
                        .cookie(administrator)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "reason": "Guardian confirmed attendance."
                                        }
                                        """)
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.status")
                                .value("OPEN")
                );

        mockMvc.perform(
                put(
                        "/api/v1/sessions/{sessionId}/attendance",
                        structure.sessionId()
                )
                        .cookie(administrator)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "records": [
                                            {
                                              "studentId": "%s",
                                              "status": "PRESENT",
                                              "arrivalTime": "18:00:00",
                                              "departureTime": "19:00:00",
                                              "note": "Corrected"
                                            }
                                          ]
                                        }
                                        """.formatted(
                                structure.studentId()
                        ))
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.correctionOpen")
                                .value(true)
                );

        mockMvc.perform(
                post(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance/finalize",
                        structure.sessionId()
                )
                        .cookie(administrator)
                        .with(csrf())
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.finalized")
                                .value(true)
                )
                .andExpect(
                        jsonPath("$.correctionOpen")
                                .value(false)
                );

        mockMvc.perform(
                get(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance/corrections",
                        structure.sessionId()
                )
                        .cookie(administrator)
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$[0].status")
                                .value("COMPLETED")
                )
                .andExpect(
                        jsonPath("$[0].changeCount")
                                .value(1)
                )
                .andExpect(
                        jsonPath(
                                "$[0].changes[0].previousStatus"
                        ).value("ABSENT")
                )
                .andExpect(
                        jsonPath(
                                "$[0].changes[0].newStatus"
                        ).value("PRESENT")
                );
    }

    @Test
    void correctionRequiresFinalizedAttendance()
            throws Exception {

        Cookie administrator
                = loginAsAdministrator();

        TestStructure structure
                = createFinalizedAttendance();

        jdbcTemplate.update(
                """
                UPDATE lesson_sessions
                SET
                    attendance_finalized_at = NULL,
                    attendance_finalized_by = NULL
                WHERE id = ?
                """,
                structure.sessionId()
        );

        mockMvc.perform(
                post(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance/corrections/open",
                        structure.sessionId()
                )
                        .cookie(administrator)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "reason": "Invalid request"
                                        }
                                        """)
        )
                .andExpect(
                        status().isUnprocessableEntity()
                );
    }

    @Test
    void correctionReasonIsRequired()
            throws Exception {

        Cookie administrator
                = loginAsAdministrator();

        TestStructure structure
                = createFinalizedAttendance();

        mockMvc.perform(
                post(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance/corrections/open",
                        structure.sessionId()
                )
                        .cookie(administrator)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "reason": ""
                                        }
                                        """)
        )
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.code")
                                .value("VALIDATION_ERROR")
                );
    }

    private TestStructure createFinalizedAttendance() {
        UUID organizationId
                = findOrganizationId();

        UUID adminUserId
                = findAdminUserId();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        UUID programId = UUID.randomUUID();
        UUID termId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID attendanceId = UUID.randomUUID();

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
                    '2026-09-01', '2027-06-30',
                    'ACTIVE', ?, ?, 0
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
                    ?, ?, ?, 'Test', 'Student',
                    'ACTIVE',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                studentId,
                organizationId,
                "STU-" + suffix
        );

        jdbcTemplate.update(
                """
                INSERT INTO lesson_sessions
                (
                    id, organization_id, group_id, title,
                    scheduled_start, scheduled_end, status,
                    attendance_finalized_at,
                    attendance_finalized_by,
                    created_by,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, 'Correction Test',
                    '2026-09-07T15:00:00Z',
                    '2026-09-07T16:00:00Z',
                    'COMPLETED',
                    ?, ?, ?, ?, ?, 0
                )
                """,
                sessionId,
                organizationId,
                groupId,
                now,
                adminUserId,
                adminUserId,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO attendance_records
                (
                    id, organization_id, session_id,
                    student_id, status, recorded_by,
                    recorded_at, created_at,
                    updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, 'ABSENT', ?,
                    ?, ?, ?, 0
                )
                """,
                attendanceId,
                organizationId,
                sessionId,
                studentId,
                adminUserId,
                now,
                now,
                now
        );

        return new TestStructure(
                sessionId,
                studentId
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
            UUID sessionId,
            UUID studentId
            ) {

    }
}
