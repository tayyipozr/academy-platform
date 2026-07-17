package com.academy.platform.identity;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.academy.platform.IntegrationTestSupport;
import com.jayway.jsonpath.JsonPath;

class UserInvitationIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void invitationCanOnlyBeAcceptedOnce()
            throws Exception {

        var administratorCookie
                = loginAsAdministrator();

        UUID instructorRoleId
                = findRoleId("INSTRUCTOR");

        String email = "invited-"
                + UUID.randomUUID()
                + "@test.com";

        var invitationResult = mockMvc.perform(
                post("/api/v1/users/invitations")
                        .cookie(administratorCookie).with(csrf())
                        .contentType(
                                "application/json"
                        )
                        .content("""
                                        {
                                          "email": "%s",
                                          "firstName": "Invited",
                                          "lastName": "Instructor",
                                          "roleIds": ["%s"]
                                        }
                                        """.formatted(
                                email,
                                instructorRoleId
                        ))
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.token")
                                .isNotEmpty()
                )
                .andReturn();

        String token = JsonPath.read(
                invitationResult
                        .getResponse()
                        .getContentAsString(),
                "$.token"
        );

        String acceptanceBody = """
                {
                  "token": "%s",
                  "password": "InvitedPassword123!"
                }
                """.formatted(token);

        mockMvc.perform(
                post("/api/v1/invitations/accept")
                        .with(csrf())
                        .contentType(
                                "application/json"
                        )
                        .content(acceptanceBody)
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.accepted")
                                .value(true)
                );

        mockMvc.perform(
                post("/api/v1/invitations/accept")
                        .with(csrf())
                        .contentType(
                                "application/json"
                        )
                        .content(acceptanceBody)
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

        login(
                email,
                "InvitedPassword123!",
                "test-academy"
        );
    }
}
