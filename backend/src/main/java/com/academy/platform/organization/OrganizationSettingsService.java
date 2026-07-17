package com.academy.platform.organization;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationSettingsService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public OrganizationSettingsService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public OrganizationSettingsResponse getSettings(
            UUID organizationId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    name,
                    slug,
                    default_locale,
                    timezone,

                    COALESCE(
                        settings #>>
                            '{terminology,studentLabel}',
                        'Student'
                    ) AS student_label,

                    COALESCE(
                        settings #>>
                            '{terminology,staffLabel}',
                        'Instructor'
                    ) AS staff_label,

                    COALESCE(
                        settings #>>
                            '{terminology,groupLabel}',
                        'Group'
                    ) AS group_label,

                    COALESCE(
                        settings #>>
                            '{terminology,sessionLabel}',
                        'Session'
                    ) AS session_label,

                    COALESCE(
                        settings #>>
                            '{terminology,programLabel}',
                        'Program'
                    ) AS program_label

                FROM organizations
                WHERE id = ?
                """,
                (resultSet, rowNumber) ->
                        new OrganizationSettingsResponse(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getString("name"),
                                resultSet.getString("slug"),
                                resultSet.getString(
                                        "default_locale"
                                ),
                                resultSet.getString("timezone"),
                                new OrganizationTerminologyResponse(
                                        resultSet.getString(
                                                "student_label"
                                        ),
                                        resultSet.getString(
                                                "staff_label"
                                        ),
                                        resultSet.getString(
                                                "group_label"
                                        ),
                                        resultSet.getString(
                                                "session_label"
                                        ),
                                        resultSet.getString(
                                                "program_label"
                                        )
                                )
                        ),
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Organization was not found."
                )
        );
    }

    @Transactional
    public OrganizationSettingsResponse updateSettings(
            AuthenticatedUser actor,
            UpdateOrganizationSettingsRequest request
    ) {
        validateTimezone(request.timezone());

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE organizations
                SET
                    name = ?,
                    default_locale = ?,
                    timezone = ?,

                    settings = jsonb_set(
                        COALESCE(settings, '{}'::jsonb),
                        '{terminology}',
                        jsonb_build_object(
                            'studentLabel', ?,
                            'staffLabel', ?,
                            'groupLabel', ?,
                            'sessionLabel', ?,
                            'programLabel', ?
                        ),
                        TRUE
                    ),

                    updated_at = ?,
                    version = version + 1

                WHERE id = ?
                """,
                request.name().trim(),
                request.defaultLocale().trim(),
                request.timezone().trim(),
                request.terminology()
                        .studentLabel()
                        .trim(),
                request.terminology()
                        .staffLabel()
                        .trim(),
                request.terminology()
                        .groupLabel()
                        .trim(),
                request.terminology()
                        .sessionLabel()
                        .trim(),
                request.terminology()
                        .programLabel()
                        .trim(),
                now,
                actor.organizationId()
        );

        if (updatedRows == 0) {
            throw new ResourceNotFoundException(
                    "Organization was not found."
            );
        }

        auditService.record(
                actor,
                "ORGANIZATION_SETTINGS_UPDATED",
                "ORGANIZATION",
                actor.organizationId(),
                "Organization settings were updated."
        );

        return getSettings(actor.organizationId());
    }

    private void validateTimezone(String timezone) {
        try {
            ZoneId.of(timezone.trim());
        } catch (Exception exception) {
            throw new BusinessRuleException(
                    "The selected timezone is invalid."
            );
        }
    }
}
