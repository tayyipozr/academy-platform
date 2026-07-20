package com.academy.platform.program;

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
@RequestMapping("/api/v1/programs")
public class ProgramController {

    private final ProgramService programService;

    public ProgramController(
            ProgramService programService
    ) {
        this.programService = programService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('programs.read')")
    public List<ProgramResponse> findPrograms(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(defaultValue = "")
            String search,

            @RequestParam(defaultValue = "false")
            boolean includeArchived
    ) {
        return programService.findPrograms(
                currentUser.organizationId(),
                search,
                includeArchived
        );
    }

    @GetMapping("/{programId}")
    @PreAuthorize("hasAuthority('programs.read')")
    public ProgramResponse findProgram(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID programId
    ) {
        return programService.findProgram(
                currentUser.organizationId(),
                programId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('programs.manage')")
    public ResponseEntity<ProgramResponse> createProgram(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            SaveProgramRequest request
    ) {
        ProgramResponse program =
                programService.createProgram(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/programs/"
                                        + program.id()
                        )
                )
                .body(program);
    }

    @PutMapping("/{programId}")
    @PreAuthorize("hasAuthority('programs.manage')")
    public ProgramResponse updateProgram(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID programId,

            @Valid
            @RequestBody
            SaveProgramRequest request
    ) {
        return programService.updateProgram(
                currentUser,
                programId,
                request
        );
    }

    @PostMapping("/{programId}/status/{status}")
    @PreAuthorize("hasAuthority('programs.manage')")
    public ResponseEntity<Void> updateStatus(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID programId,

            @PathVariable
            ProgramStatus status
    ) {
        programService.updateStatus(
                currentUser,
                programId,
                status
        );

        return ResponseEntity.noContent().build();
    }
}
