package com.academy.platform.scheduling;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
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
public class ScheduleRuleService {

    private static final long MAX_GENERATION_DAYS = 366;

    private final JdbcTemplate jdbcTemplate;
    private final SessionService sessionService;
    private final AuditService auditService;

    public ScheduleRuleService(
            JdbcTemplate jdbcTemplate,
            SessionService sessionService,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.sessionService = sessionService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ScheduleRuleResponse> findRules(
            UUID organizationId,
            UUID groupId,
            boolean includeArchived
    ) {
        validateGroup(
                organizationId,
                groupId
        );

        return jdbcTemplate.query(
                """
                SELECT
                    sr.id,
                    sr.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    sr.curriculum_assignment_id,
                    sr.curriculum_id,
                    sr.curriculum_unit_id,
                    cu.code AS curriculum_unit_code,
                    cu.title AS curriculum_unit_title,
                    sr.lead_staff_id,

                    CASE
                        WHEN sm.id IS NULL THEN NULL
                        ELSE CONCAT(
                            om.display_first_name,
                            ' ',
                            om.display_last_name
                        )
                    END AS lead_staff_name,

                    sr.title,
                    sr.description,
                    sr.day_of_week,
                    sr.start_time,
                    sr.end_time,
                    sr.effective_from,
                    sr.effective_until,
                    sr.timezone,
                    sr.location,
                    sr.status,
                    sr.created_at,
                    sr.updated_at

                FROM schedule_rules sr

                JOIN academy_groups ag
                    ON ag.id = sr.group_id
                   AND ag.organization_id =
                       sr.organization_id

                LEFT JOIN curriculum_units cu
                    ON cu.id = sr.curriculum_unit_id
                   AND cu.curriculum_id =
                       sr.curriculum_id
                   AND cu.organization_id =
                       sr.organization_id

                LEFT JOIN staff_members sm
                    ON sm.id = sr.lead_staff_id
                   AND sm.organization_id =
                       sr.organization_id

                LEFT JOIN organization_memberships om
                    ON om.id = sm.membership_id
                   AND om.organization_id =
                       sm.organization_id

                WHERE sr.organization_id = ?
                  AND sr.group_id = ?
                  AND (
                      ? = TRUE
                      OR sr.status <> 'ARCHIVED'
                  )

                ORDER BY
                    sr.day_of_week,
                    sr.start_time,
                    sr.title
                """,
                (resultSet, rowNumber) ->
                        mapRule(resultSet),
                organizationId,
                groupId,
                includeArchived
        );
    }

    @Transactional
    public ScheduleRuleResponse createRule(
            AuthenticatedUser actor,
            UUID groupId,
            SaveScheduleRuleRequest request
    ) {
        validateRequest(
                actor.organizationId(),
                groupId,
                request
        );

        CurriculumReference curriculum =
                resolveCurriculumReference(
                        actor.organizationId(),
                        groupId,
                        request.curriculumUnitId()
                );

        validateStaffAssignment(
                actor.organizationId(),
                groupId,
                request.leadStaffId(),
                request.effectiveFrom()
        );

        ensureNoOverlappingRule(
                actor.organizationId(),
                groupId,
                null,
                request
        );

        UUID ruleId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO schedule_rules
                (
                    id,
                    organization_id,
                    group_id,
                    curriculum_assignment_id,
                    curriculum_id,
                    curriculum_unit_id,
                    lead_staff_id,
                    title,
                    description,
                    day_of_week,
                    start_time,
                    end_time,
                    effective_from,
                    effective_until,
                    timezone,
                    location,
                    status,
                    created_by,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 0
                )
                """,
                ruleId,
                actor.organizationId(),
                groupId,
                curriculum.assignmentId(),
                curriculum.curriculumId(),
                request.curriculumUnitId(),
                request.leadStaffId(),
                request.title().trim(),
                normalizeNullable(request.description()),
                request.dayOfWeek(),
                request.startTime(),
                request.endTime(),
                request.effectiveFrom(),
                request.effectiveUntil(),
                request.timezone().trim(),
                normalizeNullable(request.location()),
                actor.userId(),
                now,
                now
        );

        auditService.record(
                actor,
                "SCHEDULE_RULE_CREATED",
                "SCHEDULE_RULE",
                ruleId,
                "Schedule rule created for group "
                        + groupId
        );

        return findRule(
                actor.organizationId(),
                groupId,
                ruleId
        );
    }

    @Transactional
    public ScheduleRuleResponse updateRule(
            AuthenticatedUser actor,
            UUID groupId,
            UUID ruleId,
            SaveScheduleRuleRequest request
    ) {
        ScheduleRuleResponse existing = findRule(
                actor.organizationId(),
                groupId,
                ruleId
        );

        if (existing.status()
                == ScheduleRuleStatus.ARCHIVED) {
            throw new BusinessRuleException(
                    "An archived schedule rule cannot be updated."
            );
        }

        validateRequest(
                actor.organizationId(),
                groupId,
                request
        );

        CurriculumReference curriculum =
                resolveCurriculumReference(
                        actor.organizationId(),
                        groupId,
                        request.curriculumUnitId()
                );

        validateStaffAssignment(
                actor.organizationId(),
                groupId,
                request.leadStaffId(),
                request.effectiveFrom()
        );

        ensureNoOverlappingRule(
                actor.organizationId(),
                groupId,
                ruleId,
                request
        );

        jdbcTemplate.update(
                """
                UPDATE schedule_rules
                SET
                    curriculum_assignment_id = ?,
                    curriculum_id = ?,
                    curriculum_unit_id = ?,
                    lead_staff_id = ?,
                    title = ?,
                    description = ?,
                    day_of_week = ?,
                    start_time = ?,
                    end_time = ?,
                    effective_from = ?,
                    effective_until = ?,
                    timezone = ?,
                    location = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND group_id = ?
                  AND organization_id = ?
                """,
                curriculum.assignmentId(),
                curriculum.curriculumId(),
                request.curriculumUnitId(),
                request.leadStaffId(),
                request.title().trim(),
                normalizeNullable(request.description()),
                request.dayOfWeek(),
                request.startTime(),
                request.endTime(),
                request.effectiveFrom(),
                request.effectiveUntil(),
                request.timezone().trim(),
                normalizeNullable(request.location()),
                OffsetDateTime.now(ZoneOffset.UTC),
                ruleId,
                groupId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "SCHEDULE_RULE_UPDATED",
                "SCHEDULE_RULE",
                ruleId,
                "Schedule rule updated."
        );

        return findRule(
                actor.organizationId(),
                groupId,
                ruleId
        );
    }

    @Transactional
    public void updateStatus(
            AuthenticatedUser actor,
            UUID groupId,
            UUID ruleId,
            ScheduleRuleStatus status
    ) {
        ScheduleRuleResponse existing = findRule(
                actor.organizationId(),
                groupId,
                ruleId
        );

        if (existing.status()
                == ScheduleRuleStatus.ARCHIVED) {
            throw new BusinessRuleException(
                    "An archived schedule rule cannot change status."
            );
        }

        jdbcTemplate.update(
                """
                UPDATE schedule_rules
                SET
                    status = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND group_id = ?
                  AND organization_id = ?
                """,
                status.name(),
                OffsetDateTime.now(ZoneOffset.UTC),
                ruleId,
                groupId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "SCHEDULE_RULE_STATUS_UPDATED",
                "SCHEDULE_RULE",
                ruleId,
                "Schedule rule status changed to " + status
        );
    }

    @Transactional
    public SessionGenerationResponse generateSessions(
            AuthenticatedUser actor,
            UUID groupId,
            UUID ruleId,
            GenerateSessionsRequest request
    ) {
        ScheduleRuleResponse rule = findRule(
                actor.organizationId(),
                groupId,
                ruleId
        );

        if (rule.status()
                != ScheduleRuleStatus.ACTIVE) {
            throw new BusinessRuleException(
                    "Sessions can only be generated from "
                            + "an active schedule rule."
            );
        }

        validateGenerationRange(request);

        LocalDate effectiveStart = maximum(
                request.dateFrom(),
                rule.effectiveFrom()
        );

        LocalDate effectiveEnd = minimum(
                request.dateTo(),
                rule.effectiveUntil()
        );

        if (effectiveEnd.isBefore(effectiveStart)) {
            return new SessionGenerationResponse(
                    ruleId,
                    request.dateFrom(),
                    request.dateTo(),
                    0,
                    0,
                    0,
                    List.of()
            );
        }

        ZoneId timezone = ZoneId.of(rule.timezone());

        List<SessionResponse> generated = new ArrayList<>();
        int matchedDates = 0;

        LocalDate date = effectiveStart;

        while (!date.isAfter(effectiveEnd)) {
            if (date.getDayOfWeek().getValue()
                    == rule.dayOfWeek()) {
                matchedDates++;

                OffsetDateTime start =
                        LocalDateTime.of(
                                date,
                                rule.startTime()
                        )
                        .atZone(timezone)
                        .toOffsetDateTime();

                OffsetDateTime end =
                        LocalDateTime.of(
                                date,
                                rule.endTime()
                        )
                        .atZone(timezone)
                        .toOffsetDateTime();

                SessionResponse session =
                        sessionService.createGeneratedSession(
                                actor,
                                rule,
                                start,
                                end
                        );

                if (session != null) {
                    generated.add(session);
                }
            }

            date = date.plusDays(1);
        }

        auditService.record(
                actor,
                "SESSIONS_GENERATED",
                "SCHEDULE_RULE",
                ruleId,
                generated.size()
                        + " sessions generated."
        );

        return new SessionGenerationResponse(
                ruleId,
                request.dateFrom(),
                request.dateTo(),
                matchedDates,
                generated.size(),
                matchedDates - generated.size(),
                generated
        );
    }

    @Transactional(readOnly = true)
    public ScheduleRuleResponse findRule(
            UUID organizationId,
            UUID groupId,
            UUID ruleId
    ) {
        return findRules(
                organizationId,
                groupId,
                true
        )
                .stream()
                .filter(rule -> rule.id().equals(ruleId))
                .findFirst()
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Schedule rule was not found."
                        )
                );
    }

    private void validateRequest(
            UUID organizationId,
            UUID groupId,
            SaveScheduleRuleRequest request
    ) {
        GroupTermRecord group = validateGroup(
                organizationId,
                groupId
        );

        if (!request.endTime()
                .isAfter(request.startTime())) {
            throw new BusinessRuleException(
                    "Schedule end time must be after start time."
            );
        }

        if (request.effectiveUntil()
                .isBefore(request.effectiveFrom())) {
            throw new BusinessRuleException(
                    "Schedule effective end date cannot be "
                            + "before its start date."
            );
        }

        if (request.effectiveFrom()
                .isBefore(group.termStart())
                || request.effectiveUntil()
                .isAfter(group.termEnd())) {
            throw new BusinessRuleException(
                    "Schedule dates must be within "
                            + "the group's term."
            );
        }

        try {
            ZoneId.of(request.timezone().trim());
        } catch (Exception exception) {
            throw new BusinessRuleException(
                    "The selected timezone is invalid."
            );
        }
    }

    private GroupTermRecord validateGroup(
            UUID organizationId,
            UUID groupId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    ag.status,
                    ot.start_date,
                    ot.end_date
                FROM academy_groups ag
                JOIN operational_terms ot
                  ON ot.id = ag.term_id
                 AND ot.organization_id =
                     ag.organization_id
                WHERE ag.id = ?
                  AND ag.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        new GroupTermRecord(
                                resultSet.getString("status"),
                                resultSet.getObject(
                                        "start_date",
                                        LocalDate.class
                                ),
                                resultSet.getObject(
                                        "end_date",
                                        LocalDate.class
                                )
                        ),
                groupId,
                organizationId
        ).stream().findFirst().map(group -> {
            if (!group.status().equals("DRAFT")
                    && !group.status().equals("ACTIVE")) {
                throw new BusinessRuleException(
                        "Schedule rules can only be managed "
                                + "for draft or active groups."
                );
            }

            return group;
        }).orElseThrow(
                () -> new ResourceNotFoundException(
                        "Group was not found."
                )
        );
    }

    private CurriculumReference resolveCurriculumReference(
            UUID organizationId,
            UUID groupId,
            UUID unitId
    ) {
        if (unitId == null) {
            return CurriculumReference.empty();
        }

        return jdbcTemplate.query(
                """
                SELECT
                    gca.id AS assignment_id,
                    gca.curriculum_id
                FROM group_curriculum_assignments gca
                JOIN curriculum_units cu
                  ON cu.curriculum_id =
                     gca.curriculum_id
                 AND cu.organization_id =
                     gca.organization_id
                WHERE gca.organization_id = ?
                  AND gca.group_id = ?
                  AND gca.status = 'ACTIVE'
                  AND cu.id = ?
                """,
                (resultSet, rowNumber) ->
                        new CurriculumReference(
                                resultSet.getObject(
                                        "assignment_id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "curriculum_id",
                                        UUID.class
                                )
                        ),
                organizationId,
                groupId,
                unitId
        ).stream().findFirst().orElseThrow(
                () -> new BusinessRuleException(
                        "The curriculum unit does not belong "
                                + "to the group's active curriculum."
                )
        );
    }

    private void validateStaffAssignment(
            UUID organizationId,
            UUID groupId,
            UUID staffId,
            LocalDate effectiveDate
    ) {
        if (staffId == null) {
            return;
        }

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_staff_assignments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND staff_id = ?
                  AND status = 'ACTIVE'
                  AND start_date <= ?
                  AND (
                      end_date IS NULL
                      OR end_date >= ?
                  )
                """,
                Integer.class,
                organizationId,
                groupId,
                staffId,
                effectiveDate,
                effectiveDate
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected instructor is not actively "
                            + "assigned to the group."
            );
        }
    }

    private void ensureNoOverlappingRule(
            UUID organizationId,
            UUID groupId,
            UUID excludedRuleId,
            SaveScheduleRuleRequest request
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM schedule_rules
                WHERE organization_id = ?
                  AND group_id = ?
                  AND status = 'ACTIVE'
                  AND day_of_week = ?
                  AND effective_from <= ?
                  AND effective_until >= ?
                  AND start_time < ?
                  AND end_time > ?
                  AND (
                      ?::UUID IS NULL
                      OR id <> ?::UUID
                  )
                """,
                Integer.class,
                organizationId,
                groupId,
                request.dayOfWeek(),
                request.effectiveUntil(),
                request.effectiveFrom(),
                request.endTime(),
                request.startTime(),
                excludedRuleId,
                excludedRuleId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "This schedule overlaps another active "
                            + "rule for the group."
            );
        }
    }

    private void validateGenerationRange(
            GenerateSessionsRequest request
    ) {
        if (request.dateTo()
                .isBefore(request.dateFrom())) {
            throw new BusinessRuleException(
                    "Generation end date cannot be before "
                            + "the start date."
            );
        }

        long days = java.time.temporal.ChronoUnit.DAYS
                .between(
                        request.dateFrom(),
                        request.dateTo()
                );

        if (days > MAX_GENERATION_DAYS) {
            throw new BusinessRuleException(
                    "A maximum of 366 days can be generated "
                            + "in one request."
            );
        }
    }

    private ScheduleRuleResponse mapRule(
            ResultSet resultSet
    ) throws SQLException {
        return new ScheduleRuleResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getString("group_code"),
                resultSet.getString("group_name"),
                resultSet.getObject(
                        "curriculum_assignment_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "curriculum_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "curriculum_unit_id",
                        UUID.class
                ),
                resultSet.getString(
                        "curriculum_unit_code"
                ),
                resultSet.getString(
                        "curriculum_unit_title"
                ),
                resultSet.getObject(
                        "lead_staff_id",
                        UUID.class
                ),
                resultSet.getString("lead_staff_name"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getInt("day_of_week"),
                resultSet.getObject(
                        "start_time",
                        java.time.LocalTime.class
                ),
                resultSet.getObject(
                        "end_time",
                        java.time.LocalTime.class
                ),
                resultSet.getObject(
                        "effective_from",
                        LocalDate.class
                ),
                resultSet.getObject(
                        "effective_until",
                        LocalDate.class
                ),
                resultSet.getString("timezone"),
                resultSet.getString("location"),
                ScheduleRuleStatus.valueOf(
                        resultSet.getString("status")
                ),
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

    private LocalDate maximum(
            LocalDate first,
            LocalDate second
    ) {
        return first.isAfter(second) ? first : second;
    }

    private LocalDate minimum(
            LocalDate first,
            LocalDate second
    ) {
        return first.isBefore(second) ? first : second;
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private record GroupTermRecord(
            String status,
            LocalDate termStart,
            LocalDate termEnd
    ) {
    }

    private record CurriculumReference(
            UUID assignmentId,
            UUID curriculumId
    ) {
        static CurriculumReference empty() {
            return new CurriculumReference(null, null);
        }
    }
}
