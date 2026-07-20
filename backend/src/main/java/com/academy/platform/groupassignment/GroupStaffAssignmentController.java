package com.academy.platform.groupassignment;

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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/groups/{groupId}/staff-assignments")
public class GroupStaffAssignmentController {

    private final GroupStaffAssignmentService assignmentService;

    public GroupStaffAssignmentController(
            GroupStaffAssignmentService assignmentService
    ) {
        this.assignmentService = assignmentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('group_staff.read')")
    public List<GroupStaffAssignmentResponse> findAssignments(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @RequestParam(defaultValue = "false")
            boolean includeHistory
    ) {
        return assignmentService.findAssignments(
                currentUser.organizationId(),
                groupId,
                includeHistory
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('group_staff.manage')")
    public ResponseEntity<GroupStaffAssignmentResponse> assignStaff(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @Valid
            @RequestBody
            CreateGroupStaffAssignmentRequest request
    ) {
        GroupStaffAssignmentResponse assignment =
                assignmentService.assignStaff(
                        currentUser,
                        groupId,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/groups/"
                                        + groupId
                                        + "/staff-assignments/"
                                        + assignment.id()
                        )
                )
                .body(assignment);
    }

    @PostMapping("/{assignmentId}/end")
    @PreAuthorize("hasAuthority('group_staff.manage')")
    public GroupStaffAssignmentResponse endAssignment(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @PathVariable
            UUID assignmentId,

            @Valid
            @RequestBody
            EndGroupStaffAssignmentRequest request
    ) {
        return assignmentService.endAssignment(
                currentUser,
                groupId,
                assignmentId,
                request
        );
    }
}
