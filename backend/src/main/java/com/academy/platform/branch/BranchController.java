package com.academy.platform.branch;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/branches")
public class BranchController {

    private final BranchService branchService;

    public BranchController(
            BranchService branchService
    ) {
        this.branchService = branchService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('branches.read')")
    public List<BranchResponse> findBranches(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(defaultValue = "false")
            boolean includeArchived
    ) {
        return branchService.findBranches(
                currentUser.organizationId(),
                includeArchived
        );
    }

    @GetMapping("/{branchId}")
    @PreAuthorize("hasAuthority('branches.read')")
    public BranchResponse findBranch(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID branchId
    ) {
        return branchService.findBranch(
                currentUser.organizationId(),
                branchId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('branches.manage')")
    public ResponseEntity<BranchResponse> createBranch(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            SaveBranchRequest request
    ) {
        BranchResponse branch =
                branchService.createBranch(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/branches/"
                                        + branch.id()
                        )
                )
                .body(branch);
    }

    @PutMapping("/{branchId}")
    @PreAuthorize("hasAuthority('branches.manage')")
    public BranchResponse updateBranch(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID branchId,

            @Valid
            @RequestBody
            SaveBranchRequest request
    ) {
        return branchService.updateBranch(
                currentUser,
                branchId,
                request
        );
    }

    @PostMapping("/{branchId}/archive")
    @PreAuthorize("hasAuthority('branches.manage')")
    public ResponseEntity<Void> archiveBranch(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID branchId
    ) {
        branchService.archiveBranch(
                currentUser,
                branchId
        );

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{branchId}/activate")
    @PreAuthorize("hasAuthority('branches.manage')")
    public ResponseEntity<Void> activateBranch(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID branchId
    ) {
        branchService.activateBranch(
                currentUser,
                branchId
        );

        return ResponseEntity.noContent().build();
    }
}
