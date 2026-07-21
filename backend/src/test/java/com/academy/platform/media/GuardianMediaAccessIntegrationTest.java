package com.academy.platform.media;

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

class GuardianMediaAccessIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void guardianCanViewInternalStudentMediaWithConsent()
            throws Exception {

        TestStructure structure =
                createStructure(
                        true,
                        false,
                        MediaPurpose.INTERNAL
                );

        Cookie guardian = login(
                structure.guardianEmail(),
                "GuardianPassword123!",
                "test-academy"
        );

        mockMvc.perform(
                        get(
                                "/api/v1/guardian-media/"
                                        + "students/{studentId}",
                                structure.studentId()
                        )
                                .cookie(guardian)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.length()")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$[0].purpose")
                                .value("INTERNAL")
                );

        mockMvc.perform(
                        get(
                                "/api/v1/media/{mediaId}/download",
                                structure.mediaId()
                        )
                                .cookie(guardian)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.downloadUrl")
                                .isNotEmpty()
                );
    }

    @Test
    void internalMediaIsDeniedWithoutInternalConsent()
            throws Exception {

        TestStructure structure =
                createStructure(
                        false,
                        true,
                        MediaPurpose.INTERNAL
                );

        Cookie guardian = login(
                structure.guardianEmail(),
                "GuardianPassword123!",
                "test-academy"
        );

        mockMvc.perform(
                        get(
                                "/api/v1/media/{mediaId}/download",
                                structure.mediaId()
                        )
                                .cookie(guardian)
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void marketingMediaRequiresMarketingConsent()
            throws Exception {

        TestStructure denied =
                createStructure(
                        true,
                        false,
                        MediaPurpose.MARKETING
                );

        Cookie deniedGuardian = login(
                denied.guardianEmail(),
                "GuardianPassword123!",
                "test-academy"
        );

        mockMvc.perform(
                        get(
                                "/api/v1/media/{mediaId}/download",
                                denied.mediaId()
                        )
                                .cookie(deniedGuardian)
                )
                .andExpect(status().isNotFound());

        TestStructure allowed =
                createStructure(
                        false,
                        true,
                        MediaPurpose.MARKETING
                );

        Cookie allowedGuardian = login(
                allowed.guardianEmail(),
                "GuardianPassword123!",
                "test-academy"
        );

        mockMvc.perform(
                        get(
                                "/api/v1/media/{mediaId}/download",
                                allowed.mediaId()
                        )
                                .cookie(allowedGuardian)
                )
                .andExpect(status().isOk());
    }

    @Test
    void guardianCannotViewUnlinkedStudentMedia()
            throws Exception {

        TestStructure structure =
                createStructure(
                        true,
                        true,
                        MediaPurpose.INTERNAL
                );

        UUID unlinkedStudentId =
                createStudent(
                        findOrganizationId()
                );

        UUID unlinkedMediaId =
                createAvailableMedia(
                        findOrganizationId(),
                        findAdminUserId()
                );

        createMediaLink(
                findOrganizationId(),
                unlinkedMediaId,
                unlinkedStudentId,
                findAdminUserId(),
                MediaPurpose.INTERNAL
        );

        Cookie guardian = login(
                structure.guardianEmail(),
                "GuardianPassword123!",
                "test-academy"
        );

        mockMvc.perform(
                        get(
                                "/api/v1/media/{mediaId}/download",
                                unlinkedMediaId
                        )
                                .cookie(guardian)
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void guardianCannotBrowseOrganizationMedia()
            throws Exception {

        TestStructure structure =
                createStructure(
                        true,
                        true,
                        MediaPurpose.INTERNAL
                );

        Cookie guardian = login(
                structure.guardianEmail(),
                "GuardianPassword123!",
                "test-academy"
        );

        mockMvc.perform(
                        get("/api/v1/media")
                                .cookie(guardian)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.length()")
                                .value(0)
                );
    }

    @Test
    void consentRevocationImmediatelyRemovesAccess()
            throws Exception {

        TestStructure structure =
                createStructure(
                        true,
                        false,
                        MediaPurpose.INTERNAL
                );

        Cookie guardian = login(
                structure.guardianEmail(),
                "GuardianPassword123!",
                "test-academy"
        );

        mockMvc.perform(
                        get(
                                "/api/v1/media/{mediaId}/download",
                                structure.mediaId()
                        )
                                .cookie(guardian)
                )
                .andExpect(status().isOk());

        jdbcTemplate.update(
                """
                UPDATE student_guardians
                SET
                    internal_media_consent = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE student_id = ?
                  AND guardian_id = ?
                """,
                structure.studentId(),
                structure.guardianId()
        );

        mockMvc.perform(
                        get(
                                "/api/v1/media/{mediaId}/download",
                                structure.mediaId()
                        )
                                .cookie(guardian)
                )
                .andExpect(status().isNotFound());
    }

    private TestStructure createStructure(
            boolean internalConsent,
            boolean marketingConsent,
            MediaPurpose purpose
    ) {
        UUID organizationId =
                findOrganizationId();

        UUID adminUserId =
                findAdminUserId();

        UUID studentId =
                createStudent(organizationId);

        GuardianAccount guardian =
                createGuardian(
                        organizationId,
                        studentId,
                        internalConsent,
                        marketingConsent
                );

        UUID mediaId =
                createAvailableMedia(
                        organizationId,
                        adminUserId
                );

        createMediaLink(
                organizationId,
                mediaId,
                studentId,
                adminUserId,
                purpose
        );

        return new TestStructure(
                studentId,
                guardian.guardianId(),
                guardian.email(),
                mediaId
        );
    }

    private GuardianAccount createGuardian(
            UUID organizationId,
            UUID studentId,
            boolean internalConsent,
            boolean marketingConsent
    ) {
        UUID userId = UUID.randomUUID();
        UUID membershipId = UUID.randomUUID();
        UUID guardianId = UUID.randomUUID();

        String email =
                "guardian-" + userId + "@test.com";

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        UUID guardianRoleId =
                findRoleId("GUARDIAN");

        jdbcTemplate.update(
                """
                INSERT INTO users
                (
                    id, email, password_hash,
                    first_name, last_name, status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, 'Media', 'Guardian',
                    'ACTIVE', ?, ?, 0
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
                    id, organization_id, user_id,
                    status, display_first_name,
                    display_last_name, security_version,
                    joined_at, created_at,
                    updated_at, version
                )
                VALUES (
                    ?, ?, ?, 'ACTIVE',
                    'Media', 'Guardian', 0,
                    ?, ?, ?, 0
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
                    id, organization_id,
                    membership_id, guardian_number,
                    status, created_at,
                    updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE', ?, ?, 0
                )
                """,
                guardianId,
                organizationId,
                membershipId,
                "GRD-" + suffix(),
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO student_guardians
                (
                    organization_id,
                    student_id,
                    guardian_id,
                    relationship_type,
                    primary_contact,
                    legal_guardian,
                    pickup_authorized,
                    receives_notifications,
                    internal_media_consent,
                    marketing_media_consent,
                    consent_recorded_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?, ?, ?, 'LEGAL_GUARDIAN',
                    TRUE, TRUE, TRUE, TRUE,
                    ?, ?, ?, ?, ?
                )
                """,
                organizationId,
                studentId,
                guardianId,
                internalConsent,
                marketingConsent,
                now,
                now,
                now
        );

        return new GuardianAccount(
                guardianId,
                email
        );
    }

    private UUID createStudent(
            UUID organizationId
    ) {
        UUID studentId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO students
                (
                    id, organization_id,
                    student_number,
                    first_name, last_name, status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, 'Media', 'Student',
                    'ACTIVE',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                studentId,
                organizationId,
                "STU-" + suffix()
        );

        return studentId;
    }

    private UUID createAvailableMedia(
            UUID organizationId,
            UUID uploadedBy
    ) {
        UUID mediaId = UUID.randomUUID();
        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO media_files
                (
                    id, organization_id,
                    storage_bucket, storage_key,
                    original_filename, content_type,
                    media_type, status,
                    expected_size, actual_size,
                    uploaded_by,
                    upload_completed_at,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, 'test-bucket', ?,
                    'guardian-test.jpg',
                    'image/jpeg',
                    'IMAGE', 'AVAILABLE',
                    100, 100, ?, ?, ?, ?, 0
                )
                """,
                mediaId,
                organizationId,
                organizationId
                        + "/"
                        + mediaId
                        + "/guardian-test.jpg",
                uploadedBy,
                now,
                now,
                now
        );

        return mediaId;
    }

    private void createMediaLink(
            UUID organizationId,
            UUID mediaId,
            UUID studentId,
            UUID linkedBy,
            MediaPurpose purpose
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO media_links
                (
                    id, organization_id,
                    media_id, student_id,
                    purpose, caption,
                    cover_media, linked_by,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, ?, 'Guardian media',
                    FALSE, ?,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                UUID.randomUUID(),
                organizationId,
                mediaId,
                studentId,
                purpose.name(),
                linkedBy
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

    private String suffix() {
        return UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);
    }

    private record GuardianAccount(
            UUID guardianId,
            String email
    ) {
    }

    private record TestStructure(
            UUID studentId,
            UUID guardianId,
            String guardianEmail,
            UUID mediaId
    ) {
    }
}
