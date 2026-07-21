package com.academy.platform.media;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateMediaLinkRequest(
        @NotNull
        MediaPurpose purpose,
        @Size(max = 1000)
        String caption,
        boolean coverMedia
        ) {

}
