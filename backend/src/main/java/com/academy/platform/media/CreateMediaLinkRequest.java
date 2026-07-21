package com.academy.platform.media;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateMediaLinkRequest(
        @NotNull
        MediaTargetType targetType,
        @NotNull
        UUID targetId,
        @NotNull
        MediaPurpose purpose,
        @Size(max = 1000)
        String caption,
        boolean coverMedia
        ) {

}
