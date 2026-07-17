package com.academy.platform.staff;

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
@RequestMapping("/api/v1/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(
            StaffService staffService
    ) {
        this.staffService = staffService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('staff.read')")
    public List<StaffResponse> findStaff(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(defaultValue = "")
            String search,

            @RequestParam(defaultValue = "false")
            boolean includeArchived
    ) {
        return staffService.findStaff(
                currentUser.organizationId(),
                search,
                includeArchived
        );
    }

    @GetMapping("/{staffId}")
    @PreAuthorize("hasAuthority('staff.read')")
    public StaffResponse findStaffMember(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID staffId
    ) {
        return staffService.findStaffMember(
                currentUser.organizationId(),
                staffId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('staff.manage')")
    public ResponseEntity<StaffResponse> createStaff(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            SaveStaffRequest request
    ) {
        StaffResponse staff =
                staffService.createStaff(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/staff/"
                                        + staff.id()
                        )
                )
                .body(staff);
    }

    @PutMapping("/{staffId}")
    @PreAuthorize("hasAuthority('staff.manage')")
    public StaffResponse updateStaff(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID staffId,

            @Valid
            @RequestBody
            SaveStaffRequest request
    ) {
        return staffService.updateStaff(
                currentUser,
                staffId,
                request
        );
    }

    @PostMapping("/{staffId}/status/{status}")
    @PreAuthorize("hasAuthority('staff.manage')")
    public ResponseEntity<Void> updateStatus(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID staffId,

            @PathVariable
            EmploymentStatus status
    ) {
        staffService.updateEmploymentStatus(
                currentUser,
                staffId,
                status
        );

        return ResponseEntity.noContent().build();
    }
}
