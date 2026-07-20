package com.academy.platform.curriculumassignment;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(
        "/api/v1/groups/{groupId}/curriculum-assignments"
)
public class GroupCurriculumAssignmentController {

    private final GroupCurriculumAssignmentService service;

    public GroupCurriculumAssignmentController(
            GroupCurriculumAssignmentService service
    ) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize(
            "hasAuthority('group_curricula.read')"
    )
    public List<GroupCurriculumAssignmentResponse>
    findAssignments(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @RequestParam(defaultValue = "false")
            boolean includeHistory
    ) {
        return service.findAssignments(
                currentUser.organizationId(),
                groupId,
                includeHistory
        );
    }

    @PostMapping
    @PreAuthorize(
            "hasAuthority('group_curricula.manage')"
    )
    public ResponseEntity<GroupCurriculumProgressResponse>
    assignCurriculum(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @Valid
            @RequestBody
            CreateGroupCurriculumAssignmentRequest request
    ) {
        GroupCurriculumProgressResponse progress =
                service.assignCurriculum(
                        currentUser,
                        groupId,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/groups/"
                                        + groupId
                                        + "/curriculum-assignments/"
                                        + progress.assignment().id()
                        )
                )
                .body(progress);
    }

    @PostMapping("/replace")
    @PreAuthorize(
            "hasAuthority('group_curricula.manage')"
    )
    public GroupCurriculumProgressResponse replaceCurriculum(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @Valid
            @RequestBody
            ReplaceGroupCurriculumRequest request
    ) {
        return service.replaceCurriculum(
                currentUser,
                groupId,
                request
        );
    }

    @PostMapping("/{assignmentId}/end")
    @PreAuthorize(
            "hasAuthority('group_curricula.manage')"
    )
    public GroupCurriculumAssignmentResponse endAssignment(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @PathVariable
            UUID assignmentId,

            @Valid
            @RequestBody
            EndGroupCurriculumAssignmentRequest request
    ) {
        return service.endAssignment(
                currentUser,
                groupId,
                assignmentId,
                request
        );
    }

    @GetMapping("/active/progress")
    @PreAuthorize(
            "hasAuthority('group_curricula.read')"
    )
    public GroupCurriculumProgressResponse
    findActiveProgress(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId
    ) {
        return service.findActiveProgress(
                currentUser.organizationId(),
                groupId
        );
    }

    @GetMapping("/{assignmentId}/progress")
    @PreAuthorize(
            "hasAuthority('group_curricula.read')"
    )
    public GroupCurriculumProgressResponse findProgress(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @PathVariable
            UUID assignmentId
    ) {
        return service.findProgress(
                currentUser.organizationId(),
                groupId,
                assignmentId
        );
    }

    @PutMapping(
            "/{assignmentId}/units/{unitId}/progress"
    )
    @PreAuthorize(
            "hasAuthority('group_curricula.manage')"
    )
    public CurriculumUnitProgressResponse updateProgress(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @PathVariable
            UUID assignmentId,

            @PathVariable
            UUID unitId,

            @Valid
            @RequestBody
            UpdateCurriculumUnitProgressRequest request
    ) {
        return service.updateUnitProgress(
                currentUser,
                groupId,
                assignmentId,
                unitId,
                request
        );
    }
}
