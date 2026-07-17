package com.academy.platform.student;

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

class StudentIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanCreateStudent()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        String studentNumber = (
                "STU-"
                        + UUID.randomUUID()
                        .toString()
                        .substring(0, 8)
        ).toUpperCase(Locale.ROOT);

        mockMvc.perform(
                        post("/api/v1/students")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "branchId": null,
                                          "studentNumber": "%s",
                                          "firstName": "Test",
                                          "lastName": "Student",
                                          "birthDate": "2015-05-10",
                                          "gender": "UNSPECIFIED",
                                          "enrollmentDate": "2026-07-20",
                                          "medicalNotes": null,
                                          "allergies": null,
                                          "emergencyContactName": null,
                                          "emergencyContactPhone": null,
                                          "notes": null
                                        }
                                        """.formatted(
                                        studentNumber
                                ))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.studentNumber")
                                .value(studentNumber)
                )
                .andExpect(
                        jsonPath("$.firstName")
                                .value("Test")
                )
                .andExpect(
                        jsonPath("$.status")
                                .value("ACTIVE")
                );
    }

    @Test
    void administratorCanLinkGuardianToStudent()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID studentId = createStudent();
        UUID guardianId = createGuardianProfile();

        mockMvc.perform(
                        post(
                                "/api/v1/students/{studentId}/guardians",
                                studentId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "guardianId": "%s",
                                          "relationshipType": "LEGAL_GUARDIAN",
                                          "primaryContact": true,
                                          "legalGuardian": true,
                                          "pickupAuthorized": true,
                                          "receivesNotifications": true,
                                          "internalMediaConsent": true,
                                          "marketingMediaConsent": false
                                        }
                                        """.formatted(
                                        guardianId
                                ))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.guardianId")
                                .value(
                                        guardianId.toString()
                                )
                )
                .andExpect(
                        jsonPath("$.primaryContact")
                                .value(true)
                )
                .andExpect(
                        jsonPath("$.legalGuardian")
                                .value(true)
                );
    }

    @Test
    void foreignGuardianCannotBeLinked()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID studentId = createStudent();
        UUID foreignGuardianId =
                createForeignGuardianProfile();

        mockMvc.perform(
                        post(
                                "/api/v1/students/{studentId}/guardians",
                                studentId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "guardianId": "%s",
                                          "relationshipType": "OTHER",
                                          "primaryContact": false,
                                          "legalGuardian": false,
                                          "pickupAuthorized": false,
                                          "receivesNotifications": false,
                                          "internalMediaConsent": false,
                                          "marketingMediaConsent": false
                                        }
                                        """.formatted(
                                        foreignGuardianId
                                ))
                )
                .andExpect(status().isNotFound())
                .andExpect(
                        jsonPath("$.code")
                                .value(
                                        "RESOURCE_NOT_FOUND"
                                )
                );
    }

    private UUID createStudent() {
        UUID organizationId =
                findTestOrganizationId();

        UUID studentId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO students
                (
                    id,
                    organization_id,
                    branch_id,
                    student_number,
                    first_name,
                    last_name,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    NULL,
                    ?,
                    'Test',
                    'Student',
                    'ACTIVE',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                studentId,
                organizationId,
                (
                        "STU-"
                                + studentId.toString()
                                .substring(0, 8)
                ).toUpperCase(Locale.ROOT)
        );

        return studentId;
    }

    private UUID createGuardianProfile() {
        UUID guardianRoleId =
                findRoleId("GUARDIAN");

        String email =
                "guardian-"
                        + UUID.randomUUID()
                        + "@test.com";

        UUID organizationId =
                findTestOrganizationId();

        UUID userId = UUID.randomUUID();
        UUID membershipId = UUID.randomUUID();
        UUID guardianId = UUID.randomUUID();

        var now = java.time.OffsetDateTime.now(
                java.time.ZoneOffset.UTC
        );

        jdbcTemplate.update(
                """
                INSERT INTO users
                (
                    id,
                    email,
                    password_hash,
                    first_name,
                    last_name,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    'Test',
                    'Guardian',
                    'ACTIVE',
                    ?,
                    ?,
                    0
                )
                """,
                userId,
                email,
                passwordEncoder.encode(
                        "GuardianPassword123!"
                ),
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO organization_memberships
                (
                    id,
                    organization_id,
                    user_id,
                    status,
                    display_first_name,
                    display_last_name,
                    security_version,
                    joined_at,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    'ACTIVE',
                    'Test',
                    'Guardian',
                    0,
                    ?,
                    ?,
                    ?,
                    0
                )
                """,
                membershipId,
                organizationId,
                userId,
                now,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO membership_roles
                    (membership_id, role_id)
                VALUES (?, ?)
                """,
                membershipId,
                guardianRoleId
        );

        jdbcTemplate.update(
                """
                INSERT INTO guardians
                (
                    id,
                    organization_id,
                    membership_id,
                    guardian_number,
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
                guardianId,
                organizationId,
                membershipId,
                (
                        "GRD-"
                                + guardianId.toString()
                                .substring(0, 8)
                ).toUpperCase(Locale.ROOT),
                now,
                now
        );

        return guardianId;
    }

    private UUID createForeignGuardianProfile() {
        UUID foreignMembershipId =
                createForeignMembership();

        UUID foreignOrganizationId =
                jdbcTemplate.queryForObject(
                        """
                        SELECT organization_id
                        FROM organization_memberships
                        WHERE id = ?
                        """,
                        UUID.class,
                        foreignMembershipId
                );

        UUID guardianId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO guardians
                (
                    id,
                    organization_id,
                    membership_id,
                    guardian_number,
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
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                guardianId,
                foreignOrganizationId,
                foreignMembershipId,
                (
                        "FOREIGN-"
                                + guardianId.toString()
                                .substring(0, 8)
                ).toUpperCase(Locale.ROOT)
        );

        return guardianId;
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
}
