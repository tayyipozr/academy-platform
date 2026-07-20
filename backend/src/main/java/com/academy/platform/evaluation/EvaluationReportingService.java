package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EvaluationReportingService {

    private static final BigDecimal ONE_HUNDRED =
            new BigDecimal("100.00");

    private final JdbcTemplate jdbcTemplate;

    public EvaluationReportingService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<PublishedEvaluationResponse>
    findPublishedEvaluations(
            AuthenticatedUser actor,
            UUID studentId,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        validateDateRange(dateFrom, dateTo);

        validateStudentAccess(actor, studentId);

        List<PublishedEvaluationRecord> evaluations =
                findPublishedEvaluationRecords(
                        actor.organizationId(),
                        studentId,
                        groupId,
                        dateFrom,
                        dateTo
                );

        return evaluations.stream()
                .map(record ->
                        createPublishedResponse(
                                actor.organizationId(),
                                record
                        )
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentDevelopmentSummaryResponse
    findStudentDevelopment(
            AuthenticatedUser actor,
            UUID studentId,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        validateDateRange(dateFrom, dateTo);

        StudentRecord student = findStudent(
                actor.organizationId(),
                studentId
        );

        validateStudentAccess(actor, studentId);

        GroupRecord group = groupId == null
                ? findMostRecentStudentGroup(
                        actor.organizationId(),
                        studentId,
                        dateFrom,
                        dateTo
                )
                : findGroup(
                        actor.organizationId(),
                        groupId
                );

        if (group != null) {
            validateStudentGroupRelationship(
                    actor.organizationId(),
                    studentId,
                    group.id()
            );
        }

        List<PublishedEvaluationRecord> evaluations =
                findPublishedEvaluationRecords(
                        actor.organizationId(),
                        studentId,
                        group == null
                                ? null
                                : group.id(),
                        dateFrom,
                        dateTo
                );

        List<EvaluationTrendPointResponse> trend =
                evaluations.stream()
                        .map(record ->
                                new EvaluationTrendPointResponse(
                                        record.id(),
                                        record.evaluationDate(),
                                        record.templateName(),
                                        record.templateVersion(),
                                        record.overallScore(),
                                        normalizeScore(record)
                                )
                        )
                        .sorted(
                                java.util.Comparator.comparing(
                                        EvaluationTrendPointResponse
                                                ::evaluationDate
                                )
                        )
                        .toList();

        BigDecimal averageNormalized =
                average(
                        trend.stream()
                                .map(
                                    EvaluationTrendPointResponse
                                            ::normalizedScore
                                )
                                .toList()
                );

        BigDecimal latestNormalized =
                trend.isEmpty()
                        ? null
                        : trend.get(
                                trend.size() - 1
                        ).normalizedScore();

        BigDecimal firstNormalized =
                trend.isEmpty()
                        ? null
                        : trend.get(0)
                        .normalizedScore();

        BigDecimal scoreTrend =
                latestNormalized == null
                        || firstNormalized == null
                        ? null
                        : latestNormalized
                        .subtract(firstNormalized)
                        .setScale(
                                2,
                                RoundingMode.HALF_UP
                        );

        PassingSummary passing =
                calculatePassingSummary(evaluations);

        BigDecimal attendancePercentage =
                findAttendancePercentage(
                        actor.organizationId(),
                        studentId,
                        group == null
                                ? null
                                : group.id(),
                        dateFrom,
                        dateTo
                );

        BigDecimal curriculumCompletion =
                group == null
                        ? null
                        : findGroupCurriculumCompletion(
                                actor.organizationId(),
                                group.id()
                        );

        List<CriterionAverageResponse>
                criterionAverages =
                findCriterionAverages(
                        actor.organizationId(),
                        studentId,
                        group == null
                                ? null
                                : group.id(),
                        dateFrom,
                        dateTo
                );

        DevelopmentStatus developmentStatus =
                calculateDevelopmentStatus(
                        averageNormalized,
                        attendancePercentage
                );

        return new StudentDevelopmentSummaryResponse(
                student.id(),
                student.studentNumber(),
                student.firstName(),
                student.lastName(),
                group == null ? null : group.id(),
                group == null ? null : group.code(),
                group == null ? null : group.name(),
                dateFrom,
                dateTo,
                evaluations.size(),
                averageNormalized,
                latestNormalized,
                scoreTrend,
                passing.passed(),
                passing.denominator(),
                passing.percentage(),
                attendancePercentage,
                curriculumCompletion,
                developmentStatus,
                criterionAverages,
                trend
        );
    }

    @Transactional(readOnly = true)
    public GroupPerformanceSummaryResponse
    findGroupPerformance(
            AuthenticatedUser actor,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        validateDateRange(dateFrom, dateTo);

        GroupRecord group = findGroup(
                actor.organizationId(),
                groupId
        );

        validateGroupAccess(
                actor,
                groupId,
                dateFrom,
                dateTo
        );

        List<GroupEvaluationRecord> records =
                findGroupEvaluationRecords(
                        actor.organizationId(),
                        groupId,
                        dateFrom,
                        dateTo
                );

        Map<UUID, MutableStudentPerformance> students =
                new LinkedHashMap<>();

        for (GroupEvaluationRecord record : records) {
            students.computeIfAbsent(
                    record.studentId(),
                    ignored ->
                            new MutableStudentPerformance(
                                    record.studentId(),
                                    record.studentNumber(),
                                    record.firstName(),
                                    record.lastName()
                            )
            ).add(
                    record.evaluationDate(),
                    record.normalizedScore()
            );
        }

        List<GroupStudentPerformanceResponse>
                studentResponses =
                students.values()
                        .stream()
                        .map(
                                MutableStudentPerformance
                                        ::toResponse
                        )
                        .toList();

        BigDecimal groupAverage =
                average(
                        records.stream()
                                .map(
                                    GroupEvaluationRecord
                                            ::normalizedScore
                                )
                                .toList()
                );

        int passingCount = (int) records.stream()
                .filter(
                        GroupEvaluationRecord::passed
                )
                .count();

        int passingDenominator =
                (int) records.stream()
                        .filter(
                                GroupEvaluationRecord
                                        ::hasPassingScore
                        )
                        .count();

        BigDecimal passingRate =
                percentage(
                        passingCount,
                        passingDenominator
                );

        return new GroupPerformanceSummaryResponse(
                group.id(),
                group.code(),
                group.name(),
                group.programId(),
                group.programName(),
                group.termId(),
                group.termName(),
                dateFrom,
                dateTo,
                studentResponses.size(),
                records.size(),
                groupAverage,
                passingCount,
                passingDenominator,
                passingRate,
                studentResponses
        );
    }

    private List<PublishedEvaluationRecord>
    findPublishedEvaluationRecords(
            UUID organizationId,
            UUID studentId,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        StringBuilder sql = new StringBuilder(
                """
                SELECT
                    se.id,
                    se.student_id,
                    s.student_number,
                    s.first_name,
                    s.last_name,
                    se.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    se.template_id,
                    et.name AS template_name,
                    et.version_label AS template_version,
                    et.minimum_score,
                    et.maximum_score,
                    et.passing_score,
                    se.evaluation_date,
                    se.overall_score,
                    se.evaluator_comment,
                    se.published_at,

                    CONCAT(
                        evaluator_membership.display_first_name,
                        ' ',
                        evaluator_membership.display_last_name
                    ) AS evaluator_name

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

                LEFT JOIN organization_memberships
                    evaluator_membership
                    ON evaluator_membership.user_id =
                       se.evaluator_user_id
                   AND evaluator_membership.organization_id =
                       se.organization_id

                WHERE se.organization_id = ?
                  AND se.student_id = ?
                  AND se.status = 'PUBLISHED'
                """
        );

        List<Object> parameters =
                new ArrayList<>();

        parameters.add(organizationId);
        parameters.add(studentId);

        if (groupId != null) {
            sql.append(
                    " AND se.group_id = ?"
            );

            parameters.add(groupId);
        }

        if (dateFrom != null) {
            sql.append(
                    " AND se.evaluation_date >= ?"
            );

            parameters.add(dateFrom);
        }

        if (dateTo != null) {
            sql.append(
                    " AND se.evaluation_date <= ?"
            );

            parameters.add(dateTo);
        }

        sql.append(
                """
                ORDER BY
                    se.evaluation_date DESC,
                    se.published_at DESC
                """
        );

        return jdbcTemplate.query(
                sql.toString(),
                (resultSet, rowNumber) ->
                        mapPublishedEvaluationRecord(
                                resultSet
                        ),
                parameters.toArray()
        );
    }

    private PublishedEvaluationResponse
    createPublishedResponse(
            UUID organizationId,
            PublishedEvaluationRecord record
    ) {
        List<PublishedCriterionScoreResponse> scores =
                jdbcTemplate.query(
                        """
                        SELECT
                            ses.criterion_id,
                            ec.code AS criterion_code,
                            ec.name AS criterion_name,
                            ec.description
                                AS criterion_description,
                            ec.weight_percentage,
                            ses.score,
                            ses.weighted_score,
                            ses.evaluator_comment

                        FROM student_evaluation_scores ses

                        JOIN evaluation_criteria ec
                            ON ec.id = ses.criterion_id
                           AND ec.template_id =
                               ses.template_id
                           AND ec.organization_id =
                               ses.organization_id

                        WHERE ses.organization_id = ?
                          AND ses.evaluation_id = ?

                        ORDER BY ec.sequence_number
                        """,
                        (resultSet, rowNumber) ->
                                new PublishedCriterionScoreResponse(
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
                                        resultSet.getBigDecimal(
                                                "score"
                                        ),
                                        resultSet.getBigDecimal(
                                                "weighted_score"
                                        ),
                                        resultSet.getString(
                                                "evaluator_comment"
                                        )
                                ),
                        organizationId,
                        record.id()
                );

        BigDecimal normalized =
                normalizeScore(record);

        Boolean passed =
                record.passingScore() == null
                        ? null
                        : record.overallScore()
                        .compareTo(
                                record.passingScore()
                        ) >= 0;

        return new PublishedEvaluationResponse(
                record.id(),
                record.studentId(),
                record.studentNumber(),
                record.firstName(),
                record.lastName(),
                record.groupId(),
                record.groupCode(),
                record.groupName(),
                record.templateId(),
                record.templateName(),
                record.templateVersion(),
                record.evaluationDate(),
                record.minimumScore(),
                record.maximumScore(),
                record.passingScore(),
                record.overallScore(),
                normalized,
                passed,
                record.evaluatorName(),
                record.evaluatorComment(),
                record.publishedAt(),
                scores
        );
    }

    private List<CriterionAverageResponse>
    findCriterionAverages(
            UUID organizationId,
            UUID studentId,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        StringBuilder sql = new StringBuilder(
                """
                SELECT
                    se.template_id,
                    et.name AS template_name,
                    ses.criterion_id,
                    ec.code AS criterion_code,
                    ec.name AS criterion_name,
                    ec.weight_percentage,
                    COUNT(*) AS evaluation_count,
                    AVG(ses.score) AS average_score,

                    AVG(
                        (
                            ses.score
                            - et.minimum_score
                        )
                        /
                        NULLIF(
                            et.maximum_score
                            - et.minimum_score,
                            0
                        )
                        * 100
                    ) AS average_normalized_score

                FROM student_evaluation_scores ses

                JOIN student_evaluations se
                    ON se.id = ses.evaluation_id
                   AND se.organization_id =
                       ses.organization_id

                JOIN evaluation_templates et
                    ON et.id = se.template_id
                   AND et.organization_id =
                       se.organization_id

                JOIN evaluation_criteria ec
                    ON ec.id = ses.criterion_id
                   AND ec.template_id =
                       ses.template_id
                   AND ec.organization_id =
                       ses.organization_id

                WHERE se.organization_id = ?
                  AND se.student_id = ?
                  AND se.status = 'PUBLISHED'
                """
        );

        List<Object> parameters =
                new ArrayList<>();

        parameters.add(organizationId);
        parameters.add(studentId);

        if (groupId != null) {
            sql.append(
                    " AND se.group_id = ?"
            );

            parameters.add(groupId);
        }

        if (dateFrom != null) {
            sql.append(
                    " AND se.evaluation_date >= ?"
            );

            parameters.add(dateFrom);
        }

        if (dateTo != null) {
            sql.append(
                    " AND se.evaluation_date <= ?"
            );

            parameters.add(dateTo);
        }

        sql.append(
                """
                GROUP BY
                    se.template_id,
                    et.name,
                    ses.criterion_id,
                    ec.code,
                    ec.name,
                    ec.weight_percentage,
                    ec.sequence_number

                ORDER BY
                    et.name,
                    ec.sequence_number
                """
        );

        return jdbcTemplate.query(
                sql.toString(),
                (resultSet, rowNumber) ->
                        new CriterionAverageResponse(
                                resultSet.getObject(
                                        "template_id",
                                        UUID.class
                                ),
                                resultSet.getString(
                                        "template_name"
                                ),
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
                                resultSet.getBigDecimal(
                                        "weight_percentage"
                                ),
                                resultSet.getInt(
                                        "evaluation_count"
                                ),
                                scale(
                                        resultSet.getBigDecimal(
                                                "average_score"
                                        )
                                ),
                                scale(
                                        resultSet.getBigDecimal(
                                                "average_normalized_score"
                                        )
                                )
                        ),
                parameters.toArray()
        );
    }

    private List<GroupEvaluationRecord>
    findGroupEvaluationRecords(
            UUID organizationId,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        StringBuilder sql = new StringBuilder(
                """
                SELECT
                    se.student_id,
                    s.student_number,
                    s.first_name,
                    s.last_name,
                    se.evaluation_date,

                    (
                        (
                            se.overall_score
                            - et.minimum_score
                        )
                        /
                        NULLIF(
                            et.maximum_score
                            - et.minimum_score,
                            0
                        )
                        * 100
                    ) AS normalized_score,

                    et.passing_score,

                    CASE
                        WHEN et.passing_score IS NULL
                        THEN FALSE
                        ELSE se.overall_score
                             >= et.passing_score
                    END AS passed

                FROM student_evaluations se

                JOIN students s
                    ON s.id = se.student_id
                   AND s.organization_id =
                       se.organization_id

                JOIN evaluation_templates et
                    ON et.id = se.template_id
                   AND et.organization_id =
                       se.organization_id

                WHERE se.organization_id = ?
                  AND se.group_id = ?
                  AND se.status = 'PUBLISHED'
                """
        );

        List<Object> parameters =
                new ArrayList<>();

        parameters.add(organizationId);
        parameters.add(groupId);

        if (dateFrom != null) {
            sql.append(
                    " AND se.evaluation_date >= ?"
            );

            parameters.add(dateFrom);
        }

        if (dateTo != null) {
            sql.append(
                    " AND se.evaluation_date <= ?"
            );

            parameters.add(dateTo);
        }

        sql.append(
                """
                ORDER BY
                    s.first_name,
                    s.last_name,
                    se.evaluation_date
                """
        );

        return jdbcTemplate.query(
                sql.toString(),
                (resultSet, rowNumber) ->
                        new GroupEvaluationRecord(
                                resultSet.getObject(
                                        "student_id",
                                        UUID.class
                                ),
                                resultSet.getString(
                                        "student_number"
                                ),
                                resultSet.getString(
                                        "first_name"
                                ),
                                resultSet.getString(
                                        "last_name"
                                ),
                                resultSet.getObject(
                                        "evaluation_date",
                                        LocalDate.class
                                ),
                                scale(
                                        resultSet.getBigDecimal(
                                                "normalized_score"
                                        )
                                ),
                                resultSet.getBigDecimal(
                                        "passing_score"
                                ) != null,
                                resultSet.getBoolean(
                                        "passed"
                                )
                        ),
                parameters.toArray()
        );
    }

    private BigDecimal findAttendancePercentage(
            UUID organizationId,
            UUID studentId,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        StringBuilder sql = new StringBuilder(
                """
                SELECT
                    COUNT(*) FILTER (
                        WHERE ar.status
                            IN ('PRESENT', 'LATE')
                    ) AS attended_count,

                    COUNT(*) FILTER (
                        WHERE ar.status
                            IN (
                                'PRESENT',
                                'LATE',
                                'ABSENT'
                            )
                    ) AS denominator

                FROM attendance_records ar

                JOIN lesson_sessions ls
                    ON ls.id = ar.session_id
                   AND ls.organization_id =
                       ar.organization_id

                WHERE ar.organization_id = ?
                  AND ar.student_id = ?
                  AND ls.attendance_finalized_at
                      IS NOT NULL
                  AND ar.status <> 'NOT_RECORDED'
                """
        );

        List<Object> parameters =
                new ArrayList<>();

        parameters.add(organizationId);
        parameters.add(studentId);

        if (groupId != null) {
            sql.append(
                    " AND ls.group_id = ?"
            );

            parameters.add(groupId);
        }

        if (dateFrom != null) {
            sql.append(
                    " AND ls.scheduled_start::DATE >= ?"
            );

            parameters.add(dateFrom);
        }

        if (dateTo != null) {
            sql.append(
                    " AND ls.scheduled_start::DATE <= ?"
            );

            parameters.add(dateTo);
        }

        AttendanceCount counts =
                jdbcTemplate.query(
                        sql.toString(),
                        (resultSet, rowNumber) ->
                                new AttendanceCount(
                                        resultSet.getInt(
                                                "attended_count"
                                        ),
                                        resultSet.getInt(
                                                "denominator"
                                        )
                                ),
                        parameters.toArray()
                ).stream().findFirst().orElse(
                        new AttendanceCount(0, 0)
                );

        return percentage(
                counts.attended(),
                counts.denominator()
        );
    }

    private BigDecimal findGroupCurriculumCompletion(
            UUID organizationId,
            UUID groupId
    ) {
        ProgressCount progress =
                jdbcTemplate.query(
                        """
                        SELECT
                            COUNT(*) AS total_units,

                            COUNT(*) FILTER (
                                WHERE gcup.status = 'COMPLETED'
                            ) AS completed_units

                        FROM group_curriculum_assignments gca

                        JOIN group_curriculum_unit_progress gcup
                            ON gcup.assignment_id = gca.id
                           AND gcup.organization_id =
                               gca.organization_id

                        WHERE gca.organization_id = ?
                          AND gca.group_id = ?
                          AND gca.status = 'ACTIVE'
                        """,
                        (resultSet, rowNumber) ->
                                new ProgressCount(
                                        resultSet.getInt(
                                                "total_units"
                                        ),
                                        resultSet.getInt(
                                                "completed_units"
                                        )
                                ),
                        organizationId,
                        groupId
                ).stream().findFirst().orElse(
                        new ProgressCount(0, 0)
                );

        return percentage(
                progress.completed(),
                progress.total()
        );
    }

    private PassingSummary calculatePassingSummary(
            List<PublishedEvaluationRecord> evaluations
    ) {
        int denominator = (int) evaluations.stream()
                .filter(record ->
                        record.passingScore() != null
                )
                .count();

        int passed = (int) evaluations.stream()
                .filter(record ->
                        record.passingScore() != null
                        && record.overallScore()
                        .compareTo(
                                record.passingScore()
                        ) >= 0
                )
                .count();

        return new PassingSummary(
                passed,
                denominator,
                percentage(passed, denominator)
        );
    }

    private DevelopmentStatus
    calculateDevelopmentStatus(
            BigDecimal evaluationAverage,
            BigDecimal attendancePercentage
    ) {
        if (evaluationAverage == null) {
            return DevelopmentStatus.NO_DATA;
        }

        BigDecimal effectiveScore =
                evaluationAverage;

        if (
                attendancePercentage != null
                && attendancePercentage.compareTo(
                        new BigDecimal("60.00")
                ) < 0
        ) {
            effectiveScore =
                    effectiveScore.subtract(
                            new BigDecimal("10.00")
                    );
        }

        if (effectiveScore.compareTo(
                new BigDecimal("50.00")
        ) < 0) {
            return DevelopmentStatus.NEEDS_SUPPORT;
        }

        if (effectiveScore.compareTo(
                new BigDecimal("70.00")
        ) < 0) {
            return DevelopmentStatus.DEVELOPING;
        }

        if (effectiveScore.compareTo(
                new BigDecimal("85.00")
        ) < 0) {
            return DevelopmentStatus.ON_TRACK;
        }

        return DevelopmentStatus
                .EXCEEDING_EXPECTATIONS;
    }

    private void validateStudentAccess(
            AuthenticatedUser actor,
            UUID studentId
    ) {
        if (isAdministrator(actor)) {
            return;
        }

        if (actor.hasPermission(
                "guardian.reports.read"
        )) {
            Integer count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM guardians g

                    JOIN student_guardians sg
                        ON sg.guardian_id = g.id
                       AND sg.organization_id =
                           g.organization_id

                    WHERE g.organization_id = ?
                      AND g.membership_id = ?
                      AND g.status = 'ACTIVE'
                      AND sg.student_id = ?
                    """,
                    Integer.class,
                    actor.organizationId(),
                    actor.membershipId(),
                    studentId
            );

            if (count == null || count == 0) {
                throw new ResourceNotFoundException(
                        "Student was not found."
                );
            }

            return;
        }

        UUID staffId = findCurrentStaffId(actor);

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(DISTINCT ge.group_id)

                FROM group_enrollments ge

                JOIN group_staff_assignments gsa
                    ON gsa.group_id = ge.group_id
                   AND gsa.organization_id =
                       ge.organization_id

                WHERE ge.organization_id = ?
                  AND ge.student_id = ?
                  AND gsa.staff_id = ?
                  AND ge.status <> 'CANCELLED'
                  AND gsa.status <> 'CANCELLED'
                """,
                Integer.class,
                actor.organizationId(),
                studentId,
                staffId
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Student was not found."
            );
        }
    }

    private void validateGroupAccess(
            AuthenticatedUser actor,
            UUID groupId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        if (isAdministrator(actor)) {
            return;
        }

        UUID staffId = findCurrentStaffId(actor);

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_staff_assignments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND staff_id = ?
                  AND status <> 'CANCELLED'
                  AND (
                      ?::DATE IS NULL
                      OR start_date <= ?::DATE
                  )
                  AND (
                      ?::DATE IS NULL
                      OR end_date IS NULL
                      OR end_date >= ?::DATE
                  )
                """,
                Integer.class,
                actor.organizationId(),
                groupId,
                staffId,
                dateTo,
                dateTo,
                dateFrom,
                dateFrom
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Group was not found."
            );
        }
    }

    private UUID findCurrentStaffId(
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
                (resultSet, rowNumber) ->
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                actor.organizationId(),
                actor.membershipId()
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Performance report was not found."
                )
        );
    }

    private StudentRecord findStudent(
            UUID organizationId,
            UUID studentId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    student_number,
                    first_name,
                    last_name
                FROM students
                WHERE id = ?
                  AND organization_id = ?
                  AND status <> 'ARCHIVED'
                """,
                (resultSet, rowNumber) ->
                        new StudentRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getString(
                                        "student_number"
                                ),
                                resultSet.getString(
                                        "first_name"
                                ),
                                resultSet.getString(
                                        "last_name"
                                )
                        ),
                studentId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Student was not found."
                )
        );
    }

    private GroupRecord findGroup(
            UUID organizationId,
            UUID groupId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    ag.id,
                    ag.code,
                    ag.name,
                    ag.program_id,
                    p.name AS program_name,
                    ag.term_id,
                    ot.name AS term_name

                FROM academy_groups ag

                JOIN programs p
                    ON p.id = ag.program_id
                   AND p.organization_id =
                       ag.organization_id

                JOIN operational_terms ot
                    ON ot.id = ag.term_id
                   AND ot.organization_id =
                       ag.organization_id

                WHERE ag.id = ?
                  AND ag.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        new GroupRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getString("code"),
                                resultSet.getString("name"),
                                resultSet.getObject(
                                        "program_id",
                                        UUID.class
                                ),
                                resultSet.getString(
                                        "program_name"
                                ),
                                resultSet.getObject(
                                        "term_id",
                                        UUID.class
                                ),
                                resultSet.getString(
                                        "term_name"
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

    private GroupRecord findMostRecentStudentGroup(
            UUID organizationId,
            UUID studentId,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    ag.id,
                    ag.code,
                    ag.name,
                    ag.program_id,
                    p.name AS program_name,
                    ag.term_id,
                    ot.name AS term_name

                FROM group_enrollments ge

                JOIN academy_groups ag
                    ON ag.id = ge.group_id
                   AND ag.organization_id =
                       ge.organization_id

                JOIN programs p
                    ON p.id = ag.program_id
                   AND p.organization_id =
                       ag.organization_id

                JOIN operational_terms ot
                    ON ot.id = ag.term_id
                   AND ot.organization_id =
                       ag.organization_id

                WHERE ge.organization_id = ?
                  AND ge.student_id = ?
                  AND ge.status <> 'CANCELLED'
                  AND (
                      ?::DATE IS NULL
                      OR ge.enrolled_at <= ?::DATE
                  )
                  AND (
                      ?::DATE IS NULL
                      OR ge.ended_at IS NULL
                      OR ge.ended_at >= ?::DATE
                  )

                ORDER BY ge.enrolled_at DESC
                LIMIT 1
                """,
                (resultSet, rowNumber) ->
                        new GroupRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getString("code"),
                                resultSet.getString("name"),
                                resultSet.getObject(
                                        "program_id",
                                        UUID.class
                                ),
                                resultSet.getString(
                                        "program_name"
                                ),
                                resultSet.getObject(
                                        "term_id",
                                        UUID.class
                                ),
                                resultSet.getString(
                                        "term_name"
                                )
                        ),
                organizationId,
                studentId,
                dateTo,
                dateTo,
                dateFrom,
                dateFrom
        ).stream().findFirst().orElse(null);
    }

    private void validateStudentGroupRelationship(
            UUID organizationId,
            UUID studentId,
            UUID groupId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_enrollments
                WHERE organization_id = ?
                  AND student_id = ?
                  AND group_id = ?
                  AND status <> 'CANCELLED'
                """,
                Integer.class,
                organizationId,
                studentId,
                groupId
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Student group relationship was not found."
            );
        }
    }

    private BigDecimal normalizeScore(
            PublishedEvaluationRecord record
    ) {
        BigDecimal range =
                record.maximumScore()
                        .subtract(
                                record.minimumScore()
                        );

        if (range.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return record.overallScore()
                .subtract(record.minimumScore())
                .divide(
                        range,
                        6,
                        RoundingMode.HALF_UP
                )
                .multiply(ONE_HUNDRED)
                .setScale(
                        2,
                        RoundingMode.HALF_UP
                );
    }

    private BigDecimal average(
            List<BigDecimal> values
    ) {
        List<BigDecimal> nonNullValues =
                values.stream()
                        .filter(
                                java.util.Objects::nonNull
                        )
                        .toList();

        if (nonNullValues.isEmpty()) {
            return null;
        }

        BigDecimal total =
                nonNullValues.stream()
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add
                        );

        return total.divide(
                BigDecimal.valueOf(
                        nonNullValues.size()
                ),
                2,
                RoundingMode.HALF_UP
        );
    }

    private BigDecimal percentage(
            int numerator,
            int denominator
    ) {
        if (denominator == 0) {
            return BigDecimal.ZERO
                    .setScale(2);
        }

        return BigDecimal.valueOf(numerator)
                .divide(
                        BigDecimal.valueOf(
                                denominator
                        ),
                        6,
                        RoundingMode.HALF_UP
                )
                .multiply(ONE_HUNDRED)
                .setScale(
                        2,
                        RoundingMode.HALF_UP
                );
    }

    private BigDecimal scale(
            BigDecimal value
    ) {
        return value == null
                ? null
                : value.setScale(
                        2,
                        RoundingMode.HALF_UP
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

    private boolean isAdministrator(
            AuthenticatedUser actor
    ) {
        return actor.roles().contains(
                "ORGANIZATION_ADMIN"
        );
    }

    private PublishedEvaluationRecord
    mapPublishedEvaluationRecord(
            ResultSet resultSet
    ) throws SQLException {
        return new PublishedEvaluationRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "student_id",
                        UUID.class
                ),
                resultSet.getString(
                        "student_number"
                ),
                resultSet.getString("first_name"),
                resultSet.getString("last_name"),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getString("group_code"),
                resultSet.getString("group_name"),
                resultSet.getObject(
                        "template_id",
                        UUID.class
                ),
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
                        "evaluation_date",
                        LocalDate.class
                ),
                resultSet.getBigDecimal(
                        "overall_score"
                ),
                resultSet.getString(
                        "evaluator_comment"
                ),
                resultSet.getString(
                        "evaluator_name"
                ),
                resultSet.getObject(
                        "published_at",
                        java.time.OffsetDateTime.class
                )
        );
    }

    private record PublishedEvaluationRecord(
            UUID id,
            UUID studentId,
            String studentNumber,
            String firstName,
            String lastName,
            UUID groupId,
            String groupCode,
            String groupName,
            UUID templateId,
            String templateName,
            String templateVersion,
            BigDecimal minimumScore,
            BigDecimal maximumScore,
            BigDecimal passingScore,
            LocalDate evaluationDate,
            BigDecimal overallScore,
            String evaluatorComment,
            String evaluatorName,
            java.time.OffsetDateTime publishedAt
    ) {
    }

    private record StudentRecord(
            UUID id,
            String studentNumber,
            String firstName,
            String lastName
    ) {
    }

    private record GroupRecord(
            UUID id,
            String code,
            String name,
            UUID programId,
            String programName,
            UUID termId,
            String termName
    ) {
    }

    private record PassingSummary(
            int passed,
            int denominator,
            BigDecimal percentage
    ) {
    }

    private record AttendanceCount(
            int attended,
            int denominator
    ) {
    }

    private record ProgressCount(
            int total,
            int completed
    ) {
    }

    private record GroupEvaluationRecord(
            UUID studentId,
            String studentNumber,
            String firstName,
            String lastName,
            LocalDate evaluationDate,
            BigDecimal normalizedScore,
            boolean hasPassingScore,
            boolean passed
    ) {
    }

    private static final class MutableStudentPerformance {

        private final UUID studentId;
        private final String studentNumber;
        private final String firstName;
        private final String lastName;

        private final List<ScorePoint> scores =
                new ArrayList<>();

        private MutableStudentPerformance(
                UUID studentId,
                String studentNumber,
                String firstName,
                String lastName
        ) {
            this.studentId = studentId;
            this.studentNumber = studentNumber;
            this.firstName = firstName;
            this.lastName = lastName;
        }

        private void add(
                LocalDate date,
                BigDecimal score
        ) {
            scores.add(
                    new ScorePoint(date, score)
            );
        }

        private GroupStudentPerformanceResponse
        toResponse() {
            scores.sort(
                    java.util.Comparator.comparing(
                            ScorePoint::date
                    )
            );

            List<BigDecimal> values =
                    scores.stream()
                            .map(ScorePoint::score)
                            .toList();

            BigDecimal average = averageValues(values);

            BigDecimal latest = scores.isEmpty()
                    ? null
                    : scores.get(
                            scores.size() - 1
                    ).score();

            BigDecimal first = scores.isEmpty()
                    ? null
                    : scores.get(0).score();

            BigDecimal trend =
                    latest == null || first == null
                            ? null
                            : latest.subtract(first)
                            .setScale(
                                    2,
                                    RoundingMode.HALF_UP
                            );

            return new GroupStudentPerformanceResponse(
                    studentId,
                    studentNumber,
                    firstName,
                    lastName,
                    scores.size(),
                    average,
                    latest,
                    trend,
                    statusForAverage(average)
            );
        }

        private static BigDecimal averageValues(
                List<BigDecimal> values
        ) {
            if (values.isEmpty()) {
                return null;
            }

            BigDecimal total = values.stream()
                    .reduce(
                            BigDecimal.ZERO,
                            BigDecimal::add
                    );

            return total.divide(
                    BigDecimal.valueOf(
                            values.size()
                    ),
                    2,
                    RoundingMode.HALF_UP
            );
        }

        private static DevelopmentStatus
        statusForAverage(BigDecimal average) {
            if (average == null) {
                return DevelopmentStatus.NO_DATA;
            }

            if (average.compareTo(
                    new BigDecimal("50.00")
            ) < 0) {
                return DevelopmentStatus.NEEDS_SUPPORT;
            }

            if (average.compareTo(
                    new BigDecimal("70.00")
            ) < 0) {
                return DevelopmentStatus.DEVELOPING;
            }

            if (average.compareTo(
                    new BigDecimal("85.00")
            ) < 0) {
                return DevelopmentStatus.ON_TRACK;
            }

            return DevelopmentStatus
                    .EXCEEDING_EXPECTATIONS;
        }

        private record ScorePoint(
                LocalDate date,
                BigDecimal score
        ) {
        }
    }
}
