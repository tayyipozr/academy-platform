package com.academy.platform.authorization;

import java.util.List;

import com.academy.platform.authentication.AuthenticatedUser;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/roles")
public class RoleController {

    private final RoleQueryService roleQueryService;

    public RoleController(
            RoleQueryService roleQueryService
    ) {
        this.roleQueryService = roleQueryService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('roles.read')")
    public List<RoleResponse> findRoles(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser
    ) {
        return roleQueryService.findOrganizationRoles(
                currentUser.organizationId()
        );
    }
}
