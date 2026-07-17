package com.academy.platform.organization;

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

class OrganizationStructureIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanManageOrganizationSettings()
            throws Exception {

        Cookie cookie = loginAsAdministrator();

        mockMvc.perform(
                put("/api/v1/organization/settings")
                        .cookie(cookie)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "name": "Test Sports Academy",
                                          "defaultLocale": "en-US",
                                          "timezone": "Europe/Istanbul",
                                          "terminology": {
                                            "studentLabel": "Athlete",
                                            "staffLabel": "Coach",
                                            "groupLabel": "Team",
                                            "sessionLabel": "Training",
                                            "programLabel": "Sport"
                                          }
                                        }
                                        """)
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.name")
                                .value(
                                        "Test Sports Academy"
                                )
                )
                .andExpect(
                        jsonPath(
                                "$.terminology.studentLabel"
                        ).value("Athlete")
                );
    }

    @Test
    void administratorCanCreateAndListBranch()
            throws Exception {

        Cookie cookie = loginAsAdministrator();

        mockMvc.perform(
                post("/api/v1/branches")
                        .cookie(cookie)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "code": "TEST-BRANCH",
                                          "name": "Test Branch",
                                          "email": "branch@test.com",
                                          "phone": "123456789",
                                          "addressLine1": "Test Street",
                                          "addressLine2": null,
                                          "city": "Istanbul",
                                          "stateProvince": "Istanbul",
                                          "postalCode": "34000",
                                          "countryCode": "TR",
                                          "timezone": "Europe/Istanbul"
                                        }
                                        """)
        )
                .andExpect(status().isCreated());

        mockMvc.perform(
                get("/api/v1/branches")
                        .cookie(cookie)
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath(
                                "$[?(@.code == 'TEST-BRANCH')]"
                        ).exists()
                );
    }

    @Test
    void administratorCannotUpdateForeignBranch()
            throws Exception {

        UUID foreignMembershipId
                = createForeignMembership();

        UUID foreignOrganizationId
                = jdbcTemplate.queryForObject(
                        """
                        SELECT organization_id
                        FROM organization_memberships
                        WHERE id = ?
                        """,
                        UUID.class,
                        foreignMembershipId
                );

        UUID foreignBranchId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO branches
                (
                    id,
                    organization_id,
                    code,
                    name,
                    status,
                    timezone,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    'FOREIGN',
                    'Foreign Branch',
                    'ACTIVE',
                    'UTC',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                foreignBranchId,
                foreignOrganizationId
        );

        Cookie cookie = loginAsAdministrator();

        mockMvc.perform(
                put(
                        "/api/v1/branches/{branchId}",
                        foreignBranchId
                )
                        .cookie(cookie)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "code": "HACKED",
                                          "name": "Updated Branch",
                                          "email": null,
                                          "phone": null,
                                          "addressLine1": null,
                                          "addressLine2": null,
                                          "city": null,
                                          "stateProvince": null,
                                          "postalCode": null,
                                          "countryCode": null,
                                          "timezone": "UTC"
                                        }
                                        """)
        )
                .andExpect(status().isNotFound());
    }
}
