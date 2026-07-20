package com.academy.platform.scheduling;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateSessionStatusRequest(

        @NotNull
        SessionStatus status,

        @Size(max = 5000)
        String completionNotes,

        @Size(max = 500)
        String cancellationReason
) {
}
