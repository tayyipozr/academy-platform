package com.academy.platform.media;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateMediaUploadRequest(

        @NotBlank
        @Size(max = 500)
        String filename,

        @NotBlank
        @Size(max = 200)
        String contentType,

        @NotNull
        @Positive
        Long size,

        @Size(max = 200)
        String title,

        @Size(max = 5000)
        String description
) {
}
