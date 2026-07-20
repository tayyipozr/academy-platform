package com.academy.platform.term;

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
@RequestMapping("/api/v1/terms")
public class TermController {

    private final TermService termService;

    public TermController(TermService termService) {
        this.termService = termService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('terms.read')")
    public List<TermResponse> findTerms(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(defaultValue = "")
            String search,

            @RequestParam(defaultValue = "false")
            boolean includeArchived
    ) {
        return termService.findTerms(
                currentUser.organizationId(),
                search,
                includeArchived
        );
    }

    @GetMapping("/{termId}")
    @PreAuthorize("hasAuthority('terms.read')")
    public TermResponse findTerm(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID termId
    ) {
        return termService.findTerm(
                currentUser.organizationId(),
                termId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('terms.manage')")
    public ResponseEntity<TermResponse> createTerm(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            SaveTermRequest request
    ) {
        TermResponse term = termService.createTerm(
                currentUser,
                request
        );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/terms/" + term.id()
                        )
                )
                .body(term);
    }

    @PutMapping("/{termId}")
    @PreAuthorize("hasAuthority('terms.manage')")
    public TermResponse updateTerm(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID termId,

            @Valid
            @RequestBody
            SaveTermRequest request
    ) {
        return termService.updateTerm(
                currentUser,
                termId,
                request
        );
    }

    @PostMapping("/{termId}/status/{status}")
    @PreAuthorize("hasAuthority('terms.manage')")
    public ResponseEntity<Void> updateStatus(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID termId,

            @PathVariable
            TermStatus status
    ) {
        termService.updateStatus(
                currentUser,
                termId,
                status
        );

        return ResponseEntity.noContent().build();
    }
}
