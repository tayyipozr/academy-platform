package com.academy.platform.evaluation;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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

class StudentEvaluationIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanCreateAndSubmitEvaluation()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createStructure();

        var result = mockMvc.perform(
                        post("/api/v1/evaluations")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "studentId": "%s",
                                          "groupId": "%s",
                                          "sessionId": null,
                                          "templateId": "%s",
                                          "evaluationDate": "2026-09-15",
                                          "evaluatorComment": "Good progress",
                                          "scores": [
                                            {
                                              "criterionId": "%s",
                                              "score": 80,
                                              "comment": "Technical score"
                                            },
                                            {
                                              "criterionId": "%s",
                                              "score": 70,
                                              "comment": "Teamwork score"
                                            }
                                          ]
                                        }
                                        """.formatted(
                                        structure.studentId(),
                                        structure.groupId(),
                                        structure.templateId(),
                                        structure.firstCriterionId(),
                                        structure.secondCriterionId()
                                ))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.status")
                                .value("DRAFT")
                )
                .andExpect(
                        jsonPath("$.complete")
                                .value(true)
                )
                .andExpect(
                        jsonPath("$.overallScore")
                                .value(76.0)
                )
                .andReturn();

        String evaluationId =
                com.jayway.jsonpath.JsonPath.read(
                        result.getResponse()
                                .getContentAsString(),
                        "$.id"
                );

        mockMvc.perform(
                        post(
                                "/api/v1/evaluations/{id}/submit",
                                evaluationId
                        )
                                .cookie(administrator)
                                .with(csrf())
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.status")
                                .value("SUBMITTED")
                )
                .andExpect(
                        jsonPath("$.submittedAt")
                                .isNotEmpty()
                );
    }

    @Test
    void partialDraftCannotBeSubmitted()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createStructure();

        var result = mockMvc.perform(
                        post("/api/v1/evaluations")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "studentId": "%s",
                                          "groupId": "%s",
                                          "sessionId": null,
                                          "templateId": "%s",
                                          "evaluationDate": "2026-09-15",
                                          "evaluatorComment": null,
                                          "scores": [
                                            {
                                              "criterionId": "%s",
                                              "score": 80,
                                              "comment": null
                                            }
                                          ]
                                        }
                                        """.formatted(
                                        structure.studentId(),
                                        structure.groupId(),
                                        structure.templateId(),
                                        structure.firstCriterionId()
                                ))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.complete")
                                .value(false)
                )
                .andExpect(
                        jsonPath("$.overallScore")
                                .doesNotExist()
                )
                .andReturn();

        String evaluationId =
                com.jayway.jsonpath.JsonPath.read(
                        result.getResponse()
                                .getContentAsString(),
                        "$.id"
                );

        mockMvc.perform(
                        post(
                                "/api/v1/evaluations/{id}/submit",
                                evaluationId
                        )
                                .cookie(administrator)
                                .with(csrf())
                )
                .andExpect(
                        status().isUnprocessableEntity()
                );
    }

    @Test
    void outOfRangeScoreIsRejected()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createStructure();

        mockMvc.perform(
                        post("/api/v1/evaluations")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "studentId": "%s",
                                          "groupId": "%s",
                                          "sessionId": null,
                                          "templateId": "%s",
                                          "evaluationDate": "2026-09-15",
                                          "evaluatorComment": null,
                                          "scores": [
                                            {
                                              "criterionId": "%s",
                                              "score": 150,
                                              "comment": null
                                            }
                                          ]
                                        }
                                        """.formatted(
                                        structure.studentId(),
                                        structure.groupId(),
                                        structure.templateId(),
                                        structure.firstCriterionId()
                                ))
                )
                .andExpect(
                        status().isUnprocessableEntity()
                )
                .andExpect(
                        jsonPath("$.code")
                                .value(
                                        "BUSINESS_RULE_VIOLATION"
                                )
                );
    }

    @Test
    void unenrolledStudentCannotBeEvaluated()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createStructure();

        UUID otherStudentId =
                createStudent(
                        structure.organizationId(),
                        "OTHER-" + suffix()
                );

        mockMvc.perform(
                        post("/api/v1/evaluations")
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "studentId": "%s",
                                          "groupId": "%s",
                                          "sessionId": null,
                                          "templateId": "%s",
                                          "evaluationDate": "2026-09-15",
                                          "evaluatorComment": null,
                                          "scores": []
                                        }
                                        """.formatted(
                                        otherStudentId,
                                        structure.groupId(),
                                        structure.templateId()
                                ))
                )
                .andExpect(
                        status().isUnprocessableEntity()
                );
    }

    private TestStructure createStructure() {
        UUID organizationId =
                findOrganizationId();

        UUID adminUserId =
                findAdminUserId();

        String suffix = suffix();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        UUID programId = UUID.randomUUID();
        UUID termId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID studentId = createStudent(
                organizationId,
                suffix
        );

        UUID templateId = UUID.randomUUID();
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
                    'ACTIVE',
                    ?, ?, 0
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

        return new TestStructure(
                organizationId,
                groupId,
                studentId,
                templateId,
                firstCriterionId,
                secondCriterionId
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

    private UUID createStudent(
            UUID organizationId,
            String suffix
    ) {
        UUID studentId = UUID.randomUUID();

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

    private record TestStructure(
            UUID organizationId,
            UUID groupId,
            UUID studentId,
            UUID templateId,
            UUID firstCriterionId,
            UUID secondCriterionId
    ) {
    }
}
