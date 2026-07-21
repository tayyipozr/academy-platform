package com.academy.platform.media;

import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/guardian-media")
public class GuardianMediaController {

    private final MediaLinkService mediaLinkService;

    public GuardianMediaController(
            MediaLinkService mediaLinkService
    ) {
        this.mediaLinkService = mediaLinkService;
    }

    @GetMapping("/students/{studentId}")
    @PreAuthorize("hasAuthority('media.read')")
    public List<MediaLinkResponse> findStudentMedia(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId
    ) {
        return mediaLinkService.findTargetMedia(
                currentUser,
                MediaTargetType.STUDENT,
                studentId
        );
    }

    @GetMapping("/groups/{groupId}")
    @PreAuthorize("hasAuthority('media.read')")
    public List<MediaLinkResponse> findGroupMedia(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId
    ) {
        return mediaLinkService.findTargetMedia(
                currentUser,
                MediaTargetType.GROUP,
                groupId
        );
    }

    @GetMapping("/sessions/{sessionId}")
    @PreAuthorize("hasAuthority('media.read')")
    public List<MediaLinkResponse> findSessionMedia(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID sessionId
    ) {
        return mediaLinkService.findTargetMedia(
                currentUser,
                MediaTargetType.SESSION,
                sessionId
        );
    }

    @GetMapping("/evaluations/{evaluationId}")
    @PreAuthorize("hasAuthority('media.read')")
    public List<MediaLinkResponse> findEvaluationMedia(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID evaluationId
    ) {
        return mediaLinkService.findTargetMedia(
                currentUser,
                MediaTargetType.EVALUATION,
                evaluationId
        );
    }
}
