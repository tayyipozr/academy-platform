package com.academy.platform.media;

import jakarta.validation.constraints.Size;

public record UpdateMediaLinkRequest(

        @Size(max = 1000)
        String caption,

        boolean coverMedia
) {
}
