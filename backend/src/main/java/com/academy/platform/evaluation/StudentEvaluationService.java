package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ResourceNotFoundException;

@Service
public class StudentEvaluationService {

    private static final BigDecimal ONE_HUNDRED
            = new BigDecimal("100.00");

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public StudentEvaluationService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<StudentEvaluationSummaryResponse>
            findEvaluations(
                    AuthenticatedUser actor,
                    UUID studentId,
                    UUID groupId,
                    UUID sessionId,
                    StudentEvaluationStatus status,
                    LocalDate dateFrom,
                    LocalDate dateTo
            ) {
        validateDateRange(dateFrom, dateTo);

        StringBuilder sql = new StringBuilder(
                """
                SELECT
                    se.id,
                    se.student_id,
                    s.student_number,
                    s.first_name AS student_first_name,
                    s.last_name AS student_last_name,

                    se.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,

                    se.session_id,
                    ls.title AS session_title,

                    se.template_id,
                    et.name AS template_name,
                    et.version_label AS template_version,

                    se.evaluation_date,
                    se.overall_score,
                    se.status,

                    CONCAT(
                        evaluator_membership.display_first_name,
                        ' ',
                        evaluator_membership.display_last_name
                    ) AS evaluator_name,

                    se.submitted_at,
                    se.published_at

                FROM student_evaluations se

                JOIN students s
                    ON s.id = se.student_id
                   AND s.organization_id =
                       se.organization_id

                JOIN academy_groups ag
                    ON ag.id = se.group_id
                   AND ag.organization_id =
                       se.organization_id

                JOIN evaluation_templates et
                    ON et.id = se.template_id
                   AND et.organization_id =
                       se.organization_id

                LEFT JOIN lesson_sessions ls
                    ON ls.id = se.session_id
                   AND ls.organization_id =
                       se.organization_id

                LEFT JOIN organization_memberships
                    evaluator_membership
                    ON evaluator_membership.user_id =
                       se.evaluator_user_id
                   AND evaluator_membership.organization_id =
                       se.organization_id

                WHERE se.organization_id = ?
                """
        );

        List<Object> parameters
                = new java.util.ArrayList<>();

        parameters.add(actor.organizationId());

        if (studentId != null) {
            sql.append(
                    """
                     AND se.student_id = ?
                     """
            );

            parameters.add(studentId);
        }

        if (groupId != null) {
            sql.append(
                    """
                     AND se.group_id = ?
                     """
            );

            parameters.add(groupId);
        }

        if (sessionId != null) {
            sql.append(
                    """
                     AND se.session_id = ?
                     """
            );

            parameters.add(sessionId);
        }

        if (status != null) {
            sql.append(
                    """
                     AND se.status = ?
                     """
            );

            parameters.add(status.name());
        }

        if (dateFrom != null) {
            sql.append(
                    """
                     AND se.evaluation_date >= ?
                     """
            );

            parameters.add(dateFrom);
        }

        if (dateTo != null) {
            sql.append(
                    """
                     AND se.evaluation_date <= ?
                     """
            );

            parameters.add(dateTo);
        }

        if (!isOrganizationAdministrator(actor)) {
            UUID staffId = findCurrentStaffId(actor);

            sql.append(
                    """
                    AND EXISTS
                    (
                        SELECT 1
                        FROM group_staff_assignments gsa
                        WHERE gsa.organization_id =
                                  se.organization_id

                          AND gsa.group_id = se.group_id

                          AND gsa.staff_id = ?

                          AND gsa.status <> 'CANCELLED'

                          AND gsa.start_date <=
                              se.evaluation_date

                          AND (
                              gsa.end_date IS NULL
                              OR gsa.end_date >=
                                 se.evaluation_date
                          )
                    )
                    """
            );

            parameters.add(staffId);
        }

        sql.append(
                """
                ORDER BY
                    se.evaluation_date DESC,
                    se.created_at DESC
                """
        );

        return jdbcTemplate.query(
                sql.toString(),
                (resultSet, rowNumber)
                -> mapEvaluationSummary(resultSet),
                parameters.toArray()
        );
    }

