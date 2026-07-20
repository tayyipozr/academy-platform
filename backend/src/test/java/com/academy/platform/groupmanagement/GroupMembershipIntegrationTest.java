package com.academy.platform.groupmanagement;

import java.time.LocalDate;
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

class GroupMembershipIntegrationTest
        extends IntegrationTestSupport {

    @Test
    void administratorCanEnrollStudentInGroup()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createTestStructure(20, 10, 14);

        UUID studentId = createStudent(
                structure.organizationId(),
                LocalDate.of(2014, 5, 10)
        );

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}/enrollments",
                                structure.groupId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "studentId": "%s",
                                          "enrolledAt": "2026-09-01"
                                        }
                                        """.formatted(studentId))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.studentId")
                                .value(studentId.toString())
                )
                .andExpect(
                        jsonPath("$.status")
                                .value("ACTIVE")
                );
    }

    @Test
    void groupCapacityIsEnforced()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createTestStructure(1, null, null);

        UUID firstStudent = createStudent(
                structure.organizationId(),
                LocalDate.of(2014, 5, 10)
        );

        UUID secondStudent = createStudent(
                structure.organizationId(),
                LocalDate.of(2014, 6, 10)
        );

        enrollDirectly(
                structure.organizationId(),
                structure.groupId(),
                firstStudent
        );

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}/enrollments",
                                structure.groupId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "studentId": "%s",
                                          "enrolledAt": "2026-09-01"
                                        }
                                        """.formatted(secondStudent))
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
    void studentAgeRangeIsEnforced()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createTestStructure(20, 10, 12);

        UUID studentId = createStudent(
                structure.organizationId(),
                LocalDate.of(2020, 1, 1)
        );

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}/enrollments",
                                structure.groupId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "studentId": "%s",
                                          "enrolledAt": "2026-09-01"
                                        }
                                        """.formatted(studentId))
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
    void administratorCanAssignPrimaryInstructor()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createTestStructure(20, null, null);

        UUID staffId = createStaffMember(
                structure.organizationId()
        );

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}/staff-assignments",
                                structure.groupId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "staffId": "%s",
                                          "assignmentRole": "PRIMARY_INSTRUCTOR",
                                          "startDate": "2026-09-01"
                                        }
                                        """.formatted(staffId))
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.staffId")
                                .value(staffId.toString())
                )
                .andExpect(
                        jsonPath("$.assignmentRole")
                                .value(
                                        "PRIMARY_INSTRUCTOR"
                                )
                );
    }

    @Test
    void secondActivePrimaryInstructorIsRejected()
            throws Exception {

        Cookie administrator =
                loginAsAdministrator();

        TestStructure structure =
                createTestStructure(20, null, null);

        UUID firstStaff = createStaffMember(
                structure.organizationId()
        );

        UUID secondStaff = createStaffMember(
                structure.organizationId()
        );

        assignStaffDirectly(
                structure.organizationId(),
                structure.groupId(),
                firstStaff,
                "PRIMARY_INSTRUCTOR"
        );

        mockMvc.perform(
                        post(
                                "/api/v1/groups/{groupId}/staff-assignments",
                                structure.groupId()
                        )
                                .cookie(administrator)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "staffId": "%s",
                                          "assignmentRole": "PRIMARY_INSTRUCTOR",
                                          "startDate": "2026-09-01"
                                        }
                                        """.formatted(secondStaff))
                )
                .andExpect(status().isConflict())
                .andExpect(
                        jsonPath("$.code")
                                .value("RESOURCE_CONFLICT")
                );
    }

    private TestStructure createTestStructure(
            int capacity,
            Integer minimumAge,
            Integer maximumAge
    ) {
        UUID organizationId =
                findTestOrganizationId();

        String suffix = UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        UUID programId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO programs
                (
                    id,
                    organization_id,
                    code,
                    name,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, 0)
                """,
                programId,
                organizationId,
                "PRG-" + suffix,
                "Program " + suffix,
                now,
                now
        );

        UUID termId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO operational_terms
                (
                    id,
                    organization_id,
                    code,
                    name,
                    start_date,
                    end_date,
                    status,
                    created_at,
                    updated_at,
                    version
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

        UUID groupId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO academy_groups
                (
                    id,
                    organization_id,
                    program_id,
                    term_id,
                    code,
                    name,
                    capacity,
                    minimum_age,
                    maximum_age,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    'ACTIVE', ?, ?, 0
                )
                """,
                groupId,
                organizationId,
                programId,
                termId,
                "GRP-" + suffix,
                "Group " + suffix,
                capacity,
                minimumAge,
                maximumAge,
                now,
                now
        );

        return new TestStructure(
                organizationId,
                groupId
        );
    }

    private UUID createStudent(
            UUID organizationId,
            LocalDate birthDate
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
                    birth_date,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, 'Test', 'Student',
                    ?, 'ACTIVE',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                studentId,
                organizationId,
                "STU-" + suffix,
                birthDate
        );

        return studentId;
    }

    private UUID createStaffMember(
            UUID organizationId
    ) {
        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        UUID instructorRoleId =
                findRoleId("INSTRUCTOR");

        UUID userId = UUID.randomUUID();
        UUID membershipId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();

        String suffix = staffId.toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        jdbcTemplate.update(
                """
                INSERT INTO users
                (
                    id,
                    email,
                    password_hash,
                    first_name,
                    last_name,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, 'Test', 'Instructor',
                    'ACTIVE', ?, ?, 0
                )
                """,
                userId,
                "staff-" + userId + "@test.com",
                passwordEncoder.encode(
                        "InstructorPassword123!"
                ),
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO organization_memberships
                (
                    id,
                    organization_id,
                    user_id,
                    status,
                    display_first_name,
                    display_last_name,
                    security_version,
                    joined_at,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, 'ACTIVE',
                    'Test', 'Instructor',
                    0, ?, ?, ?, 0
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
                instructorRoleId
        );

        jdbcTemplate.update(
                """
                INSERT INTO staff_members
                (
                    id,
                    organization_id,
                    membership_id,
                    staff_number,
                    employment_status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE', ?, ?, 0
                )
                """,
                staffId,
                organizationId,
                membershipId,
                "STAFF-" + suffix,
                now,
                now
        );

        return staffId;
    }

    private void enrollDirectly(
            UUID organizationId,
            UUID groupId,
            UUID studentId
    ) {
        UUID adminUserId =
                findTestAdministratorUserId();

        jdbcTemplate.update(
                """
                INSERT INTO group_enrollments
                (
                    id,
                    organization_id,
                    group_id,
                    student_id,
                    status,
                    enrolled_at,
                    created_by,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, 'ACTIVE',
                    '2026-09-01', ?,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                UUID.randomUUID(),
                organizationId,
                groupId,
                studentId,
                adminUserId
        );
    }

    private void assignStaffDirectly(
            UUID organizationId,
            UUID groupId,
            UUID staffId,
            String assignmentRole
    ) {
        UUID adminUserId =
                findTestAdministratorUserId();

        jdbcTemplate.update(
                """
                INSERT INTO group_staff_assignments
                (
                    id,
                    organization_id,
                    group_id,
                    staff_id,
                    assignment_role,
                    status,
                    start_date,
                    created_by,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?, ?, ?, ?, ?, 'ACTIVE',
                    '2026-09-01', ?,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
                """,
                UUID.randomUUID(),
                organizationId,
                groupId,
                staffId,
                assignmentRole,
                adminUserId
        );
    }

    private UUID findTestOrganizationId() {
        return jdbcTemplate.queryForObject(
                """
                SELECT id
                FROM organizations
                WHERE slug = 'test-academy'
                """,
                UUID.class
        );
    }

    private UUID findTestAdministratorUserId() {
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
            UUID organizationId,
            UUID groupId
    ) {
    }
}
