package com.academy.platform.evaluation;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

import com.academy.platform.IntegrationTestSupport;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;

import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.status;

class EvaluationPublicationIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void submittedEvaluationCanBePublishedAndReported()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createSubmittedEvaluation();

        mockMvc.perform(
                        post(
                                "/api/v1/evaluations/{id}/publish",
                                structure.evaluationId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.status")
                                .value("PUBLISHED")
                );

        mockMvc.perform(
                        get(
                                "/api/v1/students/{studentId}"
                                        + "/published-evaluations",
                                structure.studentId()
                        )
                                .cookie(administrator)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$[0].overallScore")
                                .value(76.0)
                )
                .andExpect(
                        jsonPath("$[0].normalizedScore")
                                .value(76.0)
                );

        mockMvc.perform(
                        get(
                                "/api/v1/students/{studentId}"
                                        + "/development-summary",
                                structure.studentId()
                        )
                                .cookie(administrator)
                                .param(
                                        "groupId",
                                        structure.groupId()
                                                .toString()
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath(
                                "$.publishedEvaluationCount"
                        ).value(1)
                )
                .andExpect(
                        jsonPath(
                                "$.averageNormalizedScore"
                        ).value(76.0)
                )
                .andExpect(
                        jsonPath("$.developmentStatus")
                                .value("ON_TRACK")
                );
    }

    @Test
    void draftEvaluationCannotBePublished()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createSubmittedEvaluation();

        jdbcTemplate.update(
                """
                UPDATE student_evaluations
                SET
                    status = 'DRAFT',
                    submitted_by = NULL,
                    submitted_at = NULL
                WHERE id = ?
                """,
                structure.evaluationId()
        );

        mockMvc.perform(
                        post(
                                "/api/v1/evaluations/{id}/publish",
                                structure.evaluationId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                )
                .andExpect(
                        status().isUnprocessableEntity()
                );
    }

    @Test
    void unpublishedEvaluationsAreExcludedFromReports()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createSubmittedEvaluation();

        mockMvc.perform(
                        get(
                                "/api/v1/students/{studentId}"
                                        + "/published-evaluations",
                                structure.studentId()
                        )
                                .cookie(administrator)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.length()")
                                .value(0)
                );
    }

    private TestStructure createSubmittedEvaluation() {
        UUID organizationId =
                findOrganizationId();

        UUID adminUserId = findAdminUserId();

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
        UUID templateId = UUID.randomUUID();
        UUID evaluationId = UUID.randomUUID();

        UUID firstCriterionId = UUID.randomUUID();
        UUID secondCriterionId = UUID.randomUUID();

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
                "PRG-" + suffix,
                "Program " + suffix,
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
                    '2026-09-01',
                    '2027-06-30',
                    'ACTIVE', ?, ?, 0
                )
                """,
                termId,
                organizationId,
                "TERM-" + suffix,
                "Term " + suffix,
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
                "GRP-" + suffix,
                "Group " + suffix,
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
                    ?, ?, ?, 'Test', 'Student',
                    'ACTIVE', ?, ?, 0
                )
                """,
                studentId,
                organizationId,
                "STU-" + suffix,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO group_enrollments
                (
                    id, organization_id, group_id,
                    student_id, status, enrolled_at,
                    created_by, created_at,
                    updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE',
                    '2026-09-01', ?, ?, ?, 0
                )
                """,
                UUID.randomUUID(),
                organizationId,
                groupId,
                studentId,
                adminUserId,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO evaluation_templates
                (
                    id, organization_id, program_id,
                    code, name, version_label,
                    minimum_score, maximum_score,
                    passing_score, status,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, ?, '1.0',
                    0, 100, 60, 'ACTIVE',
                    ?, ?, 0
                )
                """,
                templateId,
                organizationId,
                programId,
                "EVAL-" + suffix,
                "Evaluation " + suffix,
                now,
                now
        );

        createCriterion(
                organizationId,
                templateId,
                firstCriterionId,
                "TECH-" + suffix,
                "Technical",
                60,
                1,
                now
        );

        createCriterion(
                organizationId,
                templateId,
                secondCriterionId,
                "TEAM-" + suffix,
                "Teamwork",
                40,
                2,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO student_evaluations
                (
                    id, organization_id, student_id,
                    group_id, template_id,
                    evaluator_user_id, evaluation_date,
                    overall_score, evaluator_comment,
                    status, submitted_by, submitted_at,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?,
                    '2026-09-15', 76,
                    'Good progress',
                    'SUBMITTED', ?, ?, ?, ?, 0
                )
                """,
                evaluationId,
                organizationId,
                studentId,
                groupId,
                templateId,
                adminUserId,
                adminUserId,
                now,
                now,
                now
        );

        createScore(
                organizationId,
                evaluationId,
                templateId,
                firstCriterionId,
                80,
                48,
                now
        );

        createScore(
                organizationId,
                evaluationId,
                templateId,
                secondCriterionId,
                70,
                28,
                now
        );

        return new TestStructure(
                groupId,
                studentId,
                evaluationId
        );
    }

    private void createCriterion(
            UUID organizationId,
            UUID templateId,
            UUID criterionId,
            String code,
            String name,
            int weight,
            int sequence,
            OffsetDateTime now
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO evaluation_criteria
                (
                    id, organization_id, template_id,
                    code, name, weight_percentage,
                    sequence_number,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, 0
                )
                """,
                criterionId,
                organizationId,
                templateId,
                code,
                name,
                weight,
                sequence,
                now,
                now
        );
    }

    private void createScore(
            UUID organizationId,
            UUID evaluationId,
            UUID templateId,
            UUID criterionId,
            int score,
            int weightedScore,
            OffsetDateTime now
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO student_evaluation_scores
                (
                    id, organization_id, evaluation_id,
                    template_id, criterion_id,
                    score, weighted_score,
                    created_at, updated_at, version
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, 0
                )
                """,
                UUID.randomUUID(),
                organizationId,
                evaluationId,
                templateId,
                criterionId,
                score,
                weightedScore,
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

    private record TestStructure(
            UUID groupId,
            UUID studentId,
            UUID evaluationId
    ) {
    }
}
