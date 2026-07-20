package com.academy.platform.scheduling;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

import com.academy.platform.IntegrationTestSupport;
import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.status;

class SchedulingIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanGenerateSessionsIdempotently()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure = createStructure();

        var ruleResult = mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}/schedule-rules",
                                structure.groupId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "curriculumUnitId": "%s",
                                          "leadStaffId": "%s",
                                          "title": "Weekly Training",
                                          "description": null,
                                          "dayOfWeek": 1,
                                          "startTime": "18:00:00",
                                          "endTime": "19:00:00",
                                          "effectiveFrom": "2026-09-01",
                                          "effectiveUntil": "2026-09-30",
                                          "timezone": "Europe/Istanbul",
                                          "location": "Main Field"
                                        }
                                        """.formatted(
                                        structure.unitId(),
                                        structure.staffId()
                                ))
                )
                .andExpect(status().isCreated())
                .andReturn();

        String ruleId = JsonPath.read(
                ruleResult.getResponse()
                        .getContentAsString(),
                "$.id"
        );

        String generationRequest = """
                {
                  "dateFrom": "2026-09-01",
                  "dateTo": "2026-09-30"
                }
                """;

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}"
                                        + "/schedule-rules/{ruleId}"
                                        + "/generate",
                                structure.groupId(),
                                ruleId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(generationRequest)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.generatedSessionCount")
                                .value(4)
                );

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}"
                                        + "/schedule-rules/{ruleId}"
                                        + "/generate",
                                structure.groupId(),
                                ruleId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(generationRequest)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.generatedSessionCount")
                                .value(0)
                )
                .andExpect(
                        jsonPath("$.skippedSessionCount")
                                .value(4)
                );
    }

    @Test
    void invalidSessionTransitionIsRejected()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure = createStructure();

        UUID sessionId = createSession(structure);

        mockMvc.perform(
                        post(
                                "/api/v1/sessions/{sessionId}/status",
                                sessionId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "status": "COMPLETED",
                                          "completionNotes": "Done",
                                          "cancellationReason": null
                                        }
                                        """)
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
    void cancellationRequiresReason()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure = createStructure();

        UUID sessionId = createSession(structure);

        mockMvc.perform(
                        post(
                                "/api/v1/sessions/{sessionId}/status",
                                sessionId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "status": "CANCELLED",
                                          "completionNotes": null,
                                          "cancellationReason": null
                                        }
                                        """)
                )
                .andExpect(
                        status().isUnprocessableEntity()
                );
    }

    private UUID createSession(
            TestStructure structure
    ) {
        UUID sessionId = UUID.randomUUID();

        UUID adminUserId =
                findAdminUserId();

        jdbcTemplate.update(
                """
                INSERT INTO lesson_sessions
                (
                    id,
                    organization_id,
                    group_id,
                    curriculum_assignment_id,
                    curriculum_id,
                    curriculum_unit_id,
                    lead_staff_id,
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
                    ?, ?, ?, ?, ?, ?, ?,
                    'Test session',
                    '2026-09-07T15:00:00Z',
                    '2026-09-07T16:00:00Z',
                    'SCHEDULED',
                    ?,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                sessionId,
                structure.organizationId(),
                structure.groupId(),
                structure.assignmentId(),
                structure.curriculumId(),
                structure.unitId(),
                structure.staffId(),
                adminUserId
        );

        return sessionId;
    }

    private TestStructure createStructure() {
        UUID organizationId =
                findOrganizationId();

        String suffix = suffix();

        UUID programId = UUID.randomUUID();
        UUID termId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID curriculumId = UUID.randomUUID();
        UUID unitId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID staffId = createStaff(organizationId);

        UUID adminUserId = findAdminUserId();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

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
                INSERT INTO curricula
                (
                    id, organization_id, program_id,
                    code, name, version_label, status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, ?, '1.0', 'ACTIVE',
                    ?, ?, 0
                )
                """,
                curriculumId,
                organizationId,
                programId,
                "CUR-" + suffix,
                "Curriculum " + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO curriculum_units
                (
                    id, organization_id, curriculum_id,
                    code, title, sequence_number,
                    estimated_sessions,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, ?, 1, 4, ?, ?, 0
                )
                """,
                unitId,
                organizationId,
                curriculumId,
                "UNIT-" + suffix,
                "Unit " + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO group_curriculum_assignments
                (
                    id, organization_id, group_id,
                    curriculum_id, status, start_date,
                    created_by, created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE',
                    '2026-09-01', ?, ?, ?, 0
                )
                """,
                assignmentId,
                organizationId,
                groupId,
                curriculumId,
                adminUserId,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO group_staff_assignments
                (
                    id, organization_id, group_id,
                    staff_id, assignment_role, status,
                    start_date, created_by,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?,
                    'PRIMARY_INSTRUCTOR', 'ACTIVE',
                    '2026-09-01', ?, ?, ?, 0
                )
                """,
                UUID.randomUUID(),
                organizationId,
                groupId,
                staffId,
                adminUserId,
                now,
                now
        );

        return new TestStructure(
                organizationId,
                groupId,
                curriculumId,
                unitId,
                assignmentId,
                staffId
        );
    }

    private UUID createStaff(UUID organizationId) {
        UUID userId = UUID.randomUUID();
        UUID membershipId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO users
                (
                    id, email, password_hash,
                    first_name, last_name, status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, 'Test', 'Instructor',
                    'ACTIVE', ?, ?, 0
                )
                """,
                userId,
                "staff-" + userId + "@test.com",
                passwordEncoder.encode(
                        "InstructorPassword123!"
                ),
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO organization_memberships
                (
                    id, organization_id, user_id, status,
                    display_first_name, display_last_name,
                    security_version, joined_at,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, 'ACTIVE',
                    'Test', 'Instructor', 0,
                    ?, ?, ?, 0
                )
                """,
                membershipId,
                organizationId,
                userId,
                now,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO staff_members
                (
                    id, organization_id, membership_id,
                    staff_number, employment_status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE', ?, ?, 0
                )
                """,
                staffId,
                organizationId,
                membershipId,
                "STAFF-" + suffix(),
                now,
                now
        );

        return staffId;
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

    private String suffix() {
        return UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);
    }

    private record TestStructure(
            UUID organizationId,
            UUID groupId,
            UUID curriculumId,
            UUID unitId,
            UUID assignmentId,
            UUID staffId
    ) {
    }
}
