package com.academy.platform.branch;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ConflictException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BranchService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public BranchService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> findBranches(
            UUID organizationId,
            boolean includeArchived
    ) {
        String sql = includeArchived
                ? """
                  SELECT *
                  FROM branches
                  WHERE organization_id = ?
                  ORDER BY name
                  """
                : """
                  SELECT *
                  FROM branches
                  WHERE organization_id = ?
                    AND status <> 'ARCHIVED'
                  ORDER BY name
                  """;

        return jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) ->
                        mapBranch(resultSet),
                organizationId
        );
    }

    @Transactional(readOnly = true)
    public BranchResponse findBranch(
            UUID organizationId,
            UUID branchId
    ) {
        return jdbcTemplate.query(
                """
                SELECT *
                FROM branches
                WHERE id = ?
                  AND organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapBranch(resultSet),
                branchId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Branch was not found."
                )
        );
    }

    @Transactional
    public BranchResponse createBranch(
            AuthenticatedUser actor,
            SaveBranchRequest request
    ) {
        validateTimezone(request.timezone());
        validateUniqueness(
                actor.organizationId(),
                null,
                request.code(),
                request.name()
        );

        UUID branchId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO branches
                (
                    id,
                    organization_id,
                    code,
                    name,
                    status,
                    email,
                    phone,
                    address_line_1,
                    address_line_2,
                    city,
                    state_province,
                    postal_code,
                    country_code,
                    timezone,
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
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    0
                )
                """,
                branchId,
                actor.organizationId(),
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(request.email()),
                normalizeNullable(request.phone()),
                normalizeNullable(request.addressLine1()),
                normalizeNullable(request.addressLine2()),
                normalizeNullable(request.city()),
                normalizeNullable(request.stateProvince()),
                normalizeNullable(request.postalCode()),
                normalizeCountryCode(request.countryCode()),
                request.timezone().trim(),
                now,
                now
        );

        auditService.record(
                actor,
                "BRANCH_CREATED",
                "BRANCH",
                branchId,
                "Branch created: " + request.name().trim()
        );

        return findBranch(
                actor.organizationId(),
                branchId
        );
    }

    @Transactional
    public BranchResponse updateBranch(
            AuthenticatedUser actor,
            UUID branchId,
            SaveBranchRequest request
    ) {
        findBranch(actor.organizationId(), branchId);

        validateTimezone(request.timezone());
        validateUniqueness(
                actor.organizationId(),
                branchId,
                request.code(),
                request.name()
        );

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE branches
                SET
                    code = ?,
                    name = ?,
                    email = ?,
                    phone = ?,
                    address_line_1 = ?,
                    address_line_2 = ?,
                    city = ?,
                    state_province = ?,
                    postal_code = ?,
                    country_code = ?,
                    timezone = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                normalizeCode(request.code()),
                request.name().trim(),
                normalizeNullable(request.email()),
                normalizeNullable(request.phone()),
                normalizeNullable(request.addressLine1()),
                normalizeNullable(request.addressLine2()),
                normalizeNullable(request.city()),
                normalizeNullable(request.stateProvince()),
                normalizeNullable(request.postalCode()),
                normalizeCountryCode(request.countryCode()),
                request.timezone().trim(),
                OffsetDateTime.now(ZoneOffset.UTC),
                branchId,
                actor.organizationId()
        );

        if (updatedRows == 0) {
            throw new ResourceNotFoundException(
                    "Branch was not found."
            );
        }

        auditService.record(
                actor,
                "BRANCH_UPDATED",
                "BRANCH",
                branchId,
                "Branch updated: " + request.name().trim()
        );

        return findBranch(
                actor.organizationId(),
                branchId
        );
    }

    @Transactional
    public void archiveBranch(
            AuthenticatedUser actor,
            UUID branchId
    ) {
        BranchResponse branch = findBranch(
                actor.organizationId(),
                branchId
        );

        if (branch.status() == BranchStatus.ARCHIVED) {
            return;
        }

        jdbcTemplate.update(
                """
                UPDATE branches
                SET
                    status = 'ARCHIVED',
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                OffsetDateTime.now(ZoneOffset.UTC),
                branchId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "BRANCH_ARCHIVED",
                "BRANCH",
                branchId,
                "Branch archived: " + branch.name()
        );
    }

    @Transactional
    public void activateBranch(
            AuthenticatedUser actor,
            UUID branchId
    ) {
        BranchResponse branch = findBranch(
                actor.organizationId(),
                branchId
        );

        if (branch.status() == BranchStatus.ACTIVE) {
            return;
        }

        jdbcTemplate.update(
                """
                UPDATE branches
                SET
                    status = 'ACTIVE',
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                OffsetDateTime.now(ZoneOffset.UTC),
                branchId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "BRANCH_ACTIVATED",
                "BRANCH",
                branchId,
                "Branch activated: " + branch.name()
        );
    }

    private BranchResponse mapBranch(
            java.sql.ResultSet resultSet
    ) throws java.sql.SQLException {
        return new BranchResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("code"),
                resultSet.getString("name"),
                BranchStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getString("email"),
                resultSet.getString("phone"),
                resultSet.getString("address_line_1"),
                resultSet.getString("address_line_2"),
                resultSet.getString("city"),
                resultSet.getString("state_province"),
                resultSet.getString("postal_code"),
                resultSet.getString("country_code"),
                resultSet.getString("timezone"),
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

    private void validateUniqueness(
            UUID organizationId,
            UUID excludedBranchId,
            String code,
            String name
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM branches
                WHERE organization_id = ?
                  AND (
                      LOWER(code) = LOWER(?)
                      OR LOWER(name) = LOWER(?)
                  )
                  AND (
                      ?::UUID IS NULL
                      OR id <> ?::UUID
                  )
                """,
                Integer.class,
                organizationId,
                normalizeCode(code),
                name.trim(),
                excludedBranchId,
                excludedBranchId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A branch with this code or name "
                            + "already exists."
            );
        }
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

    private String normalizeCode(String code) {
        return code.trim().toUpperCase();
    }

    private String normalizeCountryCode(
            String countryCode
    ) {
        String value = normalizeNullable(countryCode);

        return value == null
                ? null
                : value.toUpperCase();
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
