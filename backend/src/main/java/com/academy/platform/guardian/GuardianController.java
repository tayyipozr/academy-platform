package com.academy.platform.guardian;

import java.net.URI;
import java.util.List;
import java.util.UUID;

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

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/guardians")
public class GuardianController {

    private final GuardianService guardianService;

    public GuardianController(
            GuardianService guardianService
    ) {
        this.guardianService = guardianService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('guardians.read')")
    public List<GuardianResponse> findGuardians(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "false") boolean includeArchived
    ) {
        return guardianService.findGuardians(
                currentUser.organizationId(),
                search,
                includeArchived
        );
    }

    @GetMapping("/{guardianId}")
    @PreAuthorize("hasAuthority('guardians.read')")
    public GuardianResponse findGuardian(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID guardianId
    ) {
        return guardianService.findGuardian(
                currentUser.organizationId(),
                guardianId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('guardians.manage')")
    public ResponseEntity<GuardianResponse> createGuardian(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid
            @RequestBody SaveGuardianRequest request
    ) {
        GuardianResponse guardian
                = guardianService.createGuardian(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/guardians/"
                                + guardian.id()
                        )
                )
                .body(guardian);
    }

    @PutMapping("/{guardianId}")
    @PreAuthorize("hasAuthority('guardians.manage')")
    public GuardianResponse updateGuardian(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID guardianId,
            @Valid
            @RequestBody SaveGuardianRequest request
    ) {
        return guardianService.updateGuardian(
                currentUser,
                guardianId,
                request
        );
    }

    @PostMapping("/{guardianId}/status/{status}")
    @PreAuthorize("hasAuthority('guardians.manage')")
    public ResponseEntity<Void> updateStatus(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID guardianId,
            @PathVariable GuardianStatus status
    ) {
        guardianService.updateGuardianStatus(
                currentUser,
                guardianId,
                status
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/students")
    @PreAuthorize(
            "hasAuthority('guardian.linked-students.read')"
    )
    public List<GuardianLinkedStudentResponse>
            findMyLinkedStudents(
                    @AuthenticationPrincipal AuthenticatedUser currentUser
            ) {
        return guardianService.findLinkedStudents(
                currentUser.organizationId(),
                currentUser.membershipId()
        );
    }
}
