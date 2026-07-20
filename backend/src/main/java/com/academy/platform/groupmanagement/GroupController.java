package com.academy.platform.groupmanagement;

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
@RequestMapping("/api/v1/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('groups.read')")
    public List<GroupResponse> findGroups(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(defaultValue = "")
            String search,

            @RequestParam(required = false)
            UUID programId,

            @RequestParam(required = false)
            UUID termId,

            @RequestParam(required = false)
            UUID branchId,

            @RequestParam(defaultValue = "false")
            boolean includeArchived
    ) {
        return groupService.findGroups(
                currentUser.organizationId(),
                search,
                programId,
                termId,
                branchId,
                includeArchived
        );
    }

    @GetMapping("/{groupId}")
    @PreAuthorize("hasAuthority('groups.read')")
    public GroupResponse findGroup(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId
    ) {
        return groupService.findGroup(
                currentUser.organizationId(),
                groupId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('groups.manage')")
    public ResponseEntity<GroupResponse> createGroup(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            SaveGroupRequest request
    ) {
        GroupResponse group =
                groupService.createGroup(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/groups/"
                                        + group.id()
                        )
                )
                .body(group);
    }

    @PutMapping("/{groupId}")
    @PreAuthorize("hasAuthority('groups.manage')")
    public GroupResponse updateGroup(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @Valid
            @RequestBody
            SaveGroupRequest request
    ) {
        return groupService.updateGroup(
                currentUser,
                groupId,
                request
        );
    }

    @PostMapping("/{groupId}/status/{status}")
    @PreAuthorize("hasAuthority('groups.manage')")
    public ResponseEntity<Void> updateStatus(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @PathVariable
            GroupStatus status
    ) {
        groupService.updateStatus(
                currentUser,
                groupId,
                status
        );

        return ResponseEntity.noContent().build();
    }
}
