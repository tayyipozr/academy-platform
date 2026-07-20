package com.academy.platform.scheduling;

import java.net.URI;
import java.time.OffsetDateTime;
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
@RequestMapping("/api/v1/sessions")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(
            SessionService sessionService
    ) {
        this.sessionService = sessionService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('sessions.read')")
    public List<SessionResponse> findSessions(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false) UUID staffId,
            @RequestParam(required = false) SessionStatus status,
            @RequestParam(required = false) OffsetDateTime dateFrom,
            @RequestParam(required = false) OffsetDateTime dateTo
    ) {
        return sessionService.findSessions(
                currentUser,
                groupId,
                staffId,
                status,
                dateFrom,
                dateTo
        );
    }

    @GetMapping("/{sessionId}")
    @PreAuthorize("hasAuthority('sessions.read')")
    public SessionResponse findSession(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID sessionId
    ) {
        return sessionService.findAccessibleSession(
                currentUser,
                sessionId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('sessions.manage')")
    public ResponseEntity<SessionResponse> createSession(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid
            @RequestBody CreateSessionRequest request
    ) {
        SessionResponse session
                = sessionService.createManualSession(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/sessions/"
                                + session.id()
                        )
                )
                .body(session);
    }

    @PutMapping("/{sessionId}/schedule")
    @PreAuthorize("hasAuthority('sessions.manage')")
    public SessionResponse rescheduleSession(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID sessionId,
            @Valid
            @RequestBody RescheduleSessionRequest request
    ) {
        return sessionService.rescheduleSession(
                currentUser,
                sessionId,
                request
        );
    }

    @PostMapping("/{sessionId}/status")
    @PreAuthorize("hasAuthority('sessions.manage')")
    public SessionResponse updateStatus(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID sessionId,
            @Valid
            @RequestBody UpdateSessionStatusRequest request
    ) {
        return sessionService.updateStatus(
                currentUser,
                sessionId,
                request
        );
    }
}
