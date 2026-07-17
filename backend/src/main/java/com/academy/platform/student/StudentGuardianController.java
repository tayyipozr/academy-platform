package com.academy.platform.student;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/students/{studentId}/guardians")
public class StudentGuardianController {

    private final StudentGuardianService relationshipService;

    public StudentGuardianController(
            StudentGuardianService relationshipService
    ) {
        this.relationshipService = relationshipService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('students.read')")
    public List<StudentGuardianResponse> findGuardians(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId
    ) {
        return relationshipService.findGuardians(
                currentUser.organizationId(),
                studentId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('students.manage')")
    public ResponseEntity<StudentGuardianResponse> linkGuardian(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId,

            @Valid
            @RequestBody
            SaveStudentGuardianRequest request
    ) {
        StudentGuardianResponse relationship =
                relationshipService.linkGuardian(
                        currentUser,
                        studentId,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/students/"
                                        + studentId
                                        + "/guardians/"
                                        + relationship.guardianId()
                        )
                )
                .body(relationship);
    }

    @PutMapping("/{guardianId}")
    @PreAuthorize("hasAuthority('students.manage')")
    public StudentGuardianResponse updateRelationship(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId,

            @PathVariable
            UUID guardianId,

            @Valid
            @RequestBody
            SaveStudentGuardianRequest request
    ) {
        return relationshipService.updateRelationship(
                currentUser,
                studentId,
                guardianId,
                request
        );
    }

    @DeleteMapping("/{guardianId}")
    @PreAuthorize("hasAuthority('students.manage')")
    public ResponseEntity<Void> unlinkGuardian(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId,

            @PathVariable
            UUID guardianId
    ) {
        relationshipService.unlinkGuardian(
                currentUser,
                studentId,
                guardianId
        );

        return ResponseEntity.noContent().build();
    }
}
