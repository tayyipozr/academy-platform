package com.academy.platform.structure;

import java.util.Locale;
import java.util.UUID;

import com.academy.platform.IntegrationTestSupport;

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

class ProgramAndTermIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanCreateProgram()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        String code = "PROGRAM-" + suffix;
        String name = "Program " + suffix;

        mockMvc.perform(
                        post("/api/v1/programs")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "code": "%s",
                                          "name": "%s",
                                          "description": "Test program",
                                          "category": "SPORT",
                                          "minimumAge": 6,
                                          "maximumAge": 16
                                        }
                                        """.formatted(code, name))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.code").value(code)
                )
                .andExpect(
                        jsonPath("$.status")
                                .value("ACTIVE")
                );
    }

    @Test
    void invalidProgramAgeRangeIsRejected()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        mockMvc.perform(
                        post("/api/v1/programs")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "code": "INVALID-%s",
                                          "name": "Invalid Program %s",
                                          "description": null,
                                          "category": null,
                                          "minimumAge": 16,
                                          "maximumAge": 6
                                        }
                                        """.formatted(
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
    void administratorCanCreateAndActivateTerm()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        var result = mockMvc.perform(
                        post("/api/v1/terms")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "code": "TERM-%s",
                                          "name": "Term %s",
                                          "startDate": "2026-09-01",
                                          "endDate": "2027-06-30"
                                        }
                                        """.formatted(
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

        String termId =
                com.jayway.jsonpath.JsonPath.read(
                        result.getResponse()
                                .getContentAsString(),
                        "$.id"
                );

        mockMvc.perform(
                        post(
                                "/api/v1/terms/{termId}/status/ACTIVE",
                                termId
                        )
                                .cookie(administrator)
                                .with(csrf())
                )
                .andExpect(status().isNoContent());
    }

    @Test
    void invalidTermDateRangeIsRejected()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        mockMvc.perform(
                        post("/api/v1/terms")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "code": "INVALID-%s",
                                          "name": "Invalid Term %s",
                                          "startDate": "2027-06-30",
                                          "endDate": "2026-09-01"
                                        }
                                        """.formatted(
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
}
