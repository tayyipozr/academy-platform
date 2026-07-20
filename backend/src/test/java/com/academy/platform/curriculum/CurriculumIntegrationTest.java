package com.academy.platform.curriculum;

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
        .MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.status;

class CurriculumIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanCreateAndActivateCurriculum()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID programId = createProgram(
                findTestOrganizationId()
        );

        String suffix = suffix();

        var curriculumResult = mockMvc.perform(
                        post("/api/v1/curricula")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "programId": "%s",
                                          "code": "CUR-%s",
                                          "name": "Curriculum %s",
                                          "description": "Test curriculum",
                                          "versionLabel": "1.0"
                                        }
                                        """.formatted(
                                        programId,
                                        suffix,
                                        suffix
                                ))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.status")
                                .value("DRAFT")
                )
                .andReturn();

        String curriculumId = JsonPath.read(
                curriculumResult.getResponse()
                        .getContentAsString(),
                "$.id"
        );

        var unitResult = mockMvc.perform(
                        post(
                                "/api/v1/curricula/{id}/units",
                                curriculumId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "parentUnitId": null,
                                          "code": "UNIT-%s",
                                          "title": "Unit %s",
                                          "description": "Test unit",
                                          "sequenceNumber": 1,
                                          "estimatedSessions": 4
                                        }
                                        """.formatted(
                                        suffix,
                                        suffix
                                ))
                )
                .andExpect(status().isCreated())
                .andReturn();

        String unitId = JsonPath.read(
                unitResult.getResponse()
                        .getContentAsString(),
                "$.id"
        );

        mockMvc.perform(
                        post(
                                "/api/v1/curricula/{curriculumId}"
                                        + "/units/{unitId}/outcomes",
                                curriculumId,
                                unitId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "code": "OUT-%s",
                                          "title": "Outcome %s",
                                          "description": "Test outcome",
                                          "sequenceNumber": 1
                                        }
                                        """.formatted(
                                        suffix,
                                        suffix
                                ))
                )
                .andExpect(status().isCreated());

        mockMvc.perform(
                        post(
                                "/api/v1/curricula/{id}/status/ACTIVE",
                                curriculumId
                        )
                                .cookie(administrator)
                                .with(csrf())
                )
                .andExpect(status().isNoContent());
    }

    @Test
    void curriculumWithoutOutcomesCannotBeActivated()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID organizationId =
                findTestOrganizationId();

        UUID programId =
                createProgram(organizationId);

        UUID curriculumId = UUID.randomUUID();
        UUID unitId = UUID.randomUUID();

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
                    'DRAFT', ?, ?, 0
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
                    id,
                    organization_id,
                    curriculum_id,
                    code,
                    title,
                    sequence_number,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, ?, 1, ?, ?, 0
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

        mockMvc.perform(
                        post(
                                "/api/v1/curricula/{id}/status/ACTIVE",
                                curriculumId
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
    void foreignProgramCannotBeUsedForCurriculum()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID foreignOrganizationId =
                createForeignOrganization();

        UUID foreignProgramId =
                createProgram(
                        foreignOrganizationId
                );

        String suffix = suffix();

        mockMvc.perform(
                        post("/api/v1/curricula")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "programId": "%s",
                                          "code": "FOREIGN-%s",
                                          "name": "Foreign Curriculum %s",
                                          "description": null,
                                          "versionLabel": "1.0"
                                        }
                                        """.formatted(
                                        foreignProgramId,
                                        suffix,
                                        suffix
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

    private UUID createProgram(
            UUID organizationId
    ) {
        UUID programId = UUID.randomUUID();
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
                programId,
                organizationId,
                "PROGRAM-" + suffix,
                "Program " + suffix,
                now,
                now
        );

        return programId;
    }

    private UUID createForeignOrganization() {
        UUID organizationId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO organizations
                (
                    id,
                    name,
                    slug,
                    status,
                    default_locale,
                    timezone,
                    settings,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, 'ACTIVE',
                    'en-US', 'UTC', '{}'::jsonb,
                    ?, ?, 0
                )
                """,
                organizationId,
                "Foreign " + organizationId,
                "foreign-" + organizationId,
                now,
                now
        );

        return organizationId;
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
}
