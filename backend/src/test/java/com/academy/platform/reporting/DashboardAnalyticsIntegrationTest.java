package com.academy.platform.reporting;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

import com.academy.platform.IntegrationTestSupport;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.status;

class DashboardAnalyticsIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorReceivesOrganizationSummary()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        createDashboardStructure();

        mockMvc.perform(
                        get("/api/v1/dashboard/summary")
                                .cookie(administrator)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.dashboardType")
                                .value("ADMINISTRATOR")
                )
                .andExpect(
                        jsonPath("$.activeStudentCount")
                                .isNumber()
                )
                .andExpect(
                        jsonPath("$.activeGroupCount")
                                .isNumber()
                )
                .andExpect(
                        jsonPath("$.upcomingSessions")
                                .isArray()
                );
    }

    private void createDashboardStructure() {
        UUID organizationId =
                findOrganizationId();

        UUID adminUserId =
                findAdminUserId();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        UUID programId = UUID.randomUUID();
        UUID termId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO programs
                (
                    id, organization_id, code, name,
                    status, created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE', ?, ?, 0
                )
                """,
                programId,
                organizationId,
                "DASH-PRG-" + suffix,
                "Dashboard Program " + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO operational_terms
                (
                    id, organization_id, code, name,
                    start_date, end_date, status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?,
                    CURRENT_DATE,
                    CURRENT_DATE + 365,
                    'ACTIVE', ?, ?, 0
                )
                """,
                termId,
                organizationId,
                "DASH-TERM-" + suffix,
                "Dashboard Term " + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO academy_groups
                (
                    id, organization_id, program_id,
                    term_id, code, name, capacity,
                    status, created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, 20,
                    'ACTIVE', ?, ?, 0
                )
                """,
                groupId,
                organizationId,
                programId,
                termId,
                "DASH-GRP-" + suffix,
                "Dashboard Group " + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO students
                (
                    id, organization_id, student_number,
                    first_name, last_name, status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, 'Dashboard', 'Student',
                    'ACTIVE', ?, ?, 0
                )
                """,
                studentId,
                organizationId,
                "DASH-STU-" + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO lesson_sessions
                (
                    id, organization_id, group_id,
                    title, scheduled_start,
                    scheduled_end, status,
                    created_by, created_at,
                    updated_at, version
                )
                VALUES (
                    ?, ?, ?, 'Upcoming Dashboard Session',
                    CURRENT_TIMESTAMP + INTERVAL '1 day',
                    CURRENT_TIMESTAMP
                        + INTERVAL '2 hours'
                        + INTERVAL '1 day',
                    'SCHEDULED', ?, ?, ?, 0
                )
                """,
                UUID.randomUUID(),
                organizationId,
                groupId,
                adminUserId,
                now,
                now
        );
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

    private UUID findAdminUserId() {
        return jdbcTemplate.queryForObject(
                """
                SELECT id
                FROM users
                WHERE LOWER(email) =
                    LOWER('admin@test.com')
                """,
                UUID.class
        );
    }
}
