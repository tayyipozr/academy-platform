package com.academy.platform.groupmanagement;

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

class GroupIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanCreateAndActivateGroup()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        GroupDependencies dependencies =
                createDependencies();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        var result = mockMvc.perform(
                        post("/api/v1/groups")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "branchId": null,
                                          "programId": "%s",
                                          "termId": "%s",
                                          "code": "GROUP-%s",
                                          "name": "Group %s",
                                          "description": "Test group",
                                          "capacity": 20,
                                          "minimumAge": 10,
                                          "maximumAge": 12
                                        }
                                        """.formatted(
                                        dependencies.programId(),
                                        dependencies.termId(),
                                        suffix,
                                        suffix
                                ))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.status")
                                .value("DRAFT")
                )
                .andExpect(
                        jsonPath("$.capacity")
                                .value(20)
                )
                .andReturn();

        String groupId = JsonPath.read(
                result.getResponse()
                        .getContentAsString(),
                "$.id"
        );

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}/status/ACTIVE",
                                groupId
                        )
                                .cookie(administrator)
                                .with(csrf())
                )
                .andExpect(status().isNoContent());

        mockMvc.perform(
                        get(
                                "/api/v1/groups/{groupId}",
                                groupId
                        )
                                .cookie(administrator)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.status")
                                .value("ACTIVE")
                );
    }

    @Test
    void invalidAgeRangeIsRejected()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        GroupDependencies dependencies =
                createDependencies();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        mockMvc.perform(
                        post("/api/v1/groups")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "branchId": null,
                                          "programId": "%s",
                                          "termId": "%s",
                                          "code": "INVALID-%s",
                                          "name": "Invalid Group %s",
                                          "description": null,
                                          "capacity": 20,
                                          "minimumAge": 16,
                                          "maximumAge": 6
                                        }
                                        """.formatted(
                                        dependencies.programId(),
                                        dependencies.termId(),
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

    @Test
    void foreignProgramCannotBeAssigned()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        GroupDependencies localDependencies =
                createDependencies();

        UUID foreignOrganizationId =
                createForeignOrganization();

        UUID foreignProgramId =
                createProgram(
                        foreignOrganizationId,
                        "FOREIGN"
                );

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        mockMvc.perform(
                        post("/api/v1/groups")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "branchId": null,
                                          "programId": "%s",
                                          "termId": "%s",
                                          "code": "FOREIGN-%s",
                                          "name": "Foreign Group %s",
                                          "description": null,
                                          "capacity": 20,
                                          "minimumAge": null,
                                          "maximumAge": null
                                        }
                                        """.formatted(
                                        foreignProgramId,
                                        localDependencies.termId(),
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

    @Test
    void groupSearchIsTenantIsolated()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID foreignOrganizationId =
                createForeignOrganization();

        UUID foreignProgramId =
                createProgram(
                        foreignOrganizationId,
                        "FOREIGN"
                );

        UUID foreignTermId =
                createTerm(
                        foreignOrganizationId,
                        "FOREIGN"
                );

        createGroup(
                foreignOrganizationId,
                foreignProgramId,
                foreignTermId,
                "FOREIGN-GROUP"
        );

        mockMvc.perform(
                        get("/api/v1/groups")
                                .cookie(administrator)
                                .param(
                                        "search",
                                        "FOREIGN-GROUP"
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.length()")
                                .value(0)
                );
    }

    private GroupDependencies createDependencies() {
        UUID organizationId =
                findTestOrganizationId();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        UUID programId = createProgram(
                organizationId,
                suffix
        );

        UUID termId = createTerm(
                organizationId,
                suffix
        );

        return new GroupDependencies(
                programId,
                termId
        );
    }

    private UUID createProgram(
            UUID organizationId,
            String suffix
    ) {
        UUID programId = UUID.randomUUID();

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
                    ?,
                    ?,
                    ?,
                    ?,
                    'ACTIVE',
                    ?,
                    ?,
                    0
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

    private UUID createTerm(
            UUID organizationId,
            String suffix
    ) {
        UUID termId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

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
                    ?,
                    ?,
                    ?,
                    ?,
                    '2026-09-01',
                    '2027-06-30',
                    'ACTIVE',
                    ?,
                    ?,
                    0
                )
                """,
                termId,
                organizationId,
                "TERM-" + suffix,
                "Term " + suffix,
                now,
                now
        );

        return termId;
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
                    ?,
                    ?,
                    ?,
                    'ACTIVE',
                    'en-US',
                    'UTC',
                    '{}'::jsonb,
                    ?,
                    ?,
                    0
                )
                """,
                organizationId,
                "Foreign Organization "
                        + organizationId,
                "foreign-" + organizationId,
                now,
                now
        );

        return organizationId;
    }

    private void createGroup(
            UUID organizationId,
            UUID programId,
            UUID termId,
            String code
    ) {
        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

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
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    20,
                    'ACTIVE',
                    ?,
                    ?,
                    0
                )
                """,
                UUID.randomUUID(),
                organizationId,
                programId,
                termId,
                code,
                code,
                now,
                now
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

    private record GroupDependencies(
            UUID programId,
            UUID termId
    ) {
    }
}
