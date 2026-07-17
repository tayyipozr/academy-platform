package com.academy.platform.authentication;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.academy.platform.IntegrationTestSupport;

import jakarta.servlet.http.Cookie;

class AuthenticationIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanLoginAndUseAuthenticatedSession()
            throws Exception {

        Cookie sessionCookie
                = loginAsAdministrator();

        mockMvc.perform(
                get("/api/v1/auth/me")
                        .cookie(sessionCookie)
        )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.email")
                                .value("admin@test.com")
                )
                .andExpect(
                        jsonPath("$.organization.slug")
                                .value("test-academy")
                )
                .andExpect(
                        jsonPath("$.roles[0]")
                                .value(
                                        "ORGANIZATION_ADMIN"
                                )
                );
    }

    @Test
    void invalidPasswordReturnsUnauthorized()
            throws Exception {

        mockMvc.perform(
                post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "email": "admin@test.com",
                                          "password": "WrongPassword123!",
                                          "organizationSlug": "test-academy"
                                        }
                                        """)
        )
                .andExpect(status().isUnauthorized())
                .andExpect(
                        jsonPath("$.code")
                                .value(
                                        "INVALID_CREDENTIALS"
                                )
                );
    }

    @Test
    void authenticatedSessionCanBeLoggedOut()
            throws Exception {

        Cookie sessionCookie
                = loginAsAdministrator();

        mockMvc.perform(
                post("/api/v1/auth/logout")
                        .cookie(sessionCookie)
                        .with(csrf())
        )
                .andExpect(status().isNoContent());

        mockMvc.perform(
                get("/api/v1/auth/me")
                        .cookie(sessionCookie)
        )
                .andExpect(status().isUnauthorized());
    }

    @Test
    void currentUserEndpointRequiresAuthentication()
            throws Exception {

        mockMvc.perform(
                get("/api/v1/auth/me")
        )
                .andExpect(status().isUnauthorized())
                .andExpect(
                        jsonPath("$.code")
                                .value(
                                        "AUTHENTICATION_REQUIRED"
                                )
                );
    }
}
