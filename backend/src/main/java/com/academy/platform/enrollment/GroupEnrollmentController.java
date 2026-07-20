package com.academy.platform.enrollment;

import java.net.URI;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/groups/{groupId}/enrollments")
public class GroupEnrollmentController {

    private final GroupEnrollmentService enrollmentService;

    public GroupEnrollmentController(
            GroupEnrollmentService enrollmentService
    ) {
        this.enrollmentService = enrollmentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('enrollments.read')")
    public GroupEnrollmentSummaryResponse findEnrollments(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @RequestParam(defaultValue = "false")
            boolean includeHistory
    ) {
        return enrollmentService.findEnrollments(
                currentUser.organizationId(),
                groupId,
                includeHistory
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('enrollments.manage')")
    public ResponseEntity<EnrollmentResponse> enrollStudent(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @Valid
            @RequestBody
            CreateEnrollmentRequest request
    ) {
        EnrollmentResponse enrollment =
                enrollmentService.enrollStudent(
                        currentUser,
                        groupId,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/groups/"
                                        + groupId
                                        + "/enrollments/"
                                        + enrollment.id()
                        )
                )
                .body(enrollment);
    }

    @PostMapping("/{enrollmentId}/end")
    @PreAuthorize("hasAuthority('enrollments.manage')")
    public EnrollmentResponse endEnrollment(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @PathVariable
            UUID enrollmentId,

            @Valid
            @RequestBody
            EndEnrollmentRequest request
    ) {
        return enrollmentService.endEnrollment(
                currentUser,
                groupId,
                enrollmentId,
                request
        );
    }
}
