package com.academy.platform.curriculumassignment;

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
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.status;

class GroupCurriculumAssignmentIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanAssignCurriculumAndUpdateProgress()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure = createStructure();

        var result = mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}"
                                        + "/curriculum-assignments",
                                structure.groupId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "curriculumId": "%s",
                                          "startDate": "2026-09-01"
                                        }
                                        """.formatted(
                                        structure.curriculumId()
                                ))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.totalUnitCount")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.completionPercentage")
                                .value(0.0)
                )
                .andReturn();

        String assignmentId = JsonPath.read(
                result.getResponse()
                        .getContentAsString(),
                "$.assignment.id"
        );

        mockMvc.perform(
                        put(
                                "/api/v1/groups/{groupId}"
                                        + "/curriculum-assignments/"
                                        + "{assignmentId}/units/"
                                        + "{unitId}/progress",
                                structure.groupId(),
                                assignmentId,
                                structure.unitId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "status": "COMPLETED",
                                          "completedSessions": 4
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.status")
                                .value("COMPLETED")
                );

        mockMvc.perform(
                        get(
                                "/api/v1/groups/{groupId}"
                                        + "/curriculum-assignments/"
                                        + "active/progress",
                                structure.groupId()
                        )
                                .cookie(administrator)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.completedUnitCount")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.completionPercentage")
                                .value(100.0)
                );
    }

    @Test
    void curriculumProgramMustMatchGroupProgram()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure = createStructure();

        UUID differentProgramId = createProgram(
                structure.organizationId()
        );

        UUID differentCurriculumId =
                createActiveCurriculum(
                        structure.organizationId(),
                        differentProgramId
                );

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}"
                                        + "/curriculum-assignments",
                                structure.groupId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "curriculumId": "%s",
                                          "startDate": "2026-09-01"
                                        }
                                        """.formatted(
                                        differentCurriculumId
                                ))
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
    void secondActiveAssignmentIsRejected()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure = createStructure();

        assignDirectly(structure);

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}"
                                        + "/curriculum-assignments",
                                structure.groupId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "curriculumId": "%s",
                                          "startDate": "2026-09-01"
                                        }
                                        """.formatted(
                                        structure.curriculumId()
                                ))
                )
                .andExpect(status().isConflict())
                .andExpect(
                        jsonPath("$.code")
                                .value("RESOURCE_CONFLICT")
                );
    }

    private TestStructure createStructure() {
        UUID organizationId =
                findTestOrganizationId();

        UUID programId =
                createProgram(organizationId);

        UUID curriculumId =
                createActiveCurriculum(
                        organizationId,
                        programId
                );

        UUID unitId = createUnit(
                organizationId,
                curriculumId
        );

        UUID termId = createTerm(organizationId);
        UUID groupId = createGroup(
                organizationId,
                programId,
                termId
        );

        return new TestStructure(
                organizationId,
                groupId,
                curriculumId,
                unitId
        );
    }

    private UUID createProgram(UUID organizationId) {
        UUID id = UUID.randomUUID();
        String suffix = suffix();
        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

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
                id,
                organizationId,
                "PROGRAM-" + suffix,
                "Program " + suffix,
                now,
                now
        );

        return id;
    }

    private UUID createActiveCurriculum(
            UUID organizationId,
            UUID programId
    ) {
        UUID id = UUID.randomUUID();
        String suffix = suffix();
        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO curricula
                (
                    id,
                    organization_id,
                    program_id,
                    code,
                    name,
                    version_label,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, ?, '1.0',
                    'ACTIVE', ?, ?, 0
                )
                """,
                id,
                organizationId,
                programId,
                "CUR-" + suffix,
                "Curriculum " + suffix,
                now,
                now
        );

        return id;
    }

    private UUID createUnit(
            UUID organizationId,
            UUID curriculumId
    ) {
        UUID id = UUID.randomUUID();
        String suffix = suffix();

        jdbcTemplate.update(
                """
                INSERT INTO curriculum_units
                (
                    id,
                    organization_id,
                    curriculum_id,
                    code,
                    title,
                    sequence_number,
                    estimated_sessions,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, ?, 1, 4,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                id,
                organizationId,
                curriculumId,
                "UNIT-" + suffix,
                "Unit " + suffix
        );

        return id;
    }

    private UUID createTerm(UUID organizationId) {
        UUID id = UUID.randomUUID();
        String suffix = suffix();

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
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                id,
                organizationId,
                "TERM-" + suffix,
                "Term " + suffix
        );

        return id;
    }

    private UUID createGroup(
            UUID organizationId,
            UUID programId,
            UUID termId
    ) {
        UUID id = UUID.randomUUID();
        String suffix = suffix();

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
                    'ACTIVE',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                id,
                organizationId,
                programId,
                termId,
                "GROUP-" + suffix,
                "Group " + suffix
        );

        return id;
    }

    private void assignDirectly(
            TestStructure structure
    ) {
        UUID adminUserId =
                jdbcTemplate.queryForObject(
                        """
                        SELECT id
                        FROM users
                        WHERE LOWER(email) =
                            LOWER('admin@test.com')
                        """,
                        UUID.class
                );

        jdbcTemplate.update(
                """
                INSERT INTO group_curriculum_assignments
                (
                    id,
                    organization_id,
                    group_id,
                    curriculum_id,
                    status,
                    start_date,
                    created_by,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE',
                    '2026-09-01', ?,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                UUID.randomUUID(),
                structure.organizationId(),
                structure.groupId(),
                structure.curriculumId(),
                adminUserId
        );
    }

    private UUID findTestOrganizationId() {
        return jdbcTemplate.queryForObject(
                """
                SELECT id
                FROM organizations
                WHERE slug = 'test-academy'
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
            UUID unitId
    ) {
    }
}
