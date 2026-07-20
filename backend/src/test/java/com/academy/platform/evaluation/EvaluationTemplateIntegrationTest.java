package com.academy.platform.evaluation;

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

class EvaluationTemplateIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanCreateAndActivateTemplate()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID programId = createProgram();

        String suffix = suffix();

        var templateResult = mockMvc.perform(
                        post(
                                "/api/v1/evaluation-templates"
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "programId": "%s",
                                          "code": "EVAL-%s",
                                          "name": "Evaluation %s",
                                          "description": "Test evaluation",
                                          "versionLabel": "1.0",
                                          "minimumScore": 0,
                                          "maximumScore": 100,
                                          "passingScore": 60
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

        String templateId = JsonPath.read(
                templateResult.getResponse()
                        .getContentAsString(),
                "$.id"
        );

        createCriterion(
                administrator,
                templateId,
                "TECH-" + suffix,
                "Technical",
                60,
                1
        );

        createCriterion(
                administrator,
                templateId,
                "TEAM-" + suffix,
                "Teamwork",
                40,
                2
        );

        mockMvc.perform(
                        post(
                                "/api/v1/evaluation-templates/"
                                        + "{templateId}/status/ACTIVE",
                                templateId
                        )
                                .cookie(administrator)
                                .with(csrf())
                )
                .andExpect(status().isNoContent());
    }

    @Test
    void activationRequiresExactlyOneHundredWeight()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID templateId =
                createTemplateDirectly(
                        createProgram()
                );

        createCriterion(
                administrator,
                templateId.toString(),
                "ONLY-" + suffix(),
                "Only criterion",
                75,
                1
        );

        mockMvc.perform(
                        post(
                                "/api/v1/evaluation-templates/"
                                        + "{templateId}/status/ACTIVE",
                                templateId
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
    void criterionWeightCannotExceedOneHundredTotal()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID templateId =
                createTemplateDirectly(
                        createProgram()
                );

        createCriterion(
                administrator,
                templateId.toString(),
                "FIRST-" + suffix(),
                "First",
                80,
                1
        );

        mockMvc.perform(
                        post(
                                "/api/v1/evaluation-templates/"
                                        + "{templateId}/criteria",
                                templateId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "code": "SECOND-%s",
                                          "name": "Second",
                                          "description": null,
                                          "weightPercentage": 30,
                                          "sequenceNumber": 2
                                        }
                                        """.formatted(
                                        suffix()
                                ))
                )
                .andExpect(
                        status().isUnprocessableEntity()
                );
    }

    @Test
    void foreignProgramCannotBeUsed()
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
                        post(
                                "/api/v1/evaluation-templates"
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "programId": "%s",
                                          "code": "FOREIGN-%s",
                                          "name": "Foreign %s",
                                          "description": null,
                                          "versionLabel": "1.0",
                                          "minimumScore": 0,
                                          "maximumScore": 100,
                                          "passingScore": 60
                                        }
                                        """.formatted(
                                        foreignProgramId,
                                        suffix,
                                        suffix
                                ))
                )
                .andExpect(
                        status().isUnprocessableEntity()
                );
    }

    private void createCriterion(
            Cookie administrator,
            String templateId,
            String code,
            String name,
            int weight,
            int sequence
    ) throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/evaluation-templates/"
                                        + "{templateId}/criteria",
                                templateId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "code": "%s",
                                          "name": "%s",
                                          "description": null,
                                          "weightPercentage": %d,
                                          "sequenceNumber": %d
                                        }
                                        """.formatted(
                                        code,
                                        name,
                                        weight,
                                        sequence
                                ))
                )
                .andExpect(status().isCreated());
    }

    private UUID createTemplateDirectly(
            UUID programId
    ) {
        UUID organizationId =
                findOrganizationId();

        UUID templateId = UUID.randomUUID();
        String suffix = suffix();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO evaluation_templates
                (
                    id,
                    organization_id,
                    program_id,
                    code,
                    name,
                    version_label,
                    minimum_score,
                    maximum_score,
                    passing_score,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, ?, '1.0',
                    0, 100, 60, 'DRAFT',
                    ?, ?, 0
                )
                """,
                templateId,
                organizationId,
                programId,
                "EVAL-" + suffix,
                "Evaluation " + suffix,
                now,
                now
        );

        return templateId;
    }

    private UUID createProgram() {
        return createProgram(
                findOrganizationId()
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
                "PRG-" + suffix,
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

    private String suffix() {
        return UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);
    }
}
