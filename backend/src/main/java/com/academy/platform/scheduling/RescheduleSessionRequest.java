package com.academy.platform.scheduling;

import java.time.OffsetDateTime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RescheduleSessionRequest(

        @NotNull
        OffsetDateTime scheduledStart,

        @NotNull
        OffsetDateTime scheduledEnd,

        @Size(max = 250)
        String location
) {
}
