package com.academy.platform.guardian;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ConflictException;
import com.academy.platform.common.ResourceNotFoundException;

@Service
public class GuardianService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public GuardianService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<GuardianResponse> findGuardians(
            UUID organizationId,
            String search,
            boolean includeArchived
    ) {
        String pattern = normalizeSearch(search);

        return jdbcTemplate.query(
                """
                SELECT
                    g.id,
                    g.membership_id,
                    om.user_id,
                    u.email,
                    om.display_first_name,
                    om.display_last_name,
                    g.guardian_number,
                    g.phone,
                    g.alternate_phone,
                    g.occupation,
                    g.address_line_1,
                    g.address_line_2,
                    g.city,
                    g.state_province,
                    g.postal_code,
                    g.country_code,
                    g.status,
                    g.notes,
                    g.created_at,
                    g.updated_at

                FROM guardians g

                JOIN organization_memberships om
                    ON om.id = g.membership_id
                   AND om.organization_id =
                       g.organization_id

                JOIN users u
                    ON u.id = om.user_id

                WHERE g.organization_id = ?
                  AND (
                      ? = TRUE
                      OR g.status <> 'ARCHIVED'
                  )
                  AND (
                      ? = '%%'
                      OR LOWER(u.email) LIKE ?
                      OR LOWER(
                          COALESCE(
                              g.guardian_number,
                              ''
                          )
                      ) LIKE ?
                      OR LOWER(
                          om.display_first_name
                      ) LIKE ?
                      OR LOWER(
                          om.display_last_name
                      ) LIKE ?
                      OR LOWER(
                          om.display_first_name
                          || ' '
                          || om.display_last_name
                      ) LIKE ?
                      OR LOWER(
                          COALESCE(g.phone, '')
                      ) LIKE ?
                  )

                ORDER BY
                    om.display_first_name,
                    om.display_last_name,
                    u.email
                """,
                (resultSet, rowNumber)
                -> mapGuardian(resultSet),
                organizationId,
                includeArchived,
                pattern,
                pattern,
                pattern,
                pattern,
                pattern,
                pattern,
                pattern
        );
    }

    @Transactional(readOnly = true)
    public GuardianResponse findGuardian(
            UUID organizationId,
            UUID guardianId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    g.id,
                    g.membership_id,
                    om.user_id,
                    u.email,
                    om.display_first_name,
                    om.display_last_name,
                    g.guardian_number,
                    g.phone,
                    g.alternate_phone,
                    g.occupation,
                    g.address_line_1,
                    g.address_line_2,
                    g.city,
                    g.state_province,
                    g.postal_code,
                    g.country_code,
                    g.status,
                    g.notes,
                    g.created_at,
                    g.updated_at

                FROM guardians g

                JOIN organization_memberships om
                    ON om.id = g.membership_id
                   AND om.organization_id =
                       g.organization_id

                JOIN users u
                    ON u.id = om.user_id

                WHERE g.id = ?
                  AND g.organization_id = ?
                """,
                (resultSet, rowNumber)
                -> mapGuardian(resultSet),
                guardianId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Guardian profile was not found."
                )
        );
    }

    @Transactional
    public GuardianResponse createGuardian(
            AuthenticatedUser actor,
            SaveGuardianRequest request
    ) {
        validateRequest(request);

        validateMembershipForGuardian(
                actor.organizationId(),
                request.membershipId()
        );

        ensureGuardianProfileDoesNotExist(
                actor.organizationId(),
                request.membershipId()
        );

        ensureGuardianNumberIsUnique(
                actor.organizationId(),
                null,
                request.guardianNumber()
        );

        UUID guardianId = UUID.randomUUID();

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO guardians
                (
                    id,
                    organization_id,
                    membership_id,
                    guardian_number,
                    phone,
                    alternate_phone,
                    occupation,
                    address_line_1,
                    address_line_2,
                    city,
                    state_province,
                    postal_code,
                    country_code,
                    status,
                    notes,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'ACTIVE',
                    ?,
                    ?,
                    ?,
                    0
                )
                """,
                guardianId,
                actor.organizationId(),
                request.membershipId(),
                normalizeUpperNullable(
                        request.guardianNumber()
                ),
                normalizeNullable(request.phone()),
                normalizeNullable(
                        request.alternatePhone()
                ),
                normalizeNullable(
                        request.occupation()
                ),
                normalizeNullable(
                        request.addressLine1()
                ),
                normalizeNullable(
                        request.addressLine2()
                ),
                normalizeNullable(request.city()),
                normalizeNullable(
                        request.stateProvince()
                ),
                normalizeNullable(
                        request.postalCode()
                ),
                normalizeUpperNullable(
                        request.countryCode()
                ),
                normalizeNullable(request.notes()),
                now,
                now
        );

        auditService.record(
                actor,
                "GUARDIAN_PROFILE_CREATED",
                "GUARDIAN",
                guardianId,
                "Guardian profile created."
        );

        return findGuardian(
                actor.organizationId(),
                guardianId
        );
    }

    @Transactional
    public GuardianResponse updateGuardian(
            AuthenticatedUser actor,
            UUID guardianId,
            SaveGuardianRequest request
    ) {
        GuardianResponse existing = findGuardian(
                actor.organizationId(),
                guardianId
        );

        validateRequest(request);

        if (!existing.membershipId()
                .equals(request.membershipId())) {
            throw new BusinessRuleException(
                    "The account linked to a guardian profile "
                    + "cannot be changed."
            );
        }

        validateMembershipForGuardian(
                actor.organizationId(),
                request.membershipId()
        );

        ensureGuardianNumberIsUnique(
                actor.organizationId(),
                guardianId,
                request.guardianNumber()
        );

        jdbcTemplate.update(
                """
                UPDATE guardians
                SET
                    guardian_number = ?,
                    phone = ?,
                    alternate_phone = ?,
                    occupation = ?,
                    address_line_1 = ?,
                    address_line_2 = ?,
                    city = ?,
                    state_province = ?,
                    postal_code = ?,
                    country_code = ?,
                    notes = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                normalizeUpperNullable(
                        request.guardianNumber()
                ),
                normalizeNullable(request.phone()),
                normalizeNullable(
                        request.alternatePhone()
                ),
                normalizeNullable(
                        request.occupation()
                ),
                normalizeNullable(
                        request.addressLine1()
                ),
                normalizeNullable(
                        request.addressLine2()
                ),
                normalizeNullable(request.city()),
                normalizeNullable(
                        request.stateProvince()
                ),
                normalizeNullable(
                        request.postalCode()
                ),
                normalizeUpperNullable(
                        request.countryCode()
                ),
                normalizeNullable(request.notes()),
                OffsetDateTime.now(ZoneOffset.UTC),
                guardianId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "GUARDIAN_PROFILE_UPDATED",
                "GUARDIAN",
                guardianId,
                "Guardian profile updated."
        );

        return findGuardian(
                actor.organizationId(),
                guardianId
        );
    }

    @Transactional
    public void updateGuardianStatus(
            AuthenticatedUser actor,
            UUID guardianId,
            GuardianStatus status
    ) {
        GuardianResponse existing = findGuardian(
                actor.organizationId(),
                guardianId
        );

        jdbcTemplate.update(
                """
                UPDATE guardians
                SET
                    status = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                status.name(),
                OffsetDateTime.now(ZoneOffset.UTC),
                guardianId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "GUARDIAN_STATUS_UPDATED",
                "GUARDIAN",
                guardianId,
                "Guardian status changed from "
                + existing.status()
                + " to " + status
        );
    }

    private void validateRequest(
            SaveGuardianRequest request
    ) {
        if (request.membershipId() == null) {
            throw new BusinessRuleException(
                    "A guardian account must be selected."
            );
        }
    }

    private void validateMembershipForGuardian(
            UUID organizationId,
            UUID membershipId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)

                FROM organization_memberships om

                JOIN membership_roles mr
                    ON mr.membership_id = om.id

                JOIN roles r
                    ON r.id = mr.role_id
                   AND r.organization_id =
                       om.organization_id

                WHERE om.id = ?
                  AND om.organization_id = ?
                  AND om.status IN ('ACTIVE', 'INVITED')
                  AND r.name = 'GUARDIAN'
                """,
                Integer.class,
                membershipId,
                organizationId
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected account is not a valid "
                    + "guardian account for this "
                    + "organization."
            );
        }
    }

    private void ensureGuardianProfileDoesNotExist(
            UUID organizationId,
            UUID membershipId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM guardians
                WHERE organization_id = ?
                  AND membership_id = ?
                """,
                Integer.class,
                organizationId,
                membershipId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A guardian profile already exists for "
                    + "the selected account."
            );
        }
    }

    private void ensureGuardianNumberIsUnique(
            UUID organizationId,
            UUID excludedGuardianId,
            String guardianNumber
    ) {
        String normalized
                = normalizeUpperNullable(guardianNumber);

        if (normalized == null) {
            return;
        }

        Integer count;

        if (excludedGuardianId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM guardians
                    WHERE organization_id = ?
                      AND LOWER(guardian_number) =
                          LOWER(?)
                    """,
                    Integer.class,
                    organizationId,
                    normalized
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM guardians
                    WHERE organization_id = ?
                      AND LOWER(guardian_number) =
                          LOWER(?)
                      AND id <> ?
                    """,
                    Integer.class,
                    organizationId,
                    normalized,
                    excludedGuardianId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A guardian with this guardian number "
                    + "already exists."
            );
        }
    }

    private GuardianResponse mapGuardian(
            ResultSet resultSet
    ) throws SQLException {
        return new GuardianResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "membership_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "user_id",
                        UUID.class
                ),
                resultSet.getString("email"),
                resultSet.getString(
                        "display_first_name"
                ),
                resultSet.getString(
                        "display_last_name"
                ),
                resultSet.getString(
                        "guardian_number"
                ),
                resultSet.getString("phone"),
                resultSet.getString(
                        "alternate_phone"
                ),
                resultSet.getString("occupation"),
                resultSet.getString(
                        "address_line_1"
                ),
                resultSet.getString(
                        "address_line_2"
                ),
                resultSet.getString("city"),
                resultSet.getString(
                        "state_province"
                ),
                resultSet.getString("postal_code"),
                resultSet.getString("country_code"),
                GuardianStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getString("notes"),
                resultSet.getObject(
                        "created_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "updated_at",
                        OffsetDateTime.class
                )
        );
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return "%%";
        }

        return "%"
                + search.trim().toLowerCase()
                + "%";
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String normalizeUpperNullable(
            String value
    ) {
        String normalized = normalizeNullable(value);

        return normalized == null
                ? null
                : normalized.toUpperCase(Locale.ROOT);
    }
}