    @Transactional(readOnly = true)
    public StudentEvaluationResponse findEvaluation(
            AuthenticatedUser actor,
            UUID evaluationId
    ) {
        EvaluationRecord evaluation
                = findEvaluationRecord(
                        actor.organizationId(),
                        evaluationId
                );

        validateEvaluationAccess(
                actor,
                evaluation.groupId(),
                evaluation.evaluationDate()
        );

        List<StudentEvaluationScoreResponse> scores
                = findScores(
                        actor.organizationId(),
                        evaluationId,
                        evaluation.templateId()
                );

        return createEvaluationResponse(
                evaluation,
                scores
        );
    }

    @Transactional
    public StudentEvaluationResponse createEvaluation(
            AuthenticatedUser actor,
            SaveStudentEvaluationRequest request
    ) {
        validateDateRange(
                request.evaluationDate(),
                request.evaluationDate()
        );

        GroupRecord group = findGroup(
                actor.organizationId(),
                request.groupId()
        );

        validateGroupStatus(group);

        TemplateRecord template = findActiveTemplate(
                actor.organizationId(),
                request.templateId()
        );

        validateTemplateProgram(
                group,
                template
        );

        validateStudentEnrollment(
                actor.organizationId(),
                request.groupId(),
                request.studentId(),
                request.evaluationDate()
        );

        validateSessionContext(
                actor.organizationId(),
                request.groupId(),
                request.sessionId(),
                request.evaluationDate()
        );

        UUID evaluatorStaffId
                = resolveAndValidateEvaluator(
                        actor,
                        request.groupId(),
                        request.evaluationDate()
                );

        List<CriterionRecord> criteria
                = findTemplateCriteria(
                        actor.organizationId(),
                        request.templateId()
                );

        EvaluationCalculation calculation
                = validateAndCalculateScores(
                        template,
                        criteria,
                        request.scores()
                );

        UUID evaluationId = UUID.randomUUID();

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO student_evaluations
                (
                    id,
                    organization_id,
                    student_id,
                    group_id,
                    session_id,
                    template_id,
                    evaluator_user_id,
                    evaluator_staff_id,
                    evaluation_date,
                    overall_score,
                    evaluator_comment,
                    status,
                    submitted_by,
                    submitted_at,
                    published_by,
                    published_at,
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
                    'DRAFT',
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    ?,
                    ?,
                    0
                )
                """,
                evaluationId,
                actor.organizationId(),
                request.studentId(),
                request.groupId(),
                request.sessionId(),
                request.templateId(),
                actor.userId(),
                evaluatorStaffId,
                request.evaluationDate(),
                calculation.overallScore(),
                normalizeNullable(
                        request.evaluatorComment()
                ),
                now,
                now
        );

        replaceScores(
                actor.organizationId(),
                evaluationId,
                request.templateId(),
                calculation.scores(),
                now
        );

        auditService.record(
                actor,
                "STUDENT_EVALUATION_CREATED",
                "STUDENT_EVALUATION",
                evaluationId,
                "Draft student evaluation created."
        );

        return findEvaluation(
                actor,
                evaluationId
        );
    }

    @Transactional
    public StudentEvaluationResponse updateEvaluation(
            AuthenticatedUser actor,
            UUID evaluationId,
            SaveStudentEvaluationRequest request
    ) {
        EvaluationRecord existing
                = findEvaluationRecordForUpdate(
                        actor.organizationId(),
                        evaluationId
                );

        if (existing.status()
                != StudentEvaluationStatus.DRAFT) {
            throw new BusinessRuleException(
                    "Only draft evaluations can be modified."
            );
        }

        validateEvaluationAccess(
                actor,
                existing.groupId(),
                existing.evaluationDate()
        );

        GroupRecord group = findGroup(
                actor.organizationId(),
                request.groupId()
        );

        validateGroupStatus(group);

        TemplateRecord template = findActiveTemplate(
                actor.organizationId(),
                request.templateId()
        );

        validateTemplateProgram(group, template);

        validateStudentEnrollment(
                actor.organizationId(),
                request.groupId(),
                request.studentId(),
                request.evaluationDate()
        );

        validateSessionContext(
                actor.organizationId(),
                request.groupId(),
                request.sessionId(),
                request.evaluationDate()
        );

        UUID evaluatorStaffId
                = resolveAndValidateEvaluator(
                        actor,
                        request.groupId(),
                        request.evaluationDate()
                );

        List<CriterionRecord> criteria
                = findTemplateCriteria(
                        actor.organizationId(),
                        request.templateId()
                );

        EvaluationCalculation calculation
                = validateAndCalculateScores(
                        template,
                        criteria,
                        request.scores()
                );

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE student_evaluations
                SET
                    student_id = ?,
                    group_id = ?,
                    session_id = ?,
                    template_id = ?,
                    evaluator_user_id = ?,
                    evaluator_staff_id = ?,
                    evaluation_date = ?,
                    overall_score = ?,
                    evaluator_comment = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'DRAFT'
                """,
                request.studentId(),
                request.groupId(),
                request.sessionId(),
                request.templateId(),
                actor.userId(),
                evaluatorStaffId,
                request.evaluationDate(),
                calculation.overallScore(),
                normalizeNullable(
                        request.evaluatorComment()
                ),
                now,
                evaluationId,
                actor.organizationId()
        );

