package com.academy.platform.identity;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.academy.platform.IntegrationTestSupport;

class UserPermissionIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void instructorCannotAccessUserManagement()
            throws Exception {

        var administratorCookie
                = loginAsAdministrator();

        UUID instructorRoleId
                = findRoleId("INSTRUCTOR");

        String email = "instructor-"
                + UUID.randomUUID()
                + "@test.com";

        mockMvc.perform(
                post("/api/v1/users")
                        .cookie(administratorCookie).with(csrf())
                        .contentType(
                                "application/json"
                        )
                        .content("""
                                        {
                                          "email": "%s",
                                          "firstName": "Test",
                                          "lastName": "Instructor",
                                          "temporaryPassword": "InstructorPassword123!",
                                          "roleIds": ["%s"]
                                        }
                                        """.formatted(
                                email,
                                instructorRoleId
                        ))
        )
                .andExpect(status().isCreated());

        var instructorCookie = login(
                email,
                "InstructorPassword123!",
                "test-academy"
        );

        mockMvc.perform(
                get("/api/v1/users")
                        .cookie(instructorCookie)
        )
                .andExpect(status().isForbidden())
                .andExpect(
                        jsonPath("$.code")
                                .value("ACCESS_DENIED")
                );
    }
}
