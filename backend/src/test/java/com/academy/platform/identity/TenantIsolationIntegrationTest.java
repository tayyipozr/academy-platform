package com.academy.platform.identity;

import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import org.junit.jupiter.api.Test;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.academy.platform.IntegrationTestSupport;

class TenantIsolationIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void userListingDoesNotExposeAnotherOrganization()
            throws Exception {

        createForeignMembership();
        var session = loginAsAdministrator();

        mockMvc.perform(
                get("/api/v1/users")
                        .cookie(session))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.data[*].email")
                                .value(
                                        not(
                                                hasItem(
                                                        org.hamcrest.Matchers
                                                                .containsString(
                                                                        "foreign-"
                                                                )
                                                )
                                        )
                                )
                );
    }

    @Test
    void administratorCannotSuspendForeignMembership()
            throws Exception {

        UUID foreignMembershipId
                = createForeignMembership();

        var session = loginAsAdministrator();

        mockMvc.perform(
                post(
                        "/api/v1/users/{id}/suspend",
                        foreignMembershipId
                )
                        .cookie(session)
                        .with(csrf())
        )
                .andExpect(status().isNotFound())
                .andExpect(
                        jsonPath("$.code")
                                .value("RESOURCE_NOT_FOUND")
                );
    }
}
