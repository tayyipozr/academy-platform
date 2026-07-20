package com.academy.platform.attendance;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.academy.platform.IntegrationTestSupport;

import jakarta.servlet.http.Cookie;

class AttendanceIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanInitializeSaveAndFinalizeAttendance()
            throws Exception {

        Cookie administrator
                = loginAsAdministrator();

        TestStructure structure
                = createStructure();

        mockMvc.perform(
                post(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance/initialize",
                        structure.sessionId()
                )
                        .cookie(administrator)
                        .with(csrf())
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.totalStudentCount")
                                .value(2)
                )
                .andExpect(
                        jsonPath("$.notRecordedCount")
                                .value(2)
                );

        mockMvc.perform(
                put(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance",
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
                                              "note": null
                                            },
                                            {
                                              "studentId": "%s",
                                              "status": "LATE",
                                              "arrivalTime": "18:10:00",
                                              "departureTime": "19:00:00",
                                              "note": "Late arrival"
                                            }
                                          ]
                                        }
                                        """.formatted(
                                structure.firstStudentId(),
                                structure.secondStudentId()
                        ))
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.presentCount")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.lateCount")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.notRecordedCount")
                                .value(0)
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
                );
    }

    @Test
    void attendanceCannotBeFinalizedWithMissingRecords()
            throws Exception {

        Cookie administrator
                = loginAsAdministrator();

        TestStructure structure
                = createStructure();

        mockMvc.perform(
                post(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance/initialize",
                        structure.sessionId()
                )
                        .cookie(administrator)
                        .with(csrf())
        )
                .andExpect(status().isOk());

        mockMvc.perform(
                put(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance",
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
                                              "arrivalTime": null,
                                              "departureTime": null,
                                              "note": null
                                            }
                                          ]
                                        }
                                        """.formatted(
                                structure.firstStudentId()
                        ))
        )
                .andExpect(status().isOk());

        mockMvc.perform(
                post(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance/finalize",
                        structure.sessionId()
                )
                        .cookie(administrator)
                        .with(csrf())
        )
                .andExpect(
                        status().isUnprocessableEntity()
                )
                .andExpect(
                        jsonPath("$.code")
                                .value(
                                        "BUSINESS_RULE_VIOLATION"
                                )
                );
    }

    @Test
    void finalizedAttendanceCannotBeModified()
            throws Exception {

        Cookie administrator
                = loginAsAdministrator();

        TestStructure structure
                = createStructure();

        initializeRecordedAttendance(structure);

        jdbcTemplate.update(
                """
                UPDATE lesson_sessions
                SET
                    attendance_finalized_at =
                        CURRENT_TIMESTAMP,
                    attendance_finalized_by = ?
                WHERE id = ?
                """,
                findAdminUserId(),
                structure.sessionId()
        );

        mockMvc.perform(
                put(
                        "/api/v1/sessions/{sessionId}"
                        + "/attendance",
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
                                              "status": "ABSENT",
                                              "arrivalTime": null,
                                              "departureTime": null,
                                              "note": null
                                            }
                                          ]
                                        }
                                        """.formatted(
                                structure.firstStudentId()
                        ))
        )
                .andExpect(
                        status().isUnprocessableEntity()
                );
    }

    private TestStructure createStructure() {
        UUID organizationId
                = findOrganizationId();

        UUID adminUserId = findAdminUserId();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        UUID programId = UUID.randomUUID();
        UUID termId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO programs
                (
                    id,
                    organization_id,
                    code,
                    name,
                    status,
                    created_at,
                    updated_at,
                    version
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
                    id,
                    organization_id,
                    program_id,
                    term_id,
                    code,
                    name,
                    capacity,
                    status,
                    created_at,
                    updated_at,
                    version
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

        UUID firstStudentId
                = createStudent(
                        organizationId,
                        "A-" + suffix
                );

        UUID secondStudentId
                = createStudent(
                        organizationId,
                        "B-" + suffix
                );

        createEnrollment(
                organizationId,
                groupId,
                firstStudentId,
                adminUserId
        );

        createEnrollment(
                organizationId,
                groupId,
                secondStudentId,
                adminUserId
        );

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
                    created_by,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, 'Attendance Test',
                    '2026-09-07T15:00:00Z',
                    '2026-09-07T16:00:00Z',
                    'SCHEDULED',
                    ?, ?, ?, 0
                )
                """,
                sessionId,
                organizationId,
                groupId,
                adminUserId,
                now,
                now
        );

        return new TestStructure(
                sessionId,
                firstStudentId,
                secondStudentId
        );
    }

    private UUID createStudent(
            UUID organizationId,
            String suffix
    ) {
        UUID studentId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO students
                (
                    id,
                    organization_id,
                    student_number,
                    first_name,
                    last_name,
                    birth_date,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, 'Test', ?,
                    '2014-05-10',
                    'ACTIVE',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                studentId,
                organizationId,
                "STU-" + suffix,
                suffix
        );

        return studentId;
    }

    private void createEnrollment(
            UUID organizationId,
            UUID groupId,
            UUID studentId,
            UUID adminUserId
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO group_enrollments
                (
                    id,
                    organization_id,
                    group_id,
                    student_id,
                    status,
                    enrolled_at,
                    created_by,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE',
                    '2026-09-01',
                    ?,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                UUID.randomUUID(),
                organizationId,
                groupId,
                studentId,
                adminUserId
        );
    }

    private void initializeRecordedAttendance(
            TestStructure structure
    ) {
        UUID organizationId
                = findOrganizationId();

        UUID adminUserId = findAdminUserId();

        for (UUID studentId : List.of(
                structure.firstStudentId(),
                structure.secondStudentId()
        )) {
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
                        ?, ?, ?, ?, 'PRESENT',
                        ?, CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP,
                        0
                    )
                    """,
                    UUID.randomUUID(),
                    organizationId,
                    structure.sessionId(),
                    studentId,
                    adminUserId
            );
        }
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
            UUID firstStudentId,
            UUID secondStudentId
            ) {

    }
}
