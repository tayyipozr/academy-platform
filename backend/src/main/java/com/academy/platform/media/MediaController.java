package com.academy.platform.media;

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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/media")
public class MediaController {

    private final MediaService mediaService;

    public MediaController(
            MediaService mediaService
    ) {
        this.mediaService = mediaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('media.read')")
    public List<MediaResponse> findMedia(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(required = false)
            MediaType type,

            @RequestParam(required = false)
            MediaStatus status
    ) {
        return mediaService.findMediaFiles(
                currentUser.organizationId(),
                type,
                status
        );
    }

    @GetMapping("/{mediaId}")
    @PreAuthorize("hasAuthority('media.read')")
    public MediaResponse findMedia(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID mediaId
    ) {
        return mediaService.findMedia(
                currentUser.organizationId(),
                mediaId
        );
    }

    @PostMapping("/uploads")
    @PreAuthorize("hasAuthority('media.upload')")
    public MediaUploadResponse createUpload(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            CreateMediaUploadRequest request
    ) {
        return mediaService.createUpload(
                currentUser,
                request
        );
    }

    @PostMapping("/{mediaId}/complete")
    @PreAuthorize("hasAuthority('media.upload')")
    public MediaResponse completeUpload(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID mediaId
    ) {
        return mediaService.completeUpload(
                currentUser,
                mediaId
        );
    }

    @GetMapping("/{mediaId}/download")
    @PreAuthorize("hasAuthority('media.read')")
    public MediaDownloadResponse createDownloadUrl(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID mediaId
    ) {
        return mediaService.createDownloadUrl(
                currentUser,
                mediaId
        );
    }

    @DeleteMapping("/{mediaId}")
    @PreAuthorize("hasAuthority('media.delete')")
    public ResponseEntity<Void> deleteMedia(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID mediaId
    ) {
        mediaService.deleteMedia(
                currentUser,
                mediaId
        );

        return ResponseEntity.noContent().build();
    }
}
