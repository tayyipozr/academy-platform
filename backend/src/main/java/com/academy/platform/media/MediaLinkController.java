package com.academy.platform.media;

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
@RequestMapping("/api/v1/media")
public class MediaLinkController {

    private final MediaLinkService mediaLinkService;

    public MediaLinkController(
            MediaLinkService mediaLinkService
    ) {
        this.mediaLinkService = mediaLinkService;
    }

    @PostMapping("/{mediaId}/links")
    @PreAuthorize("hasAuthority('media.link')")
    public ResponseEntity<MediaLinkResponse> createLink(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID mediaId,

            @Valid
            @RequestBody
            CreateMediaLinkRequest request
    ) {
        MediaLinkResponse link =
                mediaLinkService.createLink(
                        currentUser,
                        mediaId,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/media/links/"
                                        + link.id()
                        )
                )
                .body(link);
    }

    @GetMapping("/{mediaId}/links")
    @PreAuthorize("hasAuthority('media.read')")
    public List<MediaLinkResponse> findMediaLinks(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID mediaId
    ) {
        return mediaLinkService.findMediaLinks(
                currentUser,
                mediaId
        );
    }

    @GetMapping("/links/{linkId}")
    @PreAuthorize("hasAuthority('media.read')")
    public MediaLinkResponse findLink(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID linkId
    ) {
        return mediaLinkService.findLink(
                currentUser,
                linkId
        );
    }

    @PutMapping("/links/{linkId}")
    @PreAuthorize("hasAuthority('media.link')")
    public MediaLinkResponse updateLink(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID linkId,

            @Valid
            @RequestBody
            UpdateMediaLinkRequest request
    ) {
        return mediaLinkService.updateLink(
                currentUser,
                linkId,
                request
        );
    }

    @DeleteMapping("/links/{linkId}")
    @PreAuthorize("hasAuthority('media.link')")
    public ResponseEntity<Void> deleteLink(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID linkId
    ) {
        mediaLinkService.deleteLink(
                currentUser,
                linkId
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping(
            "/targets/{targetType}/{targetId}"
    )
    @PreAuthorize("hasAuthority('media.read')")
    public List<MediaLinkResponse> findTargetMedia(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            MediaTargetType targetType,

            @PathVariable
            UUID targetId
    ) {
        return mediaLinkService.findTargetMedia(
                currentUser,
                targetType,
                targetId
        );
    }
}