        jdbcTemplate.update(
                """
                DELETE FROM student_evaluation_scores
                WHERE organization_id = ?
                  AND evaluation_id = ?
                """,
                actor.organizationId(),
                evaluationId
        );

        replaceScores(
                actor.organizationId(),
                evaluationId,
                request.templateId(),
                calculation.scores(),
                now
        );

        auditService.record(
                actor,
                "STUDENT_EVALUATION_UPDATED",
                "STUDENT_EVALUATION",
                evaluationId,
                "Draft student evaluation updated."
        );

        return findEvaluation(actor, evaluationId);
    }

    @Transactional
    public StudentEvaluationResponse submitEvaluation(
            AuthenticatedUser actor,
            UUID evaluationId
    ) {
        EvaluationRecord evaluation
                = findEvaluationRecordForUpdate(
                        actor.organizationId(),
                        evaluationId
                );

        validateEvaluationAccess(
                actor,
                evaluation.groupId(),
                evaluation.evaluationDate()
        );

        if (evaluation.status()
                != StudentEvaluationStatus.DRAFT) {
            throw new BusinessRuleException(
                    "Only draft evaluations can be submitted."
            );
        }

        Integer criterionCount
                = jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM evaluation_criteria
                        WHERE organization_id = ?
                          AND template_id = ?
                        """,
                        Integer.class,
                        actor.organizationId(),
                        evaluation.templateId()
                );

        Integer scoreCount
                = jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM student_evaluation_scores
                        WHERE organization_id = ?
                          AND evaluation_id = ?
                        """,
                        Integer.class,
                        actor.organizationId(),
                        evaluationId
                );

        if (criterionCount == null
                || criterionCount == 0) {
            throw new BusinessRuleException(
                    "The evaluation template contains "
                    + "no criteria."
            );
        }

        if (!criterionCount.equals(scoreCount)) {
            throw new BusinessRuleException(
                    "Every evaluation criterion must be "
                    + "scored before submission."
            );
        }

        if (evaluation.overallScore() == null) {
            throw new BusinessRuleException(
                    "The overall score has not been calculated."
            );
        }

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE student_evaluations
                SET
                    status = 'SUBMITTED',
                    submitted_by = ?,
                    submitted_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'DRAFT'
                """,
                actor.userId(),
                now,
                now,
                evaluationId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "STUDENT_EVALUATION_SUBMITTED",
                "STUDENT_EVALUATION",
                evaluationId,
                "Student evaluation submitted."
        );

        return findEvaluation(actor, evaluationId);
    }

    private EvaluationRecord findEvaluationRecord(
            UUID organizationId,
            UUID evaluationId
    ) {
        return findEvaluationRecord(
                organizationId,
                evaluationId,
                false
        );
    }

    private EvaluationRecord
            findEvaluationRecordForUpdate(
                    UUID organizationId,
                    UUID evaluationId
            ) {
        return findEvaluationRecord(
                organizationId,
                evaluationId,
                true
        );
    }

    private EvaluationRecord findEvaluationRecord(
            UUID organizationId,
            UUID evaluationId,
            boolean lock
    ) {
        String sql = """
                SELECT
                    se.id,
                    se.organization_id,
                    se.student_id,
                    s.student_number,
                    s.first_name AS student_first_name,
                    s.last_name AS student_last_name,

                    se.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,

                    se.session_id,
                    ls.title AS session_title,

                    se.template_id,
                    et.code AS template_code,
                    et.name AS template_name,
                    et.version_label AS template_version,
                    et.minimum_score,
                    et.maximum_score,
                    et.passing_score,

                    se.evaluator_user_id,
                    se.evaluator_staff_id,

                    CONCAT(
                        evaluator_membership.display_first_name,
                        ' ',
                        evaluator_membership.display_last_name
                    ) AS evaluator_name,

                    se.evaluation_date,
                    se.overall_score,
                    se.evaluator_comment,
                    se.status,
                    se.submitted_by,
                    se.submitted_at,
                    se.published_by,
                    se.published_at,
                    se.created_at,
                    se.updated_at

                FROM student_evaluations se

                JOIN students s
                    ON s.id = se.student_id
                   AND s.organization_id =
                       se.organization_id

                JOIN academy_groups ag
                    ON ag.id = se.group_id
                   AND ag.organization_id =
                       se.organization_id

                JOIN evaluation_templates et
                    ON et.id = se.template_id
                   AND et.organization_id =
                       se.organization_id

                LEFT JOIN lesson_sessions ls
                    ON ls.id = se.session_id
                   AND ls.organization_id =
                       se.organization_id

                LEFT JOIN organization_memberships
                    evaluator_membership
                    ON evaluator_membership.user_id =
                       se.evaluator_user_id
                   AND evaluator_membership.organization_id =
                       se.organization_id

                WHERE se.id = ?
                  AND se.organization_id = ?
                """
                + (lock ? " FOR UPDATE OF se" : "");

        return jdbcTemplate.query(
                sql,
                (resultSet, rowNumber)
                -> mapEvaluationRecord(
                        resultSet
                ),
                evaluationId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Student evaluation was not found."
                )
        );
    }

    private List<StudentEvaluationScoreResponse>
            findScores(
                    UUID organizationId,
                    UUID evaluationId,
                    UUID templateId
            ) {
        return jdbcTemplate.query(
                """
                SELECT
                    ses.id,
                    ses.criterion_id,
                    ec.code AS criterion_code,
                    ec.name AS criterion_name,
                    ec.description
                        AS criterion_description,
                    ec.weight_percentage,
                    ec.sequence_number,
                    ses.score,
                    ses.weighted_score,
                    ses.evaluator_comment,
                    ses.created_at,
                    ses.updated_at

                FROM student_evaluation_scores ses

                JOIN evaluation_criteria ec
                    ON ec.id = ses.criterion_id
                   AND ec.template_id =
                       ses.template_id
                   AND ec.organization_id =
                       ses.organization_id

                WHERE ses.organization_id = ?
                  AND ses.evaluation_id = ?
                  AND ses.template_id = ?

                ORDER BY ec.sequence_number
                """,
                (resultSet, rowNumber)
                -> mapScoreResponse(resultSet),
                organizationId,
                evaluationId,
                templateId
        );
    }

    private List<CriterionRecord>
            findTemplateCriteria(
                    UUID organizationId,
                    UUID templateId
            ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    code,
                    name,
                    weight_percentage,
                    sequence_number
                FROM evaluation_criteria
                WHERE organization_id = ?
                  AND template_id = ?
                ORDER BY sequence_number
                """,
                (resultSet, rowNumber)
                -> new CriterionRecord(
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getString("code"),
                        resultSet.getString("name"),
                        resultSet.getBigDecimal(
                                "weight_percentage"
                        ),
                        resultSet.getInt(
                                "sequence_number"
                        )
                ),
                organizationId,
                templateId
        );
    }

    private EvaluationCalculation
            validateAndCalculateScores(
                    TemplateRecord template,
                    List<CriterionRecord> criteria,
                    List<SaveEvaluationScoreRequest> requests
            ) {
        Map<UUID, CriterionRecord> criterionMap
                = new HashMap<>();

        for (CriterionRecord criterion : criteria) {
            criterionMap.put(
                    criterion.id(),
                    criterion
            );
        }

        Set<UUID> receivedCriteria
                = new HashSet<>();

        List<CalculatedScore> scores
                = new java.util.ArrayList<>();

        BigDecimal overall
                = BigDecimal.ZERO;

        for (SaveEvaluationScoreRequest request
                : requests) {

            if (!receivedCriteria.add(
                    request.criterionId()
            )) {
                throw new BusinessRuleException(
                        "A criterion cannot be scored "
                        + "more than once."
                );
            }

            CriterionRecord criterion
                    = criterionMap.get(
                            request.criterionId()
                    );

            if (criterion == null) {
                throw new BusinessRuleException(
                        "One or more criteria do not belong "
                        + "to the evaluation template."
                );
            }

            BigDecimal score
                    = normalizeScore(request.score());

            if (score.compareTo(
                    template.minimumScore()
            ) < 0
                    || score.compareTo(
                            template.maximumScore()
                    ) > 0) {
                throw new BusinessRuleException(
                        "Score for criterion "
                        + criterion.name()
                        + " must be between "
                        + template.minimumScore()
                        + " and "
                        + template.maximumScore()
                        + "."
                );
            }

            BigDecimal weightedScore
                    = score.multiply(
                            criterion.weight()
                    )
                            .divide(
                                    ONE_HUNDRED,
                                    4,
                                    RoundingMode.HALF_UP
                            );

            overall = overall.add(
                    weightedScore
            );

            scores.add(
                    new CalculatedScore(
                            criterion.id(),
                            score,
                            weightedScore.setScale(
                                    2,
                                    RoundingMode.HALF_UP
                            ),
                            normalizeNullable(
                                    request.comment()
                            )
                    )
            );
        }

        boolean complete
                = !criteria.isEmpty()
                && receivedCriteria.size()
                == criteria.size();

        return new EvaluationCalculation(
                complete
                        ? overall.setScale(
                                2,
                                RoundingMode.HALF_UP
                        )
                        : null,
                scores
        );
    }

    private void replaceScores(
            UUID organizationId,
            UUID evaluationId,
            UUID templateId,
            List<CalculatedScore> scores,
            OffsetDateTime now
    ) {
        for (CalculatedScore score : scores) {
            jdbcTemplate.update(
                    """
                    INSERT INTO student_evaluation_scores
                    (
                        id,
                        organization_id,
                        evaluation_id,
                        template_id,
                        criterion_id,
                        score,
                        weighted_score,
                        evaluator_comment,
                        created_at,
                        updated_at,
                        version
                    )
                    VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0
                    )
                    """,
                    UUID.randomUUID(),
                    organizationId,
                    evaluationId,
                    templateId,
                    score.criterionId(),
                    score.score(),
                    score.weightedScore(),
                    score.comment(),
                    now,
                    now
            );
        }
    }

    private GroupRecord findGroup(
            UUID organizationId,
            UUID groupId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    program_id,
                    status
                FROM academy_groups
                WHERE id = ?
                  AND organization_id = ?
                """,
                (resultSet, rowNumber)
                -> new GroupRecord(
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getObject(
                                "program_id",
                                UUID.class
                        ),
                        resultSet.getString(
                                "status"
                        )
                ),
                groupId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Group was not found."
                )
        );
    }

    private TemplateRecord findActiveTemplate(
            UUID organizationId,
            UUID templateId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    program_id,
                    minimum_score,
                    maximum_score,
                    passing_score
                FROM evaluation_templates
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'ACTIVE'
                """,
                (resultSet, rowNumber)
                -> new TemplateRecord(
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getObject(
                                "program_id",
                                UUID.class
                        ),
                        resultSet.getBigDecimal(
                                "minimum_score"
                        ),
                        resultSet.getBigDecimal(
                                "maximum_score"
                        ),
                        resultSet.getBigDecimal(
                                "passing_score"
                        )
                ),
                templateId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new BusinessRuleException(
                        "The selected evaluation template "
                        + "is invalid or inactive."
                )
        );
    }

    private void validateTemplateProgram(
            GroupRecord group,
            TemplateRecord template
    ) {
        if (!group.programId()
                .equals(template.programId())) {
            throw new BusinessRuleException(
                    "The evaluation template program "
                    + "does not match the group program."
            );
        }
    }

    private void validateGroupStatus(
            GroupRecord group
    ) {
        if (!group.status().equals("ACTIVE")
                && !group.status().equals("COMPLETED")) {
            throw new BusinessRuleException(
                    "Evaluations can only be created for "
                    + "active or completed groups."
            );
        }
    }

    private void validateStudentEnrollment(
            UUID organizationId,
            UUID groupId,
            UUID studentId,
            LocalDate evaluationDate
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_enrollments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND student_id = ?
                  AND status <> 'CANCELLED'
                  AND enrolled_at <= ?
                  AND (
                      ended_at IS NULL
                      OR ended_at >= ?
                  )
                """,
                Integer.class,
                organizationId,
                groupId,
                studentId,
                evaluationDate,
                evaluationDate
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The student was not enrolled in the "
                    + "group on the evaluation date."
            );
        }
    }

    private void validateSessionContext(
            UUID organizationId,
            UUID groupId,
            UUID sessionId,
            LocalDate evaluationDate
    ) {
        if (sessionId == null) {
            return;
        }

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM lesson_sessions
                WHERE id = ?
                  AND organization_id = ?
                  AND group_id = ?
                  AND scheduled_start::DATE = ?
                  AND status <> 'CANCELLED'
                """,
                Integer.class,
                sessionId,
                organizationId,
                groupId,
                evaluationDate
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected session does not match "
                    + "the group and evaluation date."
            );
        }
    }

    private UUID resolveAndValidateEvaluator(
            AuthenticatedUser actor,
            UUID groupId,
            LocalDate evaluationDate
    ) {
        if (isOrganizationAdministrator(actor)) {
            return findOptionalCurrentStaffId(actor);
        }

        UUID staffId = findCurrentStaffId(actor);

        validateStaffAssignment(
                actor.organizationId(),
                groupId,
                staffId,
                evaluationDate
        );

        return staffId;
    }

    private void validateEvaluationAccess(
            AuthenticatedUser actor,
            UUID groupId,
            LocalDate evaluationDate
    ) {
        if (isOrganizationAdministrator(actor)) {
            return;
        }

        UUID staffId = findCurrentStaffId(actor);

        validateStaffAssignment(
                actor.organizationId(),
                groupId,
                staffId,
                evaluationDate
        );
    }

    private void validateStaffAssignment(
            UUID organizationId,
            UUID groupId,
            UUID staffId,
            LocalDate evaluationDate
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_staff_assignments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND staff_id = ?
                  AND status <> 'CANCELLED'
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
                evaluationDate,
                evaluationDate
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Student evaluation was not found."
            );
        }
    }

    private UUID findCurrentStaffId(
            AuthenticatedUser actor
    ) {
        UUID staffId
                = findOptionalCurrentStaffId(actor);

        if (staffId == null) {
            throw new ResourceNotFoundException(
                    "Student evaluation was not found."
            );
        }

        return staffId;
    }

    private UUID findOptionalCurrentStaffId(
            AuthenticatedUser actor
    ) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM staff_members
                WHERE organization_id = ?
                  AND membership_id = ?
                  AND employment_status = 'ACTIVE'
                """,
                (resultSet, rowNumber)
                -> resultSet.getObject(
                        "id",
                        UUID.class
                ),
                actor.organizationId(),
                actor.membershipId()
        ).stream().findFirst().orElse(null);
    }

    private StudentEvaluationResponse
            createEvaluationResponse(
                    EvaluationRecord evaluation,
                    List<StudentEvaluationScoreResponse> scores
            ) {
        int criterionCount
                = jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM evaluation_criteria
                        WHERE organization_id = ?
                          AND template_id = ?
                        """,
                        Integer.class,
                        evaluation.organizationId(),
                        evaluation.templateId()
                );

        boolean complete
                = criterionCount > 0
                && scores.size() == criterionCount;

        Boolean passed = null;

        if (evaluation.overallScore() != null
                && evaluation.passingScore() != null) {
            passed
                    = evaluation.overallScore()
                            .compareTo(
                                    evaluation.passingScore()
                            ) >= 0;
        }

        return new StudentEvaluationResponse(
                evaluation.id(),
                evaluation.studentId(),
                evaluation.studentNumber(),
                evaluation.studentFirstName(),
                evaluation.studentLastName(),
                evaluation.groupId(),
                evaluation.groupCode(),
                evaluation.groupName(),
                evaluation.sessionId(),
                evaluation.sessionTitle(),
                evaluation.templateId(),
                evaluation.templateCode(),
                evaluation.templateName(),
                evaluation.templateVersion(),
                evaluation.minimumScore(),
                evaluation.maximumScore(),
                evaluation.passingScore(),
                evaluation.evaluatorUserId(),
                evaluation.evaluatorStaffId(),
                evaluation.evaluatorName(),
                evaluation.evaluationDate(),
                evaluation.overallScore(),
                passed,
                evaluation.evaluatorComment(),
                evaluation.status(),
                evaluation.submittedBy(),
                evaluation.submittedAt(),
                evaluation.publishedBy(),
                evaluation.publishedAt(),
                criterionCount,
                scores.size(),
                complete,
                scores,
                evaluation.createdAt(),
                evaluation.updatedAt()
        );
    }

    private EvaluationRecord mapEvaluationRecord(
            ResultSet resultSet
    ) throws SQLException {
        return new EvaluationRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "organization_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "student_id",
                        UUID.class
                ),
                resultSet.getString(
                        "student_number"
                ),
                resultSet.getString(
                        "student_first_name"
                ),
                resultSet.getString(
                        "student_last_name"
                ),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getString("group_code"),
                resultSet.getString("group_name"),
                resultSet.getObject(
                        "session_id",
                        UUID.class
                ),
                resultSet.getString("session_title"),
                resultSet.getObject(
                        "template_id",
                        UUID.class
                ),
                resultSet.getString("template_code"),
                resultSet.getString("template_name"),
                resultSet.getString(
                        "template_version"
                ),
                resultSet.getBigDecimal(
                        "minimum_score"
                ),
                resultSet.getBigDecimal(
                        "maximum_score"
                ),
                resultSet.getBigDecimal(
                        "passing_score"
                ),
                resultSet.getObject(
                        "evaluator_user_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "evaluator_staff_id",
                        UUID.class
                ),
                resultSet.getString("evaluator_name"),
                resultSet.getObject(
                        "evaluation_date",
                        LocalDate.class
                ),
                resultSet.getBigDecimal(
                        "overall_score"
                ),
                resultSet.getString(
                        "evaluator_comment"
                ),
                StudentEvaluationStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getObject(
                        "submitted_by",
                        UUID.class
                ),
                resultSet.getObject(
                        "submitted_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "published_by",
                        UUID.class
                ),
                resultSet.getObject(
                        "published_at",
                        OffsetDateTime.class
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

    private StudentEvaluationSummaryResponse
            mapEvaluationSummary(
                    ResultSet resultSet
            ) throws SQLException {
        return new StudentEvaluationSummaryResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "student_id",
                        UUID.class
                ),
                resultSet.getString(
                        "student_number"
                ),
                resultSet.getString(
                        "student_first_name"
                ),
                resultSet.getString(
                        "student_last_name"
                ),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getString("group_code"),
                resultSet.getString("group_name"),
                resultSet.getObject(
                        "session_id",
                        UUID.class
                ),
                resultSet.getString("session_title"),
                resultSet.getObject(
                        "template_id",
                        UUID.class
                ),
                resultSet.getString("template_name"),
                resultSet.getString(
                        "template_version"
                ),
                resultSet.getObject(
                        "evaluation_date",
                        LocalDate.class
                ),
                resultSet.getBigDecimal(
                        "overall_score"
                ),
                StudentEvaluationStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getString("evaluator_name"),
                resultSet.getObject(
                        "submitted_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "published_at",
                        OffsetDateTime.class
                )
        );
    }

    private StudentEvaluationScoreResponse
            mapScoreResponse(
                    ResultSet resultSet
            ) throws SQLException {
        return new StudentEvaluationScoreResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "criterion_id",
                        UUID.class
                ),
                resultSet.getString(
                        "criterion_code"
                ),
                resultSet.getString(
                        "criterion_name"
                ),
                resultSet.getString(
                        "criterion_description"
                ),
                resultSet.getBigDecimal(
                        "weight_percentage"
                ),
                resultSet.getInt(
                        "sequence_number"
                ),
                resultSet.getBigDecimal("score"),
                resultSet.getBigDecimal(
                        "weighted_score"
                ),
                resultSet.getString(
                        "evaluator_comment"
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

    private boolean isOrganizationAdministrator(
            AuthenticatedUser actor
    ) {
        return actor.roles().contains(
                "ORGANIZATION_ADMIN"
        );
    }

    private void validateDateRange(
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        if (dateFrom != null
                && dateTo != null
                && dateTo.isBefore(dateFrom)) {
            throw new BusinessRuleException(
                    "Date to cannot be before date from."
            );
        }
    }

    private BigDecimal normalizeScore(
            BigDecimal score
    ) {
        return score.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private record GroupRecord(
            UUID id,
            UUID programId,
            String status
            ) {

    }

    private record TemplateRecord(
            UUID id,
            UUID programId,
            BigDecimal minimumScore,
            BigDecimal maximumScore,
            BigDecimal passingScore
            ) {

    }

    private record CriterionRecord(
            UUID id,
            String code,
            String name,
            BigDecimal weight,
            int sequenceNumber
            ) {

    }

    private record CalculatedScore(
            UUID criterionId,
            BigDecimal score,
            BigDecimal weightedScore,
            String comment
            ) {

    }

    private record EvaluationCalculation(
            BigDecimal overallScore,
            List<CalculatedScore> scores
            ) {

    }

    private record EvaluationRecord(
            UUID id,
            UUID organizationId,
            UUID studentId,
            String studentNumber,
            String studentFirstName,
            String studentLastName,
            UUID groupId,
            String groupCode,
            String groupName,
            UUID sessionId,
            String sessionTitle,
            UUID templateId,
            String templateCode,
            String templateName,
            String templateVersion,
            BigDecimal minimumScore,
            BigDecimal maximumScore,
            BigDecimal passingScore,
            UUID evaluatorUserId,
            UUID evaluatorStaffId,
            String evaluatorName,
            LocalDate evaluationDate,
            BigDecimal overallScore,
            String evaluatorComment,
            StudentEvaluationStatus status,
            UUID submittedBy,
            OffsetDateTime submittedAt,
            UUID publishedBy,
            OffsetDateTime publishedAt,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
            ) {

    }
}
