package com.academy.platform.identity;

import java.net.URI;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.PageResponse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/v1/users")
@Validated
public class OrganizationUserController {

    private final OrganizationUserQueryService queryService;
    private final OrganizationUserCommandService commandService;
    private final OrganizationMembershipAdministrationService membershipAdministrationService;

    public OrganizationUserController(
            OrganizationUserQueryService queryService,
            OrganizationUserCommandService commandService,
            OrganizationMembershipAdministrationService membershipAdministrationService
    ) {
        this.queryService = queryService;
        this.commandService = commandService;
        this.membershipAdministrationService = membershipAdministrationService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('users.read')")
    public PageResponse<OrganizationUserResponse> findUsers(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0")
            @Min(0) int page,
            @RequestParam(defaultValue = "20")
            @Min(1)
            @Max(100) int size
    ) {
        return queryService.findUsers(
                currentUser.organizationId(),
                search,
                page,
                size
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('users.create')")
    public ResponseEntity<Void> createUser(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid
            @RequestBody CreateOrganizationUserRequest request
    ) {
        UUID membershipId
                = commandService.createActiveUser(
                        currentUser.organizationId(),
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/users/" + membershipId
                        )
                )
                .build();
    }

    @PatchMapping("/{membershipId}")
    @PreAuthorize(
            "hasAuthority('users.update') "
            + "and hasAuthority('roles.manage')"
    )
    public ResponseEntity<Void> updateUser(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID membershipId,
            @Valid
            @RequestBody UpdateOrganizationUserRequest request
    ) {
        membershipAdministrationService.updateMembership(
                currentUser,
                membershipId,
                request
        );

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{membershipId}/suspend")
    @PreAuthorize("hasAuthority('users.deactivate')")
    public ResponseEntity<Void> suspendUser(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID membershipId
    ) {
        membershipAdministrationService.suspendMembership(
                currentUser,
                membershipId
        );

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{membershipId}/reactivate")
    @PreAuthorize("hasAuthority('users.update')")
    public ResponseEntity<Void> reactivateUser(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID membershipId
    ) {
        membershipAdministrationService.reactivateMembership(
                currentUser,
                membershipId
        );

        return ResponseEntity.noContent().build();
    }

}
