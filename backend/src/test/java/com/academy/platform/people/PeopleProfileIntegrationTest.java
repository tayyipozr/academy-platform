package com.academy.platform.people;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.academy.platform.IntegrationTestSupport;

import jakarta.servlet.http.Cookie;

class PeopleProfileIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanCreateStaffProfile()
            throws Exception {

        Cookie administrator
                = loginAsAdministrator();

        UUID instructorRoleId
                = findRoleId("INSTRUCTOR");

        String email
                = "staff-" + UUID.randomUUID()
                + "@test.com";

        mockMvc.perform(
                post("/api/v1/users")
                        .cookie(administrator)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "email": "%s",
                                          "firstName": "Test",
                                          "lastName": "Coach",
                                          "temporaryPassword": "InstructorPassword123!",
                                          "roleIds": ["%s"]
                                        }
                                        """.formatted(
                                email,
                                instructorRoleId
                        ))
        )
                .andExpect(status().isCreated());

        UUID membershipId
                = findMembershipId(email);

        String staffNumber
                = ("STAFF-"
                        + UUID.randomUUID()
                                .toString()
                                .substring(0, 8)).toUpperCase();

        mockMvc.perform(
                post("/api/v1/staff")
                        .cookie(administrator)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "membershipId": "%s",
                                          "branchId": null,
                                          "staffNumber": "%s",
                                          "title": "Coach",
                                          "specialization": "Football",
                                          "biography": null,
                                          "hiredAt": "2026-07-20",
                                          "endedAt": null
                                        }
                                        """.formatted(
                                membershipId,
                                staffNumber
                        ))
        )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.staffNumber")
                                .value(staffNumber.toUpperCase())
                )
                .andExpect(
                        jsonPath("$.email")
                                .value(email)
                );
    }

    @Test
    void administratorCanCreateGuardianProfile()
            throws Exception {

        Cookie administrator
                = loginAsAdministrator();

        UUID guardianRoleId
                = findRoleId("GUARDIAN");

        String email
                = "guardian-" + UUID.randomUUID()
                + "@test.com";

        mockMvc.perform(
                post("/api/v1/users")
                        .cookie(administrator)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "email": "%s",
                                          "firstName": "Test",
                                          "lastName": "Guardian",
                                          "temporaryPassword": "GuardianPassword123!",
                                          "roleIds": ["%s"]
                                        }
                                        """.formatted(
                                email,
                                guardianRoleId
                        ))
        )
                .andExpect(status().isCreated());

        UUID membershipId
                = findMembershipId(email);

        String guardianNumber
                = ("GUARD-"
                        + UUID.randomUUID()
                                .toString()
                                .substring(0, 8)).toUpperCase();

        mockMvc.perform(
                post("/api/v1/guardians")
                        .cookie(administrator)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "membershipId": "%s",
                                          "guardianNumber": "%s",
                                          "phone": "123456789",
                                          "alternatePhone": null,
                                          "occupation": "Engineer",
                                          "addressLine1": "Test Street",
                                          "addressLine2": null,
                                          "city": "Istanbul",
                                          "stateProvince": "Istanbul",
                                          "postalCode": "34000",
                                          "countryCode": "TR",
                                          "notes": null
                                        }
                                        """.formatted(
                                membershipId,
                                guardianNumber
                        ))
        )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.guardianNumber")
                                .value(guardianNumber.toUpperCase())
                )
                .andExpect(
                        jsonPath("$.email")
                                .value(email)
                );
    }

    @Test
    void foreignMembershipCannotBecomeStaffProfile()
            throws Exception {

        Cookie administrator
                = loginAsAdministrator();

        UUID foreignMembershipId
                = createForeignMembership();

        mockMvc.perform(
                post("/api/v1/staff")
                        .cookie(administrator)
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "membershipId": "%s",
                                          "branchId": null,
                                          "staffNumber": "FOREIGN-STAFF",
                                          "title": "Coach",
                                          "specialization": null,
                                          "biography": null,
                                          "hiredAt": null,
                                          "endedAt": null
                                        }
                                        """.formatted(
                                foreignMembershipId
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

    private UUID findMembershipId(String email) {
        return jdbcTemplate.queryForObject(
                """
                SELECT om.id
                FROM organization_memberships om
                JOIN users u
                    ON u.id = om.user_id
                WHERE LOWER(u.email) = LOWER(?)
                """,
                UUID.class,
                email
        );
    }
}
