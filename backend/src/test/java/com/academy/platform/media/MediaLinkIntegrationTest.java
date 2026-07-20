package com.academy.platform.media;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

import com.academy.platform.IntegrationTestSupport;
import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.status;

class MediaLinkIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanLinkMediaToStudent()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID organizationId =
                findOrganizationId();

        UUID mediaId =
                createAvailableMedia(
                        organizationId,
                        findAdminUserId()
                );

        UUID studentId =
                createStudent(organizationId);

        mockMvc.perform(
                        post(
                                "/api/v1/media/{mediaId}/links",
                                mediaId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "targetType": "STUDENT",
                                          "targetId": "%s",
                                          "caption": "Profile photo",
                                          "coverMedia": true
                                        }
                                        """.formatted(
                                        studentId
                                ))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.mediaId")
                                .value(mediaId.toString())
                )
                .andExpect(
                        jsonPath("$.targetType")
                                .value("STUDENT")
                )
                .andExpect(
                        jsonPath("$.targetId")
                                .value(
                                        studentId.toString()
                                )
                )
                .andExpect(
                        jsonPath("$.coverMedia")
                                .value(true)
                );

        mockMvc.perform(
                        get(
                                "/api/v1/media/targets/"
                                        + "STUDENT/{studentId}",
                                studentId
                        )
                                .cookie(administrator)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.length()")
                                .value(1)
                );
    }

    @Test
    void duplicateMediaLinkIsRejected()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID organizationId =
                findOrganizationId();

        UUID mediaId =
                createAvailableMedia(
                        organizationId,
                        findAdminUserId()
                );

        UUID studentId =
                createStudent(organizationId);

        createStudentLink(
                organizationId,
                mediaId,
                studentId,
                findAdminUserId(),
                false
        );

        mockMvc.perform(
                        post(
                                "/api/v1/media/{mediaId}/links",
                                mediaId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "targetType": "STUDENT",
                                          "targetId": "%s",
                                          "caption": null,
                                          "coverMedia": false
                                        }
                                        """.formatted(
                                        studentId
                                ))
                )
                .andExpect(status().isConflict())
                .andExpect(
                        jsonPath("$.code")
                                .value(
                                        "RESOURCE_CONFLICT"
                                )
                );
    }

    @Test
    void secondCoverReplacesPreviousCover()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID organizationId =
                findOrganizationId();

        UUID adminUserId =
                findAdminUserId();

        UUID studentId =
                createStudent(organizationId);

        UUID firstMediaId =
                createAvailableMedia(
                        organizationId,
                        adminUserId
                );

        UUID secondMediaId =
                createAvailableMedia(
                        organizationId,
                        adminUserId
                );

        UUID firstLinkId = createStudentLink(
                organizationId,
                firstMediaId,
                studentId,
                adminUserId,
                true
        );

        mockMvc.perform(
                        post(
                                "/api/v1/media/{mediaId}/links",
                                secondMediaId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "targetType": "STUDENT",
                                          "targetId": "%s",
                                          "caption": "New cover",
                                          "coverMedia": true
                                        }
                                        """.formatted(
                                        studentId
                                ))
                )
                .andExpect(status().isCreated());

        Boolean previousCover =
                jdbcTemplate.queryForObject(
                        """
                        SELECT cover_media
                        FROM media_links
                        WHERE id = ?
                        """,
                        Boolean.class,
                        firstLinkId
                );

        org.assertj.core.api.Assertions
                .assertThat(previousCover)
                .isFalse();
    }

    @Test
    void foreignStudentCannotBeLinked()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID localOrganizationId =
                findOrganizationId();

        UUID mediaId =
                createAvailableMedia(
                        localOrganizationId,
                        findAdminUserId()
                );

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

        UUID foreignStudentId =
                createStudent(
                        foreignOrganizationId
                );

        mockMvc.perform(
                        post(
                                "/api/v1/media/{mediaId}/links",
                                mediaId
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "targetType": "STUDENT",
                                          "targetId": "%s",
                                          "caption": null,
                                          "coverMedia": false
                                        }
                                        """.formatted(
                                        foreignStudentId
                                ))
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void linkCanBeRemovedWithoutDeletingMedia()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        UUID organizationId =
                findOrganizationId();

        UUID mediaId =
                createAvailableMedia(
                        organizationId,
                        findAdminUserId()
                );

        UUID studentId =
                createStudent(organizationId);

        UUID linkId = createStudentLink(
                organizationId,
                mediaId,
                studentId,
                findAdminUserId(),
                false
        );

        mockMvc.perform(
                        delete(
                                "/api/v1/media/links/{linkId}",
                                linkId
                        )
                                .cookie(administrator)
                                .with(csrf())
                )
                .andExpect(status().isNoContent());

        String mediaStatus =
                jdbcTemplate.queryForObject(
                        """
                        SELECT status
                        FROM media_files
                        WHERE id = ?
                        """,
                        String.class,
                        mediaId
                );

        org.assertj.core.api.Assertions
                .assertThat(mediaStatus)
                .isEqualTo("AVAILABLE");
    }

    private UUID createAvailableMedia(
            UUID organizationId,
            UUID uploaderId
    ) {
        UUID mediaId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO media_files
                (
                    id,
                    organization_id,
                    storage_bucket,
                    storage_key,
                    original_filename,
                    content_type,
                    media_type,
                    status,
                    expected_size,
                    actual_size,
                    uploaded_by,
                    upload_completed_at,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, 'test-bucket', ?,
                    'test.jpg', 'image/jpeg',
                    'IMAGE', 'AVAILABLE',
                    100, 100, ?, ?, ?, ?, 0
                )
                """,
                mediaId,
                organizationId,
                organizationId
                        + "/"
                        + mediaId
                        + "/test.jpg",
                uploaderId,
                now,
                now,
                now
        );

        return mediaId;
    }

    private UUID createStudent(
            UUID organizationId
    ) {
        UUID studentId = UUID.randomUUID();

        String suffix = studentId.toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        jdbcTemplate.update(
                """
                INSERT INTO students
                (
                    id,
                    organization_id,
                    student_number,
                    first_name,
                    last_name,
                    status,
                    created_at,
                    updated_at,
                    version
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
                "STU-" + suffix
        );

        return studentId;
    }

    private UUID createStudentLink(
            UUID organizationId,
            UUID mediaId,
            UUID studentId,
            UUID linkedBy,
            boolean cover
    ) {
        UUID linkId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO media_links
                (
                    id,
                    organization_id,
                    media_id,
                    student_id,
                    caption,
                    cover_media,
                    linked_by,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, 'Test link',
                    ?, ?,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                linkId,
                organizationId,
                mediaId,
                studentId,
                cover,
                linkedBy
        );

        return linkId;
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
